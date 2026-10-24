import {
  DASHBOARD_WINDOW_HOURS,
  HOUR_MS,
  DASHBOARD_HISTORY_LIMIT,
} from "@/configs/consts/dashboard.const";
import { REQUEST_STALE_MS } from "@/configs/consts/proxy.const";
// Internal server operation; do not expose as a client-callable Server Action.
import { createSafeAction } from "@/lib/create-safe-action";
import { InputSchema } from "./schema";
import type { InputType, ReturnType } from "./types";
import { db } from "@/lib/db";
import type { DashboardSummary } from "@/configs/types/api.types";
const handler = async (data: InputType): Promise<ReturnType> => {
  const user = await db.user.findUniqueOrThrow({ where: { id: data.userId } });
  const now = new Date();
  const interval =
    data.period === "2d" ? "hour" : data.period === "all" ? "month" : "day";
  const durationDays =
    data.period === "7d"
      ? 7
      : data.period === "30d"
        ? 30
        : DASHBOARD_WINDOW_HOURS / 24;
  const since =
    data.period === "all"
      ? undefined
      : new Date(now.getTime() - durationDays * 24 * HOUR_MS);
  const firstBucket = new Date(since ?? now);
  if (interval === "hour") {
    firstBucket.setUTCMinutes(0, 0, 0);
  } else if (interval === "day") {
    firstBucket.setUTCHours(0, 0, 0, 0);
  } else {
    firstBucket.setUTCDate(1);
    firstBucket.setUTCHours(0, 0, 0, 0);
  }
  const usageWhere = {
    userId: user.id,
    ...(since ? { createdAt: { gte: since } } : {}),
  };
  const [all, recent, requests, buckets, models, credits, funding] =
    await Promise.all([
      db.apiRequest.aggregate({
        where: { userId: user.id, paymentSource: "BALANCE" },
        _sum: { chargedCost: true },
      }),
      db.apiRequest.aggregate({
        where: usageWhere,
        _count: { _all: true, totalTokens: true },
        _sum: {
          totalTokens: true,
          chargedCost: true,
          inputTokens: true,
          outputTokens: true,
          cachedTokens: true,
          reasoningTokens: true,
        },
      }),
      db.apiRequest.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: DASHBOARD_HISTORY_LIMIT,
        select: {
          id: true,
          model: true,
          createdAt: true,
          totalTokens: true,
          chargedCost: true,
          paymentSource: true,
          status: true,
          diagnostic: true,
        },
      }),
      db.apiRequest.findMany({
        where: usageWhere,
        select: { createdAt: true, totalTokens: true },
        orderBy: { createdAt: "asc" },
      }),
      db.apiRequest.groupBy({
        by: ["model"],
        where: usageWhere,
        _sum: { totalTokens: true },
        _count: { _all: true },
        orderBy: { _sum: { totalTokens: "desc" } },
      }),
      db.balanceEntry.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: DASHBOARD_HISTORY_LIMIT,
        select: { id: true, amount: true, note: true, createdAt: true },
      }),
      db.apiRequest.groupBy({
        by: ["paymentSource"],
        where: usageWhere,
        _sum: { chargedCost: true },
      }),
    ]);
  const hourlyTokens = new Map<number, number>();
  for (const item of buckets) {
    const bucket = new Date(item.createdAt);
    if (interval === "hour") {
      bucket.setUTCMinutes(0, 0, 0);
    } else if (interval === "day") {
      bucket.setUTCHours(0, 0, 0, 0);
    } else {
      bucket.setUTCDate(1);
      bucket.setUTCHours(0, 0, 0, 0);
    }
    hourlyTokens.set(
      bucket.getTime(),
      (hourlyTokens.get(bucket.getTime()) ?? 0) + (item.totalTokens ?? 0),
    );
  }
  const usageStart =
    interval === "month" && buckets.length
      ? new Date(buckets[0].createdAt)
      : firstBucket;
  if (interval === "month") {
    usageStart.setUTCDate(1);
    usageStart.setUTCHours(0, 0, 0, 0);
  }
  const bucketMs =
    interval === "hour"
      ? HOUR_MS
      : interval === "day"
        ? 24 * HOUR_MS
        : undefined;
  const usage: DashboardSummary["usage"] = [];
  if (interval === "month") {
    const cursor = new Date(usageStart);
    const end = new Date(now);
    end.setUTCDate(1);
    end.setUTCHours(0, 0, 0, 0);
    while (cursor <= end) {
      usage.push({
        time: cursor.toISOString(),
        tokens: hourlyTokens.get(cursor.getTime()) ?? 0,
      });
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
  } else if (bucketMs) {
    const end = new Date(now);
    if (interval === "hour") {
      end.setUTCMinutes(0, 0, 0);
    } else {
      end.setUTCHours(0, 0, 0, 0);
    }
    for (
      let time = usageStart.getTime();
      time <= end.getTime();
      time += bucketMs
    ) {
      usage.push({
        time: new Date(time).toISOString(),
        tokens: hourlyTokens.get(time) ?? 0,
      });
    }
  }
  const response: DashboardSummary = {
    balance: user.balance.toFixed(8),
    spent: all._sum.chargedCost?.toFixed(8) ?? "0",
    tokens: recent._sum.totalTokens ?? 0,
    inputTokens: recent._sum.inputTokens ?? 0,
    outputTokens: recent._sum.outputTokens ?? 0,
    cachedTokens: recent._sum.cachedTokens ?? 0,
    reasoningTokens: recent._sum.reasoningTokens ?? 0,
    requestCount: recent._count._all,
    unknownUsageCount: recent._count._all - recent._count.totalTokens,
    cost:
      funding
        .find((item) => item.paymentSource === "BALANCE")
        ?._sum.chargedCost?.toFixed(8) ?? "0",
    subscriptionCreditsUsed:
      funding
        .find((item) => item.paymentSource === "SUBSCRIPTION")
        ?._sum.chargedCost?.toFixed(8) ?? "0",
    models: models.map((item) => ({
      model: item.model,
      requests: item._count._all,
      tokens: item._sum.totalTokens ?? 0,
    })),
    credits: credits.map((item) => ({
      ...item,
      amount: item.amount.toFixed(8),
      createdAt: item.createdAt.toISOString(),
    })),
    usage,
    requests: requests.map((item) => ({
      ...item,
      status:
        item.status === "RUNNING" &&
        item.createdAt.getTime() < Date.now() - REQUEST_STALE_MS
          ? "INTERRUPTED"
          : item.status,
      createdAt: item.createdAt.toISOString(),
      chargedCost: item.chargedCost.toFixed(8),
    })),
  };
  return { data: response };
};

export const dashboardSummary = createSafeAction(InputSchema, handler);

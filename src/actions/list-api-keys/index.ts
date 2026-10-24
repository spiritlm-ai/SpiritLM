"use server";

import { db } from "@/lib/db";
import { dashboardUser } from "@/lib/dashboard-auth";
import { createSafeAction } from "@/lib/create-safe-action";

import { InputSchema } from "./schema";
import type { InputType, ReturnType } from "./types";

const handler = async (): Promise<ReturnType> => {
  const user = await dashboardUser();
  const month = new Date();
  month.setUTCDate(1);
  month.setUTCHours(0, 0, 0, 0);
  const [keys, usage] = await Promise.all([
    db.apiKey.findMany({
      where: { userId: user.id, revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        prefix: true,
        useSubscription: true,
        allowBalanceFallback: true,
        createdAt: true,
        lastUsedAt: true,
      },
    }),
    db.apiRequest.groupBy({
      by: ["apiKeyId", "paymentSource"],
      where: { userId: user.id, createdAt: { gte: month } },
      _count: { _all: true },
      _sum: { chargedCost: true },
    }),
  ]);
  return {
    data: keys.map((key) => {
      const money = usage.find(
        (item) => item.apiKeyId === key.id && item.paymentSource === "BALANCE",
      );
      const subscription = usage.find(
        (item) =>
          item.apiKeyId === key.id && item.paymentSource === "SUBSCRIPTION",
      );
      const requests = usage
        .filter((item) => item.apiKeyId === key.id)
        .reduce((sum, item) => sum + item._count._all, 0);
      return {
        ...key,
        createdAt: key.createdAt.toISOString(),
        lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
        requests,
        spent: money?._sum.chargedCost?.toFixed(8) ?? "0",
        subscriptionCreditsUsed:
          subscription?._sum.chargedCost?.toFixed(8) ?? "0",
      };
    }),
  };
};

const safeAction = createSafeAction(InputSchema, handler);

export async function listApiKeys(data: InputType): Promise<ReturnType> {
  return safeAction(data);
}

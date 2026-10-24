// Internal server operation; never expose as a client-callable Server Action.
import { finalizeStaleRequests } from "@/actions/request-accounting/transaction";
import { createSafeAction } from "@/lib/create-safe-action";
import { InputSchema } from "./schema";
import type { InputType, ReturnType } from "./types";
import { cryptoBotConfig } from "@/lib/crypto-pay";
import { yooKassaConfig } from "@/lib/yookassa";
import type { SubscriptionOverview } from "@/configs/types/subscriptions.types";
import { Prisma } from "@prisma/client";
import { serializableTransaction } from "@/lib/transaction";
import { RATE_WINDOW_MS } from "@/configs/consts/proxy.const";
import { SUBSCRIPTION_PLANS } from "@/configs/consts/subscriptions.const";
import { summarizeSubscriptionOrder } from "@/lib/subscription-summary";
const handler = async (data: InputType): Promise<ReturnType> => {
  const paymentModes: SubscriptionOverview["paymentModes"] = {
    balance: "live",
    card: null,
    cryptobot: null,
  };
  try {
    paymentModes.card = yooKassaConfig().mode;
  } catch {
    /* Unconfigured methods stay unavailable. */
  }
  try {
    paymentModes.cryptobot = cryptoBotConfig().mode;
  } catch {
    /* Unconfigured methods stay unavailable. */
  }
  const overview = await serializableTransaction(async (tx) => {
    await finalizeStaleRequests(tx, data.userId);
    const now = new Date();
    const user = await tx.user.findUniqueOrThrow({
      where: { id: data.userId },
    });
    const periods = await tx.subscriptionPeriod.findMany({
      where: { userId: data.userId, endsAt: { gt: now } },
      orderBy: { startsAt: "asc" },
    });
    const requests = await tx.apiRequest.findMany({
      where: {
        userId: data.userId,
        paymentSource: "SUBSCRIPTION",
        OR: [
          { status: "RUNNING" },
          { createdAt: { gte: new Date(now.getTime() - RATE_WINDOW_MS) } },
        ],
      },
      select: {
        subscriptionPeriodId: true,
        status: true,
        reservedCost: true,
        createdAt: true,
      },
    });
    const orders = await tx.subscriptionOrder.findMany({
      where: { userId: data.userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { cryptoPayment: true, cardPayment: true },
    });
    const summarize = (period: (typeof periods)[number]) => ({
      id: period.id,
      planId: period.planId,
      planName: period.planName,
      mode: period.mode,
      credits: period.credits.toFixed(8),
      remainingCredits: period.remainingCredits.toFixed(8),
      reservedCredits: requests
        .filter(
          (r) => r.subscriptionPeriodId === period.id && r.status === "RUNNING",
        )
        .reduce((sum, r) => sum.add(r.reservedCost), new Prisma.Decimal(0))
        .toFixed(8),
      startsAt: period.startsAt.toISOString(),
      endsAt: period.endsAt.toISOString(),
      requestsPerMinute: period.requestsPerMinute,
      concurrentRequests: period.concurrentRequests,
    });
    const current = periods.find((p) => p.mode === "live" && p.startsAt <= now);
    return {
      paymentModes,
      balance: user.balance.toFixed(8),
      current: current ? summarize(current) : null,
      upcoming: periods
        .filter((p) => p.mode === "live" && p.startsAt > now)
        .map(summarize),
      testPeriods: periods.filter((p) => p.mode === "test").map(summarize),
      orders: orders.map(summarizeSubscriptionOrder),
      plans: Object.values(SUBSCRIPTION_PLANS),
      running: requests.filter((r) => r.status === "RUNNING").length,
      recent: requests.filter(
        (r) => r.createdAt.getTime() >= now.getTime() - RATE_WINDOW_MS,
      ).length,
    };
  });
  return { data: overview };
};
export const getSubscription = createSafeAction(InputSchema, handler);

// Internal server operation; never expose as a client-callable Server Action.
import { createSafeAction } from "@/lib/create-safe-action";
import { InputSchema } from "./schema";
import type { InputType, ReturnType } from "./types";
import { serializableTransaction } from "@/lib/transaction";
import { ApiError } from "@/lib/api-error";
import { subscriptionOrderPaymentStatus } from "@/lib/subscription-summary";
import { SUBSCRIPTION_PLANS } from "@/configs/consts/subscriptions.const";
import { fulfillSubscriptionOrder } from "@/actions/fulfill-subscription-order/transaction";
const handler = async (data: InputType): Promise<ReturnType> => {
  const order = await serializableTransaction(async (tx) => {
    const existing = await tx.subscriptionOrder.findUnique({
      where: {
        userId_requestId: { userId: data.userId, requestId: data.requestId },
      },
    });
    if (existing) {
      if (
        existing.planId !== data.planId ||
        existing.method !== data.method ||
        existing.mode !== data.mode
      ) {
        throw new ApiError(
          409,
          "subscription_conflict",
          "Условия этой покупки уже зафиксированы",
        );
      }
      return existing;
    }
    if (data.method !== "balance") {
      const pending = await tx.subscriptionOrder.findFirst({
        where: {
          userId: data.userId,
          mode: data.mode,
          status: { in: ["CREATING", "PENDING"] },
        },
        orderBy: { createdAt: "desc" },
        include: { cryptoPayment: true, cardPayment: true },
      });
      const status = pending ? subscriptionOrderPaymentStatus(pending) : null;
      const terminal =
        status && ["EXPIRED", "CANCELLED", "FAILED"].includes(status);
      if (pending && terminal) {
        await tx.subscriptionOrder.update({
          where: { id: pending.id },
          data: { status: status! },
        });
      }
      if (pending && !terminal) {
        if (pending.planId !== data.planId || pending.method !== data.method) {
          throw new ApiError(
            409,
            "subscription_pending",
            "Сначала завершите или отмените предыдущую покупку подписки",
          );
        }
        return pending;
      }
    }
    const plan = SUBSCRIPTION_PLANS[data.planId];
    const created = await tx.subscriptionOrder.create({
      data: {
        ...data,
        planName: plan.name,
        amount: plan.amount,
        credits: plan.credits,
        requestsPerMinute: plan.requestsPerMinute,
        concurrentRequests: plan.concurrentRequests,
      },
    });
    if (data.method === "balance") {
      if (data.mode !== "live")
        throw new ApiError(400, "invalid_mode", "Некорректное окружение");
      const user = await tx.user.findUniqueOrThrow({
        where: { id: data.userId },
      });
      if (user.balance.lt(created.amount))
        throw new ApiError(
          402,
          "insufficient_balance",
          "Недостаточно средств на балансе",
        );
      await tx.user.update({
        where: { id: user.id },
        data: { balance: { decrement: created.amount } },
      });
      await tx.balanceEntry.create({
        data: {
          userId: user.id,
          operationId: `subscription:${created.id}:purchase`,
          amount: created.amount.negated(),
          note: `Подписка ${plan.name} на 30 дней`,
        },
      });
      return fulfillSubscriptionOrder(tx, created.id);
    }
    return created;
  });
  return { data: order };
};
export const reserveSubscriptionOrder = createSafeAction(InputSchema, handler);

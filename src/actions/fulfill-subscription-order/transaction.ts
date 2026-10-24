// Only call inside a serializable transaction, after verified provider payment or balance debit.
import type { Prisma } from "@prisma/client";
import { SUBSCRIPTION_PERIOD_MS } from "@/configs/consts/subscriptions.const";
import { ApiError } from "@/lib/api-error";

export async function fulfillSubscriptionOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
) {
  const order = await tx.subscriptionOrder.findUniqueOrThrow({
    where: { id: orderId },
  });
  if (order.fulfilledAt) return order;
  const now = new Date();
  const last = await tx.subscriptionPeriod.findFirst({
    where: { userId: order.userId, mode: order.mode },
    orderBy: { endsAt: "desc" },
  });
  const startsAt = new Date(
    Math.max(now.getTime(), last?.endsAt.getTime() ?? 0),
  );
  await tx.subscriptionPeriod.create({
    data: {
      userId: order.userId,
      orderId: order.id,
      planId: order.planId,
      planName: order.planName,
      mode: order.mode,
      credits: order.credits,
      remainingCredits: order.credits,
      requestsPerMinute: order.requestsPerMinute,
      concurrentRequests: order.concurrentRequests,
      startsAt,
      endsAt: new Date(startsAt.getTime() + SUBSCRIPTION_PERIOD_MS),
      entries: {
        create: {
          operationId: `subscription:${order.id}:grant`,
          amount: order.credits,
        },
      },
    },
  });
  return tx.subscriptionOrder.update({
    where: { id: order.id },
    data: { status: "PAID", fulfilledAt: now },
  });
}

export async function verifySubscriptionPayment(
  tx: Prisma.TransactionClient,
  orderId: string,
  userId: string,
  mode: string,
  method: string,
  amount: Prisma.Decimal,
  allowClosed = false,
) {
  const order = await tx.subscriptionOrder.findUnique({
    where: { id: orderId },
  });
  if (
    order &&
    !allowClosed &&
    ["CANCELLED", "FAILED", "EXPIRED"].includes(order.status)
  ) {
    throw new ApiError(
      409,
      "subscription_order_closed",
      "Покупка закрыта. Выберите тариф заново",
    );
  }
  if (
    !order ||
    order.userId !== userId ||
    order.mode !== mode ||
    order.method !== method ||
    !order.amount.equals(amount)
  ) {
    throw new ApiError(
      409,
      "subscription_payment_mismatch",
      "Данные оплаты подписки не совпадают",
    );
  }
}

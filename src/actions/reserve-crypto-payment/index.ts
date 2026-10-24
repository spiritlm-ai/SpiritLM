// Internal server operation; never expose as a client-callable Server Action.
import { createSafeAction } from "@/lib/create-safe-action";
import { InputSchema } from "./schema";
import type { InputType, ReturnType } from "./types";
import { Prisma } from "@prisma/client";
import { PAYMENT_LIMITS } from "@/configs/consts/payments.const";
import { verifySubscriptionPayment } from "@/actions/fulfill-subscription-order/transaction";
import { ApiError } from "@/lib/api-error";
import { serializableTransaction } from "@/lib/transaction";

const handler = async (data: InputType): Promise<ReturnType> => {
  const result = await serializableTransaction(async (tx) => {
    const amount = new Prisma.Decimal(data.amount);
    const existing = await tx.payment.findUnique({
      where: {
        userId_mode_appId_requestId: {
          userId: data.userId,
          mode: data.mode,
          appId: data.appId,
          requestId: data.requestId,
        },
      },
    });
    if (existing) {
      if (
        !existing.amount.equals(amount) ||
        existing.subscriptionOrderId !== (data.subscriptionOrderId ?? null)
      ) {
        throw new ApiError(
          409,
          "payment_conflict",
          "Сумма этого платежа уже зафиксирована",
        );
      }
      return { payment: existing, created: false };
    }
    if (data.subscriptionOrderId)
      await verifySubscriptionPayment(
        tx,
        data.subscriptionOrderId,
        data.userId,
        data.mode,
        "cryptobot",
        amount,
      );
    const scope = { userId: data.userId, mode: data.mode, appId: data.appId };
    const recent = await tx.payment.count({
      where: { ...scope, createdAt: { gte: new Date(Date.now() - 3_600_000) } },
    });
    const pending = await tx.payment.count({
      where: { ...scope, status: { in: ["CREATING", "PENDING"] } },
    });
    if (
      recent >= PAYMENT_LIMITS.MAX_PER_HOUR ||
      pending >= PAYMENT_LIMITS.MAX_PENDING
    ) {
      throw new ApiError(
        429,
        "payment_limit",
        "Слишком много счетов. Проверьте существующие платежи или попробуйте позже.",
      );
    }
    const payment = await tx.payment.create({ data: { ...data, amount } });
    return { payment, created: true };
  });
  return { data: result };
};

export const reserveCryptoPayment = createSafeAction(InputSchema, handler);

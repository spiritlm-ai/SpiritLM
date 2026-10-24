// Internal server operation; never expose as a client-callable Server Action.
import { createSafeAction } from "@/lib/create-safe-action";
import { InputSchema } from "./schema";
import type { InputType, ReturnType } from "./types";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { serializableTransaction } from "@/lib/transaction";
import { verifySubscriptionPayment } from "@/actions/fulfill-subscription-order/transaction";
import { ApiError } from "@/lib/api-error";
import { YOOKASSA } from "@/configs/consts/yookassa.const";
import { PAYMENT_LIMITS } from "@/configs/consts/payments.const";
const handler = async (data: InputType): Promise<ReturnType> => {
  const result = await serializableTransaction(async (tx) => {
    const {
      amount: rawAmount,
      requestId,
      returnUrl,
      subscriptionOrderId,
      ...scope
    } = data;
    const amount = new Prisma.Decimal(rawAmount);
    const existing = await tx.yooKassaPayment.findUnique({
      where: { userId_mode_shopId_requestId: { ...scope, requestId } },
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
    if (subscriptionOrderId)
      await verifySubscriptionPayment(
        tx,
        subscriptionOrderId,
        data.userId,
        data.mode,
        "card",
        amount,
      );
    const recent = await tx.yooKassaPayment.count({
      where: { ...scope, createdAt: { gte: new Date(Date.now() - 3_600_000) } },
    });
    const pending = await tx.yooKassaPayment.count({
      where: {
        ...scope,
        status: { in: ["CREATING", "PENDING"] },
        dismissedAt: null,
        createdAt: { gt: new Date(Date.now() - YOOKASSA.INVOICE_LIFETIME_MS) },
      },
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
    const payment = await tx.yooKassaPayment.create({
      data: {
        ...scope,
        requestId,
        returnUrl,
        subscriptionOrderId,
        amount,
        idempotenceKey: randomUUID(),
        checkedAt: new Date(),
      },
    });
    return { payment, created: true };
  });
  return { data: result };
};
export const reserveYookassaPayment = createSafeAction(InputSchema, handler);

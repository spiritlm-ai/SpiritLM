// Internal server operation; never expose as a client-callable Server Action.
import { createSafeAction } from "@/lib/create-safe-action";
import { InputSchema } from "./schema";
import type { InputType, ReturnType } from "./types";
import { Prisma } from "@prisma/client";
import { serializableTransaction } from "@/lib/transaction";
import {
  fulfillSubscriptionOrder,
  verifySubscriptionPayment,
} from "@/actions/fulfill-subscription-order/transaction";
import { ApiError } from "@/lib/api-error";
import { yooKassaPaymentMethod } from "@/lib/yookassa";
const handler = async (data: InputType): Promise<ReturnType> => {
  const result = await serializableTransaction(async (tx) => {
    const remote = data.payment;
    const payment = await tx.yooKassaPayment.findFirst({
      where: {
        id: remote.metadata.spiritlm_payment_id,
        mode: data.mode,
        shopId: data.shopId,
      },
    });
    if (!payment)
      throw new ApiError(404, "payment_not_found", "Платёж не найден");
    if (
      !remote.test ||
      remote.recipient.account_id !== data.shopId ||
      remote.payment_method.type !== yooKassaPaymentMethod(payment.returnUrl) ||
      remote.amount.currency !== payment.currency ||
      !payment.amount.equals(new Prisma.Decimal(remote.amount.value)) ||
      (payment.providerId !== null && payment.providerId !== remote.id)
    ) {
      throw new ApiError(
        409,
        "payment_mismatch",
        "Данные платежа не совпадают",
      );
    }
    if (payment.creditedAt) return payment;
    if (
      remote.status === "succeeded" &&
      (!remote.paid || !remote.captured_at)
    ) {
      throw new ApiError(
        409,
        "invalid_paid_payment",
        "Неполное подтверждение оплаты",
      );
    }
    if (remote.status === "succeeded") {
      if (payment.subscriptionOrderId) {
        await verifySubscriptionPayment(
          tx,
          payment.subscriptionOrderId,
          payment.userId,
          data.mode,
          "card",
          payment.amount,
          true,
        );
        await fulfillSubscriptionOrder(tx, payment.subscriptionOrderId);
      } else
        await tx.user.update({
          where: { id: payment.userId },
          data: { testBalance: { increment: payment.amount } },
        });
    }
    return tx.yooKassaPayment.update({
      where: { id: payment.id },
      data: {
        providerId: remote.id,
        invoiceUrl: remote.confirmation?.confirmation_url,
        expiresAt: remote.expires_at ? new Date(remote.expires_at) : undefined,
        status:
          remote.status === "succeeded"
            ? "PAID"
            : remote.status === "canceled" || payment.status === "CANCELLED"
              ? "CANCELLED"
              : "PENDING",
        ...(remote.status === "succeeded"
          ? {
              paidAt: new Date(remote.captured_at!),
              creditedAt: new Date(),
            }
          : {}),
      },
    });
  });
  return { data: result };
};
export const applyYookassaPayment = createSafeAction(InputSchema, handler);

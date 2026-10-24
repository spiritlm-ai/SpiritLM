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

const handler = async (data: InputType): Promise<ReturnType> => {
  const payment = await serializableTransaction(async (tx) => {
    const invoice = data.invoice;
    const payment = await tx.payment.findFirst({
      where: { id: invoice.payload, mode: data.mode, appId: data.appId },
    });
    if (!payment) {
      throw new ApiError(404, "payment_not_found", "Платёж не найден");
    }
    const invoiceId = String(invoice.invoice_id);
    if (
      (payment.invoiceId !== null && payment.invoiceId !== invoiceId) ||
      payment.currency !== invoice.fiat ||
      !payment.amount.equals(new Prisma.Decimal(invoice.amount))
    ) {
      throw new ApiError(
        409,
        "invoice_mismatch",
        "Данные счёта не совпадают с платежом",
      );
    }
    if (payment.creditedAt) return payment;
    if (invoice.status === "paid") {
      if (
        !invoice.paid_at ||
        !["USDT", "TON", "GRAM"].includes(invoice.paid_asset ?? "") ||
        !invoice.paid_amount
      ) {
        throw new ApiError(
          409,
          "invalid_paid_invoice",
          "Неполное подтверждение оплаты",
        );
      }
      const operationId = `cryptobot:${data.mode}:${data.appId}:${invoiceId}`;
      if (payment.subscriptionOrderId) {
        await verifySubscriptionPayment(
          tx,
          payment.subscriptionOrderId,
          payment.userId,
          data.mode,
          "cryptobot",
          payment.amount,
          true,
        );
        await fulfillSubscriptionOrder(tx, payment.subscriptionOrderId);
      } else if (data.mode === "live") {
        await tx.balanceEntry.create({
          data: {
            userId: payment.userId,
            operationId,
            amount: payment.amount,
            note: "Пополнение через CryptoBot",
          },
        });
      }
      if (!payment.subscriptionOrderId)
        await tx.user.update({
          where: { id: payment.userId },
          data:
            data.mode === "test"
              ? { testBalance: { increment: payment.amount } }
              : { balance: { increment: payment.amount } },
        });
    }
    // A stale active update cannot reopen an expired invoice.
    const status =
      invoice.status === "paid"
        ? "PAID"
        : payment.status === "CANCELLED"
          ? "CANCELLED"
          : invoice.status === "expired" || payment.status === "EXPIRED"
            ? "EXPIRED"
            : "PENDING";
    return tx.payment.update({
      where: { id: payment.id },
      data: {
        invoiceId,
        invoiceUrl: invoice.bot_invoice_url,
        status,
        expiresAt: invoice.expiration_date
          ? new Date(invoice.expiration_date)
          : undefined,
        ...(invoice.status === "paid"
          ? {
              paidAt: new Date(invoice.paid_at!),
              creditedAt: new Date(),
              paidAsset: invoice.paid_asset,
              paidAmount: invoice.paid_amount,
              feeAsset: invoice.fee_asset,
              feeAmount: invoice.fee_amount,
            }
          : {}),
      },
    });
  });
  return { data: payment };
};

export const applyCryptoInvoice = createSafeAction(InputSchema, handler);

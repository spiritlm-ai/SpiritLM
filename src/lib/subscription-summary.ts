import { YOOKASSA } from "@/configs/consts/yookassa.const";
import type {
  Payment,
  SubscriptionOrder,
  YooKassaPayment,
} from "@prisma/client";
import type { SubscriptionOrderSummary } from "@/configs/types/subscriptions.types";

export function summarizeSubscriptionOrder(
  order: SubscriptionOrder & {
    cryptoPayment: Payment | null;
    cardPayment: YooKassaPayment | null;
  },
): SubscriptionOrderSummary {
  const payment = order.cryptoPayment ?? order.cardPayment;
  return {
    id: order.id,
    planId: order.planId,
    planName: order.planName,
    amount: order.amount.toFixed(2),
    method: order.method,
    mode: order.mode,
    status: subscriptionOrderPaymentStatus(order),
    createdAt: order.createdAt.toISOString(),
    invoiceUrl:
      subscriptionOrderPaymentStatus(order) === "PENDING"
        ? (payment?.invoiceUrl ?? null)
        : null,
  };
}

export function subscriptionOrderPaymentStatus(
  order: SubscriptionOrder & {
    cryptoPayment: Payment | null;
    cardPayment: YooKassaPayment | null;
  },
) {
  if (order.fulfilledAt) return "PAID";
  const payment = order.cryptoPayment ?? order.cardPayment;
  if (!payment) return order.status;
  if (["CREATING", "PENDING"].includes(payment.status)) {
    if (order.cardPayment?.dismissedAt) return "CANCELLED";
    const expiresAt = order.cardPayment
      ? order.cardPayment.createdAt.getTime() + YOOKASSA.INVOICE_LIFETIME_MS
      : payment.expiresAt?.getTime();
    if (expiresAt !== undefined && expiresAt <= Date.now()) return "EXPIRED";
  }
  return payment.status;
}

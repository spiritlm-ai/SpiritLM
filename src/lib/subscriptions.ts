import { cancelEmptySubscriptionOrder } from "@/actions/cancel-empty-subscription-order";
import { getSubscriptionOrder } from "@/actions/get-subscription-order";
import { reserveSubscriptionOrder } from "@/actions/reserve-subscription-order";
import type {
  SubscriptionMethod,
  SubscriptionPlanId,
} from "@/configs/types/subscriptions.types";
import { cryptoBotConfig } from "./crypto-pay";
import {
  createCryptoPayment,
  reconcileCryptoPayment,
  cancelCryptoPaymentForUser,
} from "./crypto-payments";
import { yooKassaConfig } from "./yookassa";
import {
  createYooKassaPayment,
  reconcileYooKassaPayment,
  cancelYooKassaPaymentForUser,
} from "./yookassa-payments";
import { summarizeSubscriptionOrder } from "./subscription-summary";
import { unwrapAction } from "./create-safe-action";
import { ApiError } from "./api-error";

export async function checkoutSubscription(
  userId: string,
  planId: SubscriptionPlanId,
  method: SubscriptionMethod,
  requestId: string,
  origin: string,
) {
  const mode =
    method === "balance"
      ? "live"
      : method === "card"
        ? yooKassaConfig().mode
        : cryptoBotConfig().mode;
  const order = unwrapAction(
    await reserveSubscriptionOrder({ userId, planId, method, requestId, mode }),
  );
  if (!order.fulfilledAt) {
    if (method === "cryptobot")
      await createCryptoPayment(
        userId,
        order.amount.toFixed(2),
        order.requestId,
        order.id,
      );
    if (method === "card")
      await createYooKassaPayment(
        userId,
        order.amount.toFixed(2),
        order.requestId,
        origin,
        order.id,
      );
  }
  return summarizeSubscriptionOrder(
    unwrapAction(await getSubscriptionOrder({ userId, id: order.id })),
  );
}

export async function subscriptionOrderStatus(userId: string, id: string) {
  const order = unwrapAction(await getSubscriptionOrder({ userId, id }));
  if (!order.fulfilledAt) {
    if (order.cryptoPayment)
      await reconcileCryptoPayment(order.cryptoPayment, cryptoBotConfig());
    if (order.cardPayment)
      await reconcileYooKassaPayment(order.cardPayment, yooKassaConfig());
  }
  return summarizeSubscriptionOrder(
    unwrapAction(await getSubscriptionOrder({ userId, id })),
  );
}

export async function cancelSubscriptionOrder(userId: string, id: string) {
  const order = unwrapAction(await getSubscriptionOrder({ userId, id }));
  if (order.fulfilledAt)
    throw new ApiError(409, "subscription_paid", "Подписка уже оплачена");
  if (order.cryptoPayment)
    await cancelCryptoPaymentForUser(userId, order.cryptoPayment.id);
  else if (order.cardPayment)
    await cancelYooKassaPaymentForUser(userId, order.cardPayment.id);
  else unwrapAction(await cancelEmptySubscriptionOrder({ userId, id }));
  return summarizeSubscriptionOrder(
    unwrapAction(await getSubscriptionOrder({ userId, id })),
  );
}

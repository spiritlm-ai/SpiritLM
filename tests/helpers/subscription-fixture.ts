import { randomUUID } from "node:crypto";
import { db } from "../../src/lib/db";
import { unwrapAction } from "../../src/lib/create-safe-action";
import { reserveSubscriptionOrder } from "../../src/actions/reserve-subscription-order";
import type { SubscriptionPlanId } from "../../src/configs/types/subscriptions.types";

export async function buySubscription(
  userId: string,
  planId: SubscriptionPlanId = "nova",
) {
  const order = unwrapAction(
    await reserveSubscriptionOrder({
      userId,
      planId,
      method: "balance",
      mode: "live",
      requestId: randomUUID(),
    }),
  );
  return db.subscriptionPeriod.findUniqueOrThrow({
    where: { orderId: order.id },
  });
}

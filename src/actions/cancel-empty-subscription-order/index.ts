// Internal server operation; never expose as a client-callable Server Action.
import { createSafeAction } from "@/lib/create-safe-action";
import { InputSchema } from "./schema";
import type { InputType, ReturnType } from "./types";
import { serializableTransaction } from "@/lib/transaction";
import { ApiError } from "@/lib/api-error";
const handler = async (data: InputType): Promise<ReturnType> => {
  await serializableTransaction(async (tx) => {
    const order = await tx.subscriptionOrder.findFirst({
      where: { userId: data.userId, id: data.id },
      include: { cryptoPayment: true, cardPayment: true },
    });
    if (!order)
      throw new ApiError(
        404,
        "subscription_order_not_found",
        "Покупка не найдена",
      );
    if (order.cryptoPayment || order.cardPayment || order.fulfilledAt) {
      throw new ApiError(
        409,
        "subscription_order_changed",
        "Статус покупки изменился. Обновите страницу",
      );
    }
    await tx.subscriptionOrder.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    });
  });
  return { data: true };
};
export const cancelEmptySubscriptionOrder = createSafeAction(
  InputSchema,
  handler,
);

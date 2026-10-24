// Internal server operation; never expose as a client-callable Server Action.
import { createSafeAction } from "@/lib/create-safe-action";
import { InputSchema } from "./schema";
import type { InputType, ReturnType } from "./types";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
const handler = async (data: InputType): Promise<ReturnType> => {
  const order = await db.subscriptionOrder.findFirst({
    where: { id: data.id, userId: data.userId },
    include: { cryptoPayment: true, cardPayment: true },
  });
  if (!order)
    throw new ApiError(
      404,
      "subscription_order_not_found",
      "Покупка не найдена",
    );
  return { data: order };
};
export const getSubscriptionOrder = createSafeAction(InputSchema, handler);

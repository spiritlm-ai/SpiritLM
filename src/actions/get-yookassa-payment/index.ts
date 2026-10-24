// Internal server operation; never expose as a client-callable Server Action.
import { createSafeAction } from "@/lib/create-safe-action";
import { InputSchema } from "./schema";
import type { InputType, ReturnType } from "./types";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
const handler = async (data: InputType): Promise<ReturnType> => {
  const { id, ...scope } = data;
  const payment = await db.yooKassaPayment.findFirst({
    where: {
      ...scope,
      ...(id ? { id } : data.requestId ? {} : { subscriptionOrderId: null }),
    },
    orderBy: { createdAt: "desc" },
  });
  if (id && !payment)
    throw new ApiError(404, "payment_not_found", "Платёж не найден");
  const user = await db.user.findUniqueOrThrow({
    where: { id: data.userId },
    select: { testBalance: true },
  });
  return { data: { payment, testBalance: user.testBalance.toFixed(2) } };
};
export const getYookassaPayment = createSafeAction(InputSchema, handler);

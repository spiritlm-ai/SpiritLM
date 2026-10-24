// Internal server operation; never expose as a client-callable Server Action.
import { createSafeAction } from "@/lib/create-safe-action";
import { serializableTransaction } from "@/lib/transaction";
import { ApiError } from "@/lib/api-error";
import { InputSchema } from "./schema";
import type { InputType, ReturnType } from "./types";

const handler = async (data: InputType): Promise<ReturnType> => {
  const result = await serializableTransaction(async (tx) => {
    await tx.yooKassaPayment.updateMany({
      where: {
        ...data,
        status: { in: ["CREATING", "PENDING"] },
        creditedAt: null,
        dismissedAt: null,
      },
      data: { dismissedAt: new Date() },
    });
    const payment = await tx.yooKassaPayment.findFirst({ where: data });
    if (!payment) throw new ApiError(404, "payment_not_found", "Платёж не найден");
    return payment;
  });
  return { data: result };
};

export const dismissYookassaPayment = createSafeAction(InputSchema, handler);

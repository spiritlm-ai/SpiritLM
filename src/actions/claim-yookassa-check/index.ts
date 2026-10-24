// Internal server operation; never expose as a client-callable Server Action.
import { createSafeAction } from "@/lib/create-safe-action";
import { InputSchema } from "./schema";
import type { InputType, ReturnType } from "./types";
import { db } from "@/lib/db";
import { PAYMENT_LIMITS } from "@/configs/consts/payments.const";
const handler = async (data: InputType): Promise<ReturnType> => {
  const result = await db.yooKassaPayment.updateMany({
    where: {
      id: data.id,
      creditedAt: null,
      status: { in: ["CREATING", "PENDING"] },
      OR: [
        { checkedAt: null },
        {
          checkedAt: {
            lt: new Date(
              Date.now() -
                Math.max(
                  PAYMENT_LIMITS.CHECK_INTERVAL_MS,
                  PAYMENT_LIMITS.HTTP_TIMEOUT_MS + 1000,
                ),
            ),
          },
        },
      ],
    },
    data: { checkedAt: new Date() },
  });
  return { data: result.count === 1 };
};
export const claimYookassaCheck = createSafeAction(InputSchema, handler);

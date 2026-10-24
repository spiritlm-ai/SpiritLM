// Internal server operation; never expose as a client-callable Server Action.
import { createSafeAction } from "@/lib/create-safe-action";
import { InputSchema } from "./schema";
import type { InputType, ReturnType } from "./types";
import { db } from "@/lib/db";
import { PAYMENT_LIMITS } from "@/configs/consts/payments.const";

const handler = async (data: InputType): Promise<ReturnType> => {
  const now = new Date();
  const result = await db.payment.updateMany({
    where: {
      id: data.id,
      creditedAt: null,
      OR: [
        { checkedAt: null },
        { checkedAt: { lt: new Date(now.getTime() - PAYMENT_LIMITS.CHECK_INTERVAL_MS) } },
      ],
    },
    data: { checkedAt: now },
  });
  return { data: result.count === 1 };
};

export const claimPaymentCheck = createSafeAction(InputSchema, handler);


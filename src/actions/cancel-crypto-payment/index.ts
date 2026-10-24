// Internal server operation; never expose as a client-callable Server Action.
import { createSafeAction } from "@/lib/create-safe-action";
import { db } from "@/lib/db";
import { InputSchema } from "./schema";
import type { InputType, ReturnType } from "./types";

const handler = async (data: InputType): Promise<ReturnType> => {
  const result = await db.payment.updateMany({
    where: {
      id: data.id,
      userId: data.userId,
      mode: data.mode,
      appId: data.appId,
      status: "PENDING",
      creditedAt: null,
    },
    data: { status: "CANCELLED" },
  });
  return { data: result.count === 1 };
};

export const cancelCryptoPayment = createSafeAction(InputSchema, handler);

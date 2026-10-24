// Internal server operation; never expose as a client-callable Server Action.
import { createSafeAction } from "@/lib/create-safe-action";
import { InputSchema } from "./schema";
import type { InputType, ReturnType } from "./types";
import { db } from "@/lib/db";
import { PAYMENT_LIMITS } from "@/configs/consts/payments.const";

const handler = async (data: InputType): Promise<ReturnType> => {
  const payments = await db.payment.findMany({
    where: {
      ...data,
      creditedAt: null,
      status: { not: "FAILED" },
      OR: [
        { status: { in: ["CREATING", "PENDING"] } },
        { createdAt: { gte: new Date(Date.now() - 7 * 86_400_000) } },
      ],
    },
    orderBy: [{ checkedAt: "asc" }, { createdAt: "asc" }],
    take: PAYMENT_LIMITS.RECONCILE_BATCH,
  });
  return { data: payments };
};

export const listPendingCryptoPayments = createSafeAction(InputSchema, handler);


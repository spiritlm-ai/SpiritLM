// Internal server operation; never expose as a client-callable Server Action.
import { createSafeAction } from "@/lib/create-safe-action";
import { InputSchema } from "./schema";
import type { InputType, ReturnType } from "./types";
import { db } from "@/lib/db";
import { PAYMENT_LIMITS } from "@/configs/consts/payments.const";
const handler = async (data: InputType): Promise<ReturnType> => {
  return {
    data: await db.yooKassaPayment.findMany({
      where: { ...data, creditedAt: null, status: { in: ["CREATING", "PENDING"] } },
      orderBy: [{ checkedAt: "asc" }, { createdAt: "asc" }],
      take: PAYMENT_LIMITS.RECONCILE_BATCH,
    }),
  };
};
export const listPendingYookassaPayments = createSafeAction(InputSchema, handler);

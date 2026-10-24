// Internal server operation; never expose as a client-callable Server Action.
import { createSafeAction } from "@/lib/create-safe-action";
import { db } from "@/lib/db";
import { InputSchema } from "./schema";
import type { InputType, ReturnType } from "./types";

const handler = async (data: InputType): Promise<ReturnType> => {
  await db.yooKassaPayment.updateMany({
    where: { id: data.id, status: "CREATING", providerId: null, creditedAt: null },
    data: { status: "FAILED" },
  });
  return { data: undefined };
};
export const failYookassaPayment = createSafeAction(InputSchema, handler);

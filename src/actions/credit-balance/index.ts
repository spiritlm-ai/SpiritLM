import { BALANCE_LIMITS } from "@/configs/consts/balance.const";
// Internal server operation; do not expose as a client-callable Server Action.
import { createSafeAction } from "@/lib/create-safe-action";
import { InputSchema } from "./schema";
import type { InputType, ReturnType } from "./types";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { serializableTransaction } from "@/lib/transaction";
import { ApiError } from "@/lib/api-error";
const handler = async (data: InputType): Promise<ReturnType> => {
  const { clerkId, operationId, note } = data;
  const amount = new Prisma.Decimal(data.amount);
  if (amount.lte(0) || amount.gt(BALANCE_LIMITS.MAX_CREDIT))
    throw new ApiError(400, "invalid_credit", "Invalid credit parameters");
  const user = await db.user.upsert({
    where: { clerkId },
    create: { clerkId },
    update: {},
  });
  const credited = await serializableTransaction(async (tx) => {
    const existing = await tx.balanceEntry.findUnique({
      where: { operationId },
    });
    if (existing) {
      if (
        existing.userId !== user.id ||
        !existing.amount.equals(amount) ||
        existing.note !== note
      ) {
        throw new ApiError(
          409,
          "operation_conflict",
          "Operation ID already belongs to a different credit",
        );
      }
      return false;
    }
    await tx.balanceEntry.create({
      data: { userId: user.id, amount, operationId, note },
    });
    await tx.user.update({
      where: { id: user.id },
      data: { balance: { increment: amount } },
    });
    return true;
  });
  return { data: credited };
};

export const creditBalance = createSafeAction(InputSchema, handler);

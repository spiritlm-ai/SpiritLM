import type { Prisma } from "@prisma/client";
import { creditBalance as execute } from "@/actions/credit-balance";
import { unwrapAction } from "./create-safe-action";

export async function creditBalance(
  clerkId: string,
  amount: Prisma.Decimal,
  operationId: string,
  note: string,
) {
  return unwrapAction(
    await execute({ clerkId, amount: amount.toFixed(), operationId, note }),
  );
}

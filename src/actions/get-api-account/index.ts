// Internal server operation; ownership is derived from the authenticated API key.
import { db } from "@/lib/db";
import { createSafeAction } from "@/lib/create-safe-action";
import { InputSchema } from "./schema";
import type { InputType, ReturnType } from "./types";

const handler = async (data: InputType): Promise<ReturnType> => {
  const user = await db.user.findUniqueOrThrow({
    where: { id: data.userId },
    select: { id: true, clerkId: true, createdAt: true, balance: true },
  });
  return {
    data: {
      id: user.id,
      clerkId: user.clerkId,
      createdAt: user.createdAt.toISOString(),
      balance: user.balance.toFixed(8),
    },
  };
};

export const getApiAccount = createSafeAction(InputSchema, handler);

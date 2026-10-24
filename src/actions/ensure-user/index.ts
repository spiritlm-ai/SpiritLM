// Internal server operation; do not expose as a client-callable Server Action.
import { createSafeAction } from "@/lib/create-safe-action";
import { InputSchema } from "./schema";
import type { InputType, ReturnType } from "./types";
import { db } from "@/lib/db";
const handler = async (data: InputType): Promise<ReturnType> => {
  const user = await db.user.upsert({
    where: { clerkId: data.clerkId },
    create: { clerkId: data.clerkId },
    update: {},
  });
  return { data: user };
};

export const ensureUser = createSafeAction(InputSchema, handler);

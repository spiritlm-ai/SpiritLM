"use server";

import { db } from "@/lib/db";
import { dashboardUser } from "@/lib/dashboard-auth";
import { createSafeAction } from "@/lib/create-safe-action";
import { ApiError } from "@/lib/api-error";
import { InputSchema } from "./schema";
import type { InputType, ReturnType } from "./types";

const handler = async (data: InputType): Promise<ReturnType> => {
  const user = await dashboardUser();
  const result = await db.apiKey.updateMany({
    where: { id: data.id, userId: user.id, revokedAt: null },
    data: { name: data.name },
  });
  if (!result.count) throw new ApiError(404, "key_not_found", "Ключ не найден");
  return { data: true };
};

const safeAction = createSafeAction(InputSchema, handler);

export async function renameApiKey(data: InputType): Promise<ReturnType> {
  return safeAction(data);
}

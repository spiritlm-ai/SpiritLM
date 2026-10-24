"use server";

import { dashboardUser } from "@/lib/dashboard-auth";
import { issueKey } from "@/lib/api-keys";
import { createSafeAction } from "@/lib/create-safe-action";
import { InputSchema } from "./schema";
import type { InputType, ReturnType } from "./types";

const handler = async (data: InputType): Promise<ReturnType> => {
  const user = await dashboardUser();
  const key = await issueKey(user.id, data.name, data);
  return { data: { ...key, createdAt: key.createdAt.toISOString() } };
};

const safeAction = createSafeAction(InputSchema, handler);

export async function createApiKey(data: InputType): Promise<ReturnType> {
  return safeAction(data);
}

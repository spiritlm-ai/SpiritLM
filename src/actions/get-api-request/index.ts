import { db } from "@/lib/db";
import { createSafeAction } from "@/lib/create-safe-action";
import { InputSchema } from "./schema";
import type { InputType, ReturnType } from "./types";

const handler = async (data: InputType): Promise<ReturnType> => {
  return { data: await db.apiRequest.findUnique({ where: { id: data.id } }) };
};

export const getApiRequest = createSafeAction(InputSchema, handler);

// Internal server operation; do not expose as a client-callable Server Action.
import { createSafeAction } from "@/lib/create-safe-action";
import { InputSchema } from "./schema";
import type { InputType, ReturnType } from "./types";
import { db } from "@/lib/db";
import { hashKey } from "@/lib/api-key-hash";
import { ApiError } from "@/lib/api-error";
const handler = async (data: InputType): Promise<ReturnType> => {
  const key = await db.apiKey.findUnique({
    where: { hash: hashKey(data.secret) },
  });
  if (!key || key.revokedAt)
    throw new ApiError(401, "invalid_api_key", "Неверный API-ключ SpiritLM");
  return { data: key };
};

export const authenticateApiKey = createSafeAction(InputSchema, handler);

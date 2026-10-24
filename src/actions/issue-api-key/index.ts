import { API_KEY_CONFIG } from "@/configs/consts/api-keys.const";
// Internal server operation; do not expose as a client-callable Server Action.
import { createSafeAction } from "@/lib/create-safe-action";
import { InputSchema } from "./schema";
import type { InputType, ReturnType } from "./types";
import { randomBytes } from "node:crypto";
import { hashKey } from "@/lib/api-key-hash";
import { serializableTransaction } from "@/lib/transaction";
import { ApiError } from "@/lib/api-error";
import { PROXY_LIMITS } from "@/configs/consts/proxy.const";
const handler = async (data: InputType): Promise<ReturnType> => {
  const { userId, name } = data;
  const secret = `${API_KEY_CONFIG.PREFIX}${randomBytes(API_KEY_CONFIG.SECRET_BYTES).toString("base64url")}`;
  const key = await serializableTransaction(async (tx) => {
    const count = await tx.apiKey.count({ where: { userId, revokedAt: null } });
    if (count >= PROXY_LIMITS.ACTIVE_KEYS) {
      throw new ApiError(
        409,
        "key_limit",
        "Можно создать не более 20 активных ключей",
      );
    }
    return tx.apiKey.create({
      data: {
        userId,
        name,
        useSubscription: data.useSubscription ?? false,
        allowBalanceFallback: data.useSubscription
          ? (data.allowBalanceFallback ?? false)
          : false,
        hash: hashKey(secret),
        prefix: secret.slice(0, API_KEY_CONFIG.DISPLAY_PREFIX_LENGTH),
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        createdAt: true,
        useSubscription: true,
        allowBalanceFallback: true,
      },
    });
  });
  return { data: { ...key, secret } };
};

export const issueApiKey = createSafeAction(InputSchema, handler);

// Internal server operation; never expose as a client-callable Server Action.
import { createSafeAction } from "@/lib/create-safe-action";
import { InputSchema } from "./schema";
import type { InputType, ReturnType } from "./types";
import { serializableTransaction } from "@/lib/transaction";
import { ApiError } from "@/lib/api-error";
const handler = async (data: InputType): Promise<ReturnType> => {
  await serializableTransaction(async (tx) => {
    const key = await tx.apiKey.findFirst({
      where: { id: data.id, userId: data.userId, revokedAt: null },
    });
    if (!key) throw new ApiError(404, "key_not_found", "Ключ не найден");
    const useSubscription = data.useSubscription ?? key.useSubscription;
    await tx.apiKey.update({
      where: { id: key.id },
      data: {
        name: data.name,
        useSubscription,
        allowBalanceFallback: useSubscription
          ? (data.allowBalanceFallback ?? key.allowBalanceFallback)
          : false,
      },
    });
  });
  return { data: true };
};
export const updateApiKey = createSafeAction(InputSchema, handler);

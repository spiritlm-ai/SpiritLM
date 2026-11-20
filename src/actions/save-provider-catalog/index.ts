import { createSafeAction } from "@/lib/create-safe-action";
import { serializableTransaction } from "@/lib/transaction";
import { InputSchema } from "./schema";
import type { InputType, ReturnType } from "./types";

const handler = async (data: InputType): Promise<ReturnType> => {
  const updated = await serializableTransaction(async (tx) => {
    const current = await tx.providerCatalogSnapshot.findUnique({
      where: { provider: data.provider },
      select: { fetchedAt: true },
    });
    if (current && current.fetchedAt >= data.fetchedAt) return false;

    const { provider, ...snapshot } = data;
    await tx.providerCatalogSnapshot.upsert({
      where: { provider },
      create: data,
      update: snapshot,
    });
    return true;
  });
  return { data: updated };
};

export const saveProviderCatalog = createSafeAction(InputSchema, handler);

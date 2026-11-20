import { createSafeAction } from "@/lib/create-safe-action";
import { db } from "@/lib/db";
import { ProviderModelsSchema } from "@/actions/save-provider-catalog/schema";
import { InputSchema } from "./schema";
import type { InputType, ReturnType } from "./types";

const handler = async ({ provider }: InputType): Promise<ReturnType> => {
  const snapshot = await db.providerCatalogSnapshot.findUnique({
    where: { provider },
    select: { models: true },
  });
  if (!snapshot) return { data: null };

  const parsed = ProviderModelsSchema.safeParse(snapshot.models);
  return { data: parsed.success ? parsed.data : null };
};

export const getProviderCatalog = createSafeAction(InputSchema, handler);

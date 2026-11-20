import { saveProviderCatalog } from "@/actions/save-provider-catalog";
import { ProviderModelsSchema } from "@/actions/save-provider-catalog/schema";
import { CHEAPVIBE_PROVIDER_ID } from "@/configs/consts/proxy.const";
import { ApiError } from "./api-error";
import { unwrapAction } from "./create-safe-action";
import { fetchUpstreamModels } from "./model-catalog";

export async function syncCheapVibeCatalog() {
  const fetchedAt = new Date();
  const parsed = ProviderModelsSchema.safeParse(await fetchUpstreamModels());
  if (!parsed.success) {
    throw new ApiError(
      502,
      "invalid_upstream_response",
      "CheapVibeCode вернул неполный или некорректный каталог коэффициентов",
    );
  }

  const models = parsed.data;
  const updated = unwrapAction(await saveProviderCatalog({
    provider: CHEAPVIBE_PROVIDER_ID,
    fetchedAt,
    models,
  }));
  return { modelCount: models.length, updated };
}

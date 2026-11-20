import { http } from "./http-client";
import { Prisma } from "@prisma/client";
import {
  CHEAPVIBE_LEGACY_MODEL_IDS,
  CHEAPVIBE_MODEL_FAMILIES,
  MODEL_GROUPS,
} from "@/configs/consts/models.const";
import { ProviderModelsSchema } from "@/actions/save-provider-catalog/schema";
import type { ProviderModel } from "@/actions/save-provider-catalog/types";
import type { Model, ModelGroup } from "@/configs/types/models.types";
import {
  CHEAPVIBE_BASE_URL,
  CHEAPVIBE_PROVIDER_ID,
  CATALOG_TIMEOUT_MS,
  CATALOG_CACHE_MS,
} from "@/configs/consts/proxy.const";
import { ApiError } from "./api-error";
import { calculatePricePerMillionTokens } from "./model-price";

import type {
  UpstreamModel,
  ModelCatalog,
} from "@/configs/types/catalog.types";

let catalogCache: { models: unknown[]; expires: number } | undefined;
let catalogLoad: Promise<unknown[]> | undefined;

function positiveTokenLimit(values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) {
      return value;
    }
  }
}

function cheapvibeModelAlias(id: string): string {
  const separator = id.indexOf("/");
  return separator === -1 ? id : id.slice(separator + 1);
}

function modelPrice(model: Model): Prisma.Decimal {
  return new Prisma.Decimal(
    model.pricePerMillionTokens
      .replace(/[^\d,.]/g, "")
      .replace(",", "."),
  );
}

function publicModelAlias(id: string): string {
  return CHEAPVIBE_LEGACY_MODEL_IDS.get(id) ?? id.replace(
    /^(claude-[a-z]+-\d+)-(\d{1,2})(?=-|$)/,
    "$1.$2",
  );
}

function publicModelName(model: ProviderModel): string {
  return model.display_name?.split(" · ").at(-1)?.trim() || model.id;
}

function formatModelPrice(price: Prisma.Decimal): string {
  return `${price.toFixed().replace(".", ",")} ₽`;
}

function cheapvibeModelProvider(alias: string, owner?: string) {
  if (/(?:^|-)composer(?:-|$)/i.test(alias)) return undefined;

  const family = MODEL_GROUPS.find(({ provider }) =>
    alias.startsWith(CHEAPVIBE_MODEL_FAMILIES[provider]),
  );
  if (family) return family.provider;

  if (owner === "xai" || owner === "google" || owner === "deepseek") return owner;
}

async function getProviderModels(): Promise<ProviderModel[] | null> {
  if (process.env.NODE_ENV === "development") {
    const models = await getCachedUpstreamModels().catch(() => undefined);
    const parsed = ProviderModelsSchema.safeParse(models);
    return parsed.success ? parsed.data : null;
  }

  if (!process.env.DATABASE_URL) return null;
  const { getProviderCatalog } = await import("@/actions/get-provider-catalog");
  const { data } = await getProviderCatalog({ provider: CHEAPVIBE_PROVIDER_ID });
  return data ?? null;
}

async function syncedModelGroups() {
  const data = await getProviderModels();
  if (!data) return null;

  const groups = MODEL_GROUPS.map((group) => {
    const providerPrefix = group.provider === "xai" ? "x-ai" : group.provider;
    const models = new Map<string, {
      model: Model;
      upstreamId: string;
      maxOutputTokens?: number;
      price: Prisma.Decimal;
    }>();

    for (const upstream of data) {
      const alias = cheapvibeModelAlias(upstream.id);
      if (cheapvibeModelProvider(alias, upstream.owned_by) !== group.provider) continue;

      const id = `${providerPrefix}/${publicModelAlias(alias)}`;
      if (models.has(id) && alias !== cheapvibeModelAlias(id)) continue;

      const configured = group.models.find((model) => model.id === id);
      const price = calculatePricePerMillionTokens(upstream.multiplier);
      models.set(id, {
        model: {
          id,
          name: configured?.name ?? publicModelName(upstream),
          contextWindow: upstream.context_window ?? configured?.contextWindow,
          pricePerMillionTokens: formatModelPrice(price),
          frontier: configured?.frontier,
        },
        upstreamId: upstream.id,
        maxOutputTokens: upstream.max_output_tokens,
        price,
      });
    }

    return { group, models: [...models.values()] };
  }).filter(({ models }) => models.length > 0);

  return groups.length ? groups : null;
}

export async function websiteModelGroups(): Promise<ModelGroup[]> {
  const groups = await syncedModelGroups();
  return groups?.map(({ group, models }) => ({
    ...group,
    models: models.map(({ model }) => model),
  })) ?? MODEL_GROUPS;
}

export function upstreamHeaders() {
  const secret = process.env.CHEAPVIBE_API_KEY;
  if (!secret)
    throw new ApiError(
      503,
      "upstream_not_configured",
      "Поставщик API не настроен",
    );
  return {
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
  };
}

export async function fetchUpstreamModels(): Promise<unknown[]> {
  const headers = upstreamHeaders();
  const signal = AbortSignal.timeout(CATALOG_TIMEOUT_MS);
  let response: Response;
  try {
    response = await http(`${CHEAPVIBE_BASE_URL}/models`, {
      headers,
      signal,
      redirect: "error",
    });
  } catch {
    throw new ApiError(
      502,
      "upstream_unavailable",
      "Не удалось получить каталог моделей",
    );
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new ApiError(
      502,
      "upstream_unavailable",
      "Каталог моделей временно недоступен",
    );
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError(
      502,
      "invalid_upstream_response",
      "Не удалось прочитать ответ каталога моделей",
    );
  }
  if (
    !payload ||
    typeof payload !== "object" ||
    !("data" in payload) ||
    !Array.isArray(payload.data)
  ) {
    throw new ApiError(
      502,
      "invalid_upstream_response",
      "Некорректный ответ каталога моделей",
    );
  }
  return payload.data;
}

async function getCachedUpstreamLimits(): Promise<ModelCatalog> {
  const models = await getCachedUpstreamModels();
  return new Map(
    models
      .filter(
        (item): item is UpstreamModel =>
          !!item && typeof item === "object" && "id" in item && typeof item.id === "string",
      )
      .map((item) => [
        item.id,
        {
          contextWindow: positiveTokenLimit([
            item.context_window,
            item.contextWindow,
            item.context_length,
            item.max_context_tokens,
          ]),
          maxOutputTokens: positiveTokenLimit([
            item.max_output_tokens,
            item.max_tokens,
          ]),
        },
      ]),
  );
}

async function getCachedUpstreamModels() {
  if (catalogCache && catalogCache.expires > Date.now()) return catalogCache.models;

  catalogLoad ??= fetchUpstreamModels()
    .then((loaded) => {
      catalogCache = {
        models: loaded,
        expires: Date.now() + CATALOG_CACHE_MS,
      };
      return loaded;
    })
    .finally(() => {
      catalogLoad = undefined;
    });
  return catalogLoad;
}

export async function availableModels() {
  const synced = await syncedModelGroups();
  if (synced) {
    const models = synced.flatMap((group) => group.models);
    // Snapshots saved before token limits were recorded can use live metadata.
    const legacyLimits = models.every((model) => model.maxOutputTokens === undefined)
      ? await getCachedUpstreamLimits().catch(() => undefined)
      : undefined;
    return models.map(({ model, upstreamId, maxOutputTokens, price }) => ({
      id: model.id,
      name: model.name,
      upstreamId,
      contextWindow: model.contextWindow ?? legacyLimits?.get(upstreamId)?.contextWindow,
      maxOutputTokens: maxOutputTokens ?? legacyLimits?.get(upstreamId)?.maxOutputTokens,
      price,
    }));
  }

  const available = await getCachedUpstreamLimits();

  return MODEL_GROUPS.flatMap((group) =>
    group.models.map((model) => {
      // CheapVibeCode exposes bare model IDs. Prefer those aliases even if
      // its catalog also happens to include a provider-prefixed ID.
      const alias = cheapvibeModelAlias(model.id);
      const upstreamId = available.has(alias)
        ? alias
        : available.has(model.id)
          ? model.id
          : alias;
      // Claude catalog IDs use dashes for version separators; public IDs use dots.
      const limits =
        available.get(upstreamId) ?? available.get(alias.replace(/\./g, "-"));
      // The upstream discovery list can lag behind supported model IDs.
      // Keep every configured SpiritLM model, with verified context fallbacks when omitted.
      return {
        id: model.id,
        name: model.name,
        upstreamId,
        contextWindow: limits?.contextWindow ?? model.contextWindow,
        maxOutputTokens: limits?.maxOutputTokens,
        price: modelPrice(model),
      };
    }),
  );
}

export async function resolveModel(id: string) {
  const availableModel = (await availableModels()).find(
    (item) =>
      item.id === id ||
      item.upstreamId === id ||
      (!id.includes("/") && cheapvibeModelAlias(item.id) === id),
  );
  if (availableModel) return availableModel;
  throw new ApiError(
    400,
    "model_not_found",
    "Модель отсутствует в доступном каталоге SpiritLM",
  );
}

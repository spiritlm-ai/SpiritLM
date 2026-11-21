import { http } from "./http-client";
import { Prisma } from "@prisma/client";
import {
  CHEAPVIBE_LEGACY_MODEL_IDS,
  CHEAPVIBE_MODEL_FAMILIES,
  MODEL_GROUPS,
} from "@/configs/consts/models.const";
import { ProviderModelSchema } from "@/actions/save-provider-catalog/schema";
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

import type { UpstreamModel } from "@/configs/types/catalog.types";

let catalogCache: { models: unknown[]; expires: number } | undefined;
let catalogLoad: Promise<unknown[]> | undefined;
const liveModelSchema = ProviderModelSchema.pick({
  id: true,
  display_name: true,
  owned_by: true,
  multiplier: true,
});

type CatalogModel = Pick<
  ProviderModel,
  "id" | "display_name" | "owned_by" | "multiplier" | "context_window" | "max_output_tokens"
>;

const upstreamBrand = /cheap[\s_-]*vibe(?:[\s_-]*code)?/i;

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

function publicModelAlias(id: string): string {
  return CHEAPVIBE_LEGACY_MODEL_IDS.get(id) ?? id.replace(
    /^(claude-[a-z]+-\d+)-(\d{1,2})(?=-|$)/,
    "$1.$2",
  );
}

function publicModelName(model: CatalogModel, publicAlias: string): string {
  const name = model.display_name?.split(" · ").at(-1)?.trim() || model.id;
  return upstreamBrand.test(name) ? publicAlias : name;
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

async function getWebsiteProviderModels(): Promise<CatalogModel[] | null> {
  if (process.env.NODE_ENV === "development") {
    return getLiveProviderModels().catch(() => null);
  }

  if (!process.env.DATABASE_URL) return null;
  const { getProviderCatalog } = await import("@/actions/get-provider-catalog");
  const { data } = await getProviderCatalog({ provider: CHEAPVIBE_PROVIDER_ID });
  return data ?? null;
}

function buildModelGroups(data: CatalogModel[]) {
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
      if (upstreamBrand.test(alias)) continue;
      if (cheapvibeModelProvider(alias, upstream.owned_by) !== group.provider) continue;

      const publicAlias = publicModelAlias(alias);
      const id = `${providerPrefix}/${publicAlias}`;
      const previous = models.get(id);
      if (previous && (
        alias !== publicAlias ||
        (previous.upstreamId === alias && upstream.id !== alias)
      )) continue;

      const configured = group.models.find((model) => model.id === id);
      const price = calculatePricePerMillionTokens(upstream.multiplier);
      models.set(id, {
        model: {
          id,
          name: configured?.name ?? publicModelName(upstream, publicAlias),
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

  return groups;
}

export async function websiteModelGroups(): Promise<ModelGroup[]> {
  const data = await getWebsiteProviderModels();
  const groups = data ? buildModelGroups(data) : [];
  if (!groups.length) return MODEL_GROUPS;
  return groups.map(({ group, models }) => ({
    ...group,
    models: models.map(({ model }) => model),
  }));
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

async function getLiveProviderModels(): Promise<CatalogModel[]> {
  return (await getCachedUpstreamModels()).flatMap((item) => {
    const parsed = liveModelSchema.safeParse(item);
    if (!parsed.success) return [];

    const limits = item as UpstreamModel;
    return [{
      ...parsed.data,
      context_window: positiveTokenLimit([
        limits.context_window,
        limits.contextWindow,
        limits.context_length,
        limits.max_context_tokens,
      ]),
      max_output_tokens: positiveTokenLimit([limits.max_output_tokens, limits.max_tokens]),
    }];
  });
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
  const groups = buildModelGroups(await getLiveProviderModels());
  return groups.flatMap(({ models }) =>
    models.map(({ model, upstreamId, maxOutputTokens, price }) => ({
      id: model.id,
      name: model.name,
      upstreamId,
      contextWindow: model.contextWindow,
      maxOutputTokens,
      price,
    })),
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

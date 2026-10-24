import { http } from "./http-client";
import { Prisma } from "@prisma/client";
import { MODEL_GROUPS } from "@/configs/consts/models.const";
import type { Model } from "@/configs/types/models.types";
import {
  CHEAPVIBE_BASE_URL,
  CATALOG_TIMEOUT_MS,
  CATALOG_CACHE_MS,
} from "@/configs/consts/proxy.const";
import { ApiError } from "./api-error";

import type {
  UpstreamModel,
  ModelCatalog,
} from "@/configs/types/catalog.types";

let catalogCache: { models: ModelCatalog; expires: number } | undefined;
let catalogLoad: Promise<ModelCatalog> | undefined;

function outputLimit(model: UpstreamModel): number | undefined {
  for (const value of [model.max_output_tokens, model.max_tokens]) {
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

async function loadModelCatalog(): Promise<ModelCatalog> {
  let response: Response;
  try {
    response = await http(`${CHEAPVIBE_BASE_URL}/models`, {
      headers: upstreamHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(CATALOG_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      502,
      "upstream_unavailable",
      "Не удалось получить каталог моделей",
    );
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new ApiError(
      502,
      "upstream_unavailable",
      "Каталог моделей временно недоступен",
    );
  }
  const payload: unknown = await response.json();
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
  return new Map(
    payload.data
      .filter(
        (item): item is UpstreamModel =>
          !!item && typeof item === "object" && typeof item.id === "string",
      )
      .map((item) => [item.id, { maxOutputTokens: outputLimit(item) }]),
  );
}

export async function availableModels() {
  let models =
    catalogCache && catalogCache.expires > Date.now()
      ? catalogCache.models
      : undefined;
  if (!models) {
    catalogLoad ??= loadModelCatalog()
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
    models = await catalogLoad;
  }
  const available = models;

  return MODEL_GROUPS.flatMap((group) =>
    group.models.flatMap((model) => {
      // CheapVibeCode exposes bare model IDs. Prefer those aliases even if
      // its catalog also happens to include a provider-prefixed ID.
      const alias = cheapvibeModelAlias(model.id);
      const upstreamId = available.has(alias)
        ? alias
        : available.has(model.id)
          ? model.id
          : alias;
      if (!available.has(upstreamId)) return [];
      return [
        {
          id: model.id,
          name: model.name,
          upstreamId,
          maxOutputTokens: available.get(upstreamId)?.maxOutputTokens,
          // Customer tariff per million tokens.
          price: modelPrice(model),
        },
      ];
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

  const configuredModel = MODEL_GROUPS.flatMap((group) => group.models).find(
    (model) =>
      model.id === id ||
      (!id.includes("/") && cheapvibeModelAlias(model.id) === id),
  );
  if (!configuredModel)
    throw new ApiError(
      400,
      "model_not_found",
      "Модель отсутствует в доступном каталоге SpiritLM",
    );

  return {
    id: configuredModel.id,
    name: configuredModel.name,
    upstreamId: cheapvibeModelAlias(configuredModel.id),
    maxOutputTokens: undefined,
    price: modelPrice(configuredModel),
  };
}

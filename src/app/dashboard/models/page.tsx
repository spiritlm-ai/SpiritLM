"use client";

import Image from "next/image";
import { IconCheck, IconCopy, IconSearch } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { MODEL_GROUPS } from "@/configs/consts/models.const";
import { IMAGES } from "@/configs/paths/images.paths";

export default function DashboardModelsPage() {
  const [query, setQuery] = useState("");
  const [frontierOnly, setFrontierOnly] = useState(false);
  const [copiedModelId, setCopiedModelId] = useState<string | null>(null);

  async function copyModelId(modelId: string) {
    try {
      await navigator.clipboard.writeText(modelId);
      setCopiedModelId(modelId);
      window.setTimeout(() => setCopiedModelId(null), 1800);
    } catch {
      setCopiedModelId(null);
    }
  }

  const groups = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ru");

    return MODEL_GROUPS.map((group) => ({
      ...group,
      models: group.models.filter((model) => {
        const matchesQuery = `${model.name} ${model.id}`
          .toLocaleLowerCase("ru")
          .includes(normalizedQuery);
        return matchesQuery && (!frontierOnly || model.frontier);
      }),
    })).filter((group) => group.models.length > 0);
  }, [frontierOnly, query]);

  const resultCount = groups.reduce(
    (total, group) => total + group.models.length,
    0,
  );

  return (
    <main
      className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8"
      aria-labelledby="dashboard-page-title"
    >
      <div className="mx-auto max-w-[1340px]">
        <div className="mb-8 rounded-[20px] border border-white/[0.04] bg-[#1b1b1b] p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1
                id="dashboard-page-title"
                className="text-2xl font-semibold tracking-tight sm:text-3xl"
              >
                Каталог моделей
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#a5a5a1]">
                Выберите модель для запросов через SpiritLM. Тарифы указаны за 1
                млн токенов
              </p>
            </div>
            <label className="relative block w-full sm:w-72">
              <span className="sr-only">Поиск моделей</span>
              <IconSearch
                aria-hidden="true"
                size={16}
                stroke={1.5}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#858580]"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Найти модель"
                className="h-10 w-full rounded-xl border border-[#3b3b39] bg-[#1b1b1b] pl-9 pr-3 text-sm text-[#f3f2ee] outline-none placeholder:text-[#777875] focus:border-[#ffe02e]/70 focus:ring-2 focus:ring-[#ffe02e]/20"
              />
            </label>
          </div>

          <div
            className="mt-6 flex flex-wrap items-center gap-2"
            aria-label="Фильтр моделей"
          >
            <button
              type="button"
              aria-pressed={!frontierOnly}
              onClick={() => setFrontierOnly(false)}
              className={`rounded-full px-3.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe02e] ${
                !frontierOnly
                  ? "bg-[#ffe02e] font-medium text-[#171717] hover:bg-[#ffcc36]"
                  : "bg-[#1b1b1b] text-[#b8b8b3] hover:bg-[#30302e] hover:text-white"
              }`}
            >
              Все модели
            </button>
            <button
              type="button"
              aria-pressed={frontierOnly}
              onClick={() => setFrontierOnly(true)}
              className={`rounded-full px-3.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe02e] ${
                frontierOnly
                  ? "bg-[#ffe02e] font-medium text-[#171717] hover:bg-[#ffcc36]"
                  : "bg-[#1b1b1b] text-[#b8b8b3] hover:bg-[#30302e] hover:text-white"
              }`}
            >
              Frontier модели
            </button>
            <span className="ml-1 text-xs text-[#858580]" aria-live="polite">
              Результатов: {resultCount}
            </span>
          </div>
        </div>

        {groups.length > 0 ? (
          <div className="space-y-10">
            {groups.map((group) => (
              <section
                key={group.provider}
                aria-labelledby={`provider-${group.provider}`}
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-[#30302e] p-1.5">
                    <Image
                      src={group.icon}
                      alt=""
                      width={28}
                      height={28}
                      className={`size-full object-contain ${
                        group.provider === "anthropic" ||
                        group.provider === "xai"
                          ? "invert"
                          : ""
                      }`}
                    />
                  </div>
                  <h2
                    id={`provider-${group.provider}`}
                    className="text-lg font-semibold"
                  >
                    {group.name}
                  </h2>
                  <span className="rounded-full bg-[#30302e] px-2 py-0.5 text-xs text-[#a5a5a1]">
                    {group.models.length}
                  </span>
                </div>

                <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3">
                  {group.models.map((model) => (
                    <li key={model.id}>
                      <article className="group flex min-h-[142px] flex-col rounded-[15px] bg-[#1b1b1b] p-5 transition-colors hover:bg-[#222220]">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-semibold leading-6 text-[#f3f2ee]">
                            {model.name}
                          </h3>
                          <button
                            type="button"
                            onClick={() => void copyModelId(model.id)}
                            aria-label={
                              copiedModelId === model.id
                                ? `ID модели ${model.name} скопирован`
                                : `Скопировать ID модели ${model.name}`
                            }
                            title={
                              copiedModelId === model.id
                                ? "Скопировано"
                                : "Скопировать ID"
                            }
                            className="inline-flex size-8 items-center justify-center rounded-lg text-[#999994] transition-colors hover:bg-white/[0.07] hover:text-[#ffe02e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe02e]"
                          >
                            {copiedModelId === model.id ? (
                              <IconCheck
                                aria-hidden="true"
                                size={16}
                                stroke={1.8}
                              />
                            ) : (
                              <IconCopy
                                aria-hidden="true"
                                size={16}
                                stroke={1.4}
                              />
                            )}
                          </button>
                        </div>
                        <p className="mt-1 break-all font-mono text-xs text-[#858580]">
                          {model.id}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#303943] px-2.5 py-1 text-xs text-[#d7dde5]">
                            <Image
                              src={
                                group.provider === "openai"
                                  ? IMAGES.AI.OPENAI
                                  : group.provider === "google"
                                    ? IMAGES.AI.GEMINI
                                    : group.provider === "xai"
                                      ? IMAGES.AI.GROK
                                      : group.modelProviderIcon
                              }
                              alt=""
                              width={12}
                              height={12}
                              aria-hidden="true"
                              className={`size-3 rounded-full object-contain ${
                                group.provider === "xai" ? "invert" : ""
                              }`}
                            />
                            {group.modelProviderName}
                          </span>
                          {model.frontier && (
                            <span className="rounded-full bg-[#ffe02e]/10 px-2.5 py-1 text-xs font-medium text-[#ffe02e]">
                              Frontier
                            </span>
                          )}
                        </div>
                        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                          <span className="text-xs text-[#999994]">
                            Цена за 1 MTok
                          </span>
                          <span className="whitespace-nowrap text-sm font-semibold text-[#f3f2ee]">
                            {model.pricePerMillionTokens}
                          </span>
                        </div>
                      </article>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <div className="rounded-[15px] bg-[#1b1b1b] px-6 py-14 text-center">
            <p className="font-medium">Модели не найдены</p>
            <p className="mt-2 text-sm text-[#999994]">
              Попробуйте изменить запрос или фильтр.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

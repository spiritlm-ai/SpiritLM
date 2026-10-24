import { formatBalance } from "@/lib/format-balance";
import type { DashboardSummary } from "@/configs/types/api.types";
import { Skeleton } from "./skeleton";

export function UsageDetails({
  summary,
  periodLabel,
  loading = summary === null,
}: {
  summary: DashboardSummary | null;
  periodLabel: string;
  loading?: boolean;
}) {
  const details = [
    { label: "Входящие", value: summary?.inputTokens },
    { label: "Исходящие", value: summary?.outputTokens },
    { label: "Из кэша", value: summary?.cachedTokens },
    { label: "Количество запросов", value: summary?.requestCount },
  ];

  return (
    <section
      className="my-6 rounded-[18px] bg-[#1b1b1b] p-5 sm:p-6"
      aria-labelledby="token-details-title"
    >
      <h2 id="token-details-title" className="text-base font-semibold">
        Детализация · {periodLabel}
      </h2>
      <dl className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-4">
        {details.map((item) => (
          <div key={item.label}>
            <dt className="text-xs text-[#999994]">{item.label}</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">
              {item.value === undefined && loading ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                (item.value?.toLocaleString("ru-RU") ?? "Недоступно")
              )}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs leading-5 text-[#858580]">
        Расход токенов указан без повторного учёта данных кэша.
      </p>
      {summary && (
        <p className="mt-3 text-sm text-[#d0d0cb]">
          Расход подписки за период:{" "}
          {formatBalance(summary.subscriptionCreditsUsed)}{" "}
          кредитов
        </p>
      )}
      <h3 className="mt-6 text-sm font-medium">По моделям</h3>
      {!summary && loading ? (
        <ul className="mt-3 space-y-3" aria-label="Загрузка моделей">
          {[0, 1, 2].map((row) => (
            <li
              key={row}
              className="flex items-center justify-between gap-4 py-2"
            >
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-16" />
            </li>
          ))}
        </ul>
      ) : !summary ? (
        <p className="mt-3 text-sm text-[#858580]">Недоступно</p>
      ) : !summary.models.length ? (
        <p className="mt-3 text-sm text-[#858580]">Пока нет запросов</p>
      ) : (
        <ul className="mt-2 divide-y divide-white/[0.06]">
          {summary.models.map((item) => (
            <li
              key={item.model}
              className="flex items-start justify-between gap-4 py-3 text-sm"
            >
              <div className="min-w-0">
                <p className="break-words font-mono text-xs text-[#d0d0cb]">
                  {item.model}
                </p>
                <p className="mt-1 text-xs text-[#858580]">
                  Запросов: {item.requests.toLocaleString("ru-RU")}
                </p>
              </div>
              <span className="shrink-0 tabular-nums">
                {item.tokens.toLocaleString("ru-RU")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function CreditHistory({
  summary,
  loading = summary === null,
}: {
  summary: DashboardSummary | null;
  loading?: boolean;
}) {
  return (
    <section
      className="mt-6 rounded-[18px] bg-[#1b1b1b] p-5 sm:p-6"
      aria-labelledby="credits-title"
    >
      <h2 id="credits-title" className="text-base font-semibold">
        Операции баланса
      </h2>
      <p className="mt-1 text-xs text-[#858580]">Последние 20 операций</p>
      {!summary && loading ? (
        <ul className="mt-4 space-y-4" aria-label="Загрузка начислений">
          {[0, 1, 2].map((row) => (
            <li
              key={row}
              className="flex items-center justify-between gap-4 py-2"
            >
              <div className="space-y-2">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-4 w-16" />
            </li>
          ))}
        </ul>
      ) : !summary ? (
        <p className="mt-6 text-sm text-[#858580]">Недоступно</p>
      ) : !summary.credits.length ? (
        <p className="mt-6 text-sm text-[#858580]">Операций пока нет</p>
      ) : (
        <ul className="mt-4 divide-y divide-white/[0.06]">
          {summary.credits.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-4 py-3"
            >
              <div className="min-w-0">
                <p className="break-words text-sm text-[#d0d0cb]">
                  {item.note}
                </p>
                <p className="mt-1 text-xs text-[#858580]">
                  {new Date(item.createdAt).toLocaleString("ru-RU")}
                </p>
              </div>
              <span className="shrink-0 text-sm tabular-nums text-[#ffe02e]">
                {Number(item.amount) >= 0 ? "+" : "−"}₽{" "}
                {formatBalance(Math.abs(Number(item.amount)))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

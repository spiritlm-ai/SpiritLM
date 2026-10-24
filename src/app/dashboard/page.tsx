"use client";

import { formatBalance } from "@/lib/format-balance";
import { PATHS } from "@/configs/paths/pages.paths";

import {
  DASHBOARD_PERIOD_OPTIONS,
  DASHBOARD_POLL_MS,
} from "@/configs/consts/dashboard.const";
import { useUser } from "@clerk/nextjs";
import { IconPlus } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { TopUpModal } from "@/components/modals/top-up-modal";
import type {
  DashboardPeriod,
  DashboardSummary,
} from "@/configs/types/api.types";
import { dashboardFetch } from "@/lib/dashboard-client";
import { CreditHistory, UsageDetails } from "./_components/usage-details";
import Link from "next/link";
import { useSubscription } from "./_components/use-subscription";
import { Skeleton } from "./_components/skeleton";

const chartConfig = {
  tokens: {
    label: "Токены",
    color: "#ffe02e",
  },
} satisfies ChartConfig;
export default function Dashboard() {
  const { data: subscription, error: subscriptionError } = useSubscription();
  const { user, isLoaded: isUserLoaded } = useUser();
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>("2d");
  const [balanceRevision, setBalanceRevision] = useState(0);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (
      ["bank_card", "sbp"].includes(
        new URLSearchParams(window.location.search).get("payment_method") ?? "",
      )
    ) {
      setTopUpOpen(true);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const data = await dashboardFetch<DashboardSummary>(
          `${PATHS.API.DASHBOARD.SUMMARY}?period=${selectedPeriod}`,
          { signal: controller.signal },
        );
        setSummary(data);
        setError(null);
      } catch (failure) {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "Не удалось загрузить статистику",
          );
      }
    }
    void load();
    const interval = window.setInterval(() => {
      void load();
    }, DASHBOARD_POLL_MS);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [selectedPeriod, balanceRevision]);
  const usageData = summary?.usage ?? [];
  const requests = summary?.requests ?? [];
  const average = summary?.requestCount
    ? Math.round(summary.tokens / summary.requestCount)
    : 0;
  const username =
    user?.username ||
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0];
  const periodLabel =
    DASHBOARD_PERIOD_OPTIONS.find((period) => period.value === selectedPeriod)
      ?.label ?? "48 часов";
  const periodTitle =
    selectedPeriod === "all"
      ? "за всё время"
      : selectedPeriod === "2d"
        ? "за 48 часов"
        : `за ${periodLabel}`;

  return (
    <main
      className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8"
      aria-labelledby="dashboard-page-title"
    >
      <div className="mx-auto max-w-[1340px]">
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-xl bg-[#1b1b1b] p-4 text-sm text-[#ffb3a9]"
          >
            {error}
          </p>
        )}
        <section
          className="mb-6 rounded-[20px] border border-white/[0.04] bg-[#1b1b1b] p-5 sm:p-6"
          aria-label="Сводка аккаунта"
        >
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              {isUserLoaded ? (
                <div className="flex flex-wrap items-center gap-2.5">
                  <p className="text-sm text-[#999994]">
                    @{username ?? "Пользователь"}
                  </p>
                  {subscription ? (
                    <Link
                      href={PATHS.DASHBOARD.SUBSCRIPTION}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe02e] ${
                        subscription.current
                          ? "bg-[#ffe02e]/10 text-[#ffe02e]"
                          : "bg-white/[0.06] text-[#a5a5a1]"
                      }`}
                    >
                      {subscription.current?.planName ?? "Бесплатно"}
                    </Link>
                  ) : subscriptionError ? null : (
                    <Skeleton className="h-6 w-20 rounded-full" />
                  )}
                </div>
              ) : (
                <Skeleton className="h-4 w-28" />
              )}
              <h1
                id="dashboard-page-title"
                className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl"
              >
                Главная
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setTopUpOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#ffe02e] px-4 text-sm font-semibold text-[#171717] transition-colors hover:bg-[#ffcc36] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe02e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1b1b1b]"
            >
              <IconPlus aria-hidden="true" size={16} stroke={1.7} />
              Пополнить
            </button>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Metric
              label="Баланс"
              value={summary ? rubles(summary.balance) : undefined}
              loading={!summary && !error}
            />
            <Metric
              label="Расход API-баланса за всё время"
              value={summary ? rubles(summary.spent) : undefined}
              loading={!summary && !error}
            />
            <Metric
              label={`Токенов ${periodTitle}`}
              value={
                summary ? summary.tokens.toLocaleString("ru-RU") : undefined
              }
              loading={!summary && !error}
            />
          </div>
        </section>

        <section className="mb-6" aria-label="Использование токенов">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-[#a5a5a1]">
              Период статистики
            </p>
            <div
              role="group"
              className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-[#1b1b1b] p-1"
              aria-label="Выберите период статистики"
            >
              {DASHBOARD_PERIOD_OPTIONS.map((period) => (
                <button
                  key={period.value}
                  type="button"
                  aria-pressed={selectedPeriod === period.value}
                  onClick={() => setSelectedPeriod(period.value)}
                  className={`h-11 shrink-0 rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe02e] ${
                    selectedPeriod === period.value
                      ? "bg-[#ffe02e] text-[#171717]"
                      : "text-[#a5a5a1] hover:bg-white/[0.06] hover:text-[#f3f2ee]"
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
            <article className="rounded-[18px] bg-[#1b1b1b] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Расход токенов</h2>
                  <p className="mt-1 text-xs text-[#858580]">
                    {selectedPeriod === "2d"
                      ? "Почасовой расход · UTC"
                      : selectedPeriod === "all"
                        ? "Помесячный расход · UTC"
                        : "Ежедневный расход · UTC"}
                  </p>
                </div>
                <span className="rounded-full bg-[#ffe02e]/10 px-3 py-1.5 text-xs font-medium text-[#ffe02e]">
                  {summary ? (
                    `${summary.tokens.toLocaleString("ru-RU")} токенов`
                  ) : error ? (
                    "Недоступно"
                  ) : (
                    <Skeleton className="h-4 w-28" />
                  )}
                </span>
              </div>
              <ChartContainer
                config={chartConfig}
                className="mt-5 h-48 w-full aspect-auto"
                aria-label={`Расход токенов ${periodTitle}`}
              >
                <AreaChart
                  accessibilityLayer
                  data={usageData}
                  margin={{ left: 4, right: 8, top: 8 }}
                >
                  <defs>
                    <linearGradient id="fillTokens" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="var(--color-tokens)"
                        stopOpacity={0.24}
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--color-tokens)"
                        stopOpacity={0.01}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    vertical={false}
                    stroke="#ffffff"
                    strokeOpacity={0.08}
                    strokeDasharray="3 4"
                  />
                  <XAxis
                    dataKey="time"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={9}
                    interval={selectedPeriod === "2d" ? 5 : "preserveStartEnd"}
                    tick={{ fill: "#777875", fontSize: 10 }}
                    tickFormatter={(value: string) => {
                      const date = new Date(value);
                      if (selectedPeriod === "2d") {
                        return date.toLocaleTimeString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "UTC",
                        });
                      }
                      return date.toLocaleDateString(
                        "ru-RU",
                        selectedPeriod === "all"
                          ? { month: "short", year: "2-digit", timeZone: "UTC" }
                          : { day: "numeric", month: "short", timeZone: "UTC" },
                      );
                    }}
                  />
                  <ChartTooltip
                    cursor={{ stroke: "#777875", strokeDasharray: "4 4" }}
                    content={
                      <ChartTooltipContent
                        indicator="line"
                        labelFormatter={(value) => {
                          const date = new Date(String(value));
                          if (Number.isNaN(date.getTime()))
                            return String(value);

                          if (selectedPeriod === "2d") {
                            return `${date.toLocaleString("ru-RU", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                              timeZone: "UTC",
                            })} UTC`;
                          }

                          return date.toLocaleDateString(
                            "ru-RU",
                            selectedPeriod === "all"
                              ? {
                                  month: "long",
                                  year: "numeric",
                                  timeZone: "UTC",
                                }
                              : {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                  timeZone: "UTC",
                                },
                          );
                        }}
                      />
                    }
                  />
                  <Area
                    dataKey="tokens"
                    type="monotone"
                    stroke="var(--color-tokens)"
                    strokeWidth={2}
                    fill="url(#fillTokens)"
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: "#ffe02e",
                      stroke: "#1b1b1b",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ChartContainer>
            </article>
            <article className="flex flex-col rounded-[18px] bg-[#1b1b1b] p-5 sm:p-6">
              <h2 className="text-base font-semibold">Токены {periodTitle}</h2>
              <p className="mt-1 text-xs text-[#858580]">{periodLabel} · UTC</p>
              <div className="mt-6 space-y-5">
                <div className="flex items-end justify-between gap-3">
                  <span className="text-sm text-[#a5a5a1]">Всего токенов</span>
                  <span className="text-2xl font-semibold tabular-nums">
                    {summary ? (
                      summary.tokens.toLocaleString("ru-RU")
                    ) : error ? (
                      "Недоступно"
                    ) : (
                      <Skeleton className="h-7 w-24" />
                    )}
                  </span>
                </div>
                <div className="h-px bg-white/[0.07]" />
                <div className="flex items-end justify-between gap-3">
                  <span className="text-sm text-[#a5a5a1]">Запросы</span>
                  <span className="text-2xl font-semibold">
                    {summary ? (
                      summary.requestCount.toLocaleString("ru-RU")
                    ) : error ? (
                      "Недоступно"
                    ) : (
                      <Skeleton className="h-7 w-16" />
                    )}
                  </span>
                </div>
                <div className="h-px bg-white/[0.07]" />
                <div className="flex items-end justify-between gap-3">
                  <span className="text-sm text-[#a5a5a1]">Средний расход</span>
                  <span className="text-xl font-semibold sm:text-2xl">
                    {summary ? (
                      average.toLocaleString("ru-RU")
                    ) : error ? (
                      "Недоступно"
                    ) : (
                      <Skeleton className="h-7 w-16" />
                    )}{" "}
                    <span className="text-xs font-normal text-[#858580] sm:text-sm">
                      токена / запрос
                    </span>
                  </span>
                </div>
                <div className="h-px bg-white/[0.07]" />
                <div className="flex items-end justify-between gap-3">
                  <span className="text-sm text-[#a5a5a1]">Расход средств</span>
                  <span className="text-2xl font-semibold">
                    {summary ? (
                      rubles(summary.cost)
                    ) : error ? (
                      "Недоступно"
                    ) : (
                      <Skeleton className="h-7 w-24" />
                    )}
                  </span>
                </div>
              </div>
            </article>
          </div>
        </section>

        <UsageDetails
          summary={summary}
          periodLabel={periodLabel}
          loading={!summary && !error}
        />
        <section
          className="overflow-hidden rounded-[18px] bg-[#1b1b1b]"
          aria-labelledby="requests-title"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-6">
            <div>
              <h2 id="requests-title" className="text-base font-semibold">
                Последние запросы
              </h2>
              <p className="mt-1 text-xs text-[#858580]">
                Последние 20 запросов
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left text-sm">
              <thead className="bg-white/[0.025] text-[11px] font-medium uppercase tracking-wide text-[#777875]">
                <tr>
                  <th className="px-5 py-3 sm:px-6">Модель</th>
                  <th className="px-4 py-3">ID запроса</th>
                  <th className="px-4 py-3">Время</th>
                  <th className="px-4 py-3 text-right">Токены</th>
                  <th className="px-4 py-3 text-right">Списано</th>
                  <th className="px-5 py-3 text-right sm:px-6">Статус</th>
                </tr>
              </thead>
              <tbody>
                {!requests.length && summary && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-10 text-center text-[#858580]"
                    >
                      Пока нет запросов
                    </td>
                  </tr>
                )}
                {!requests.length && error && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-10 text-center text-[#858580]"
                    >
                      Статистика недоступна
                    </td>
                  </tr>
                )}
                {!requests.length &&
                  !summary &&
                  !error &&
                  [0, 1, 2].map((row) => (
                    <tr
                      key={`request-skeleton-${row}`}
                      className="border-t border-white/[0.06]"
                    >
                      <td className="px-5 py-4 sm:px-6">
                        <Skeleton className="h-4 w-28" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-3 w-24" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-3 w-28" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="ml-auto h-4 w-12" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="ml-auto h-4 w-16" />
                      </td>
                      <td className="px-5 py-4 sm:px-6">
                        <Skeleton className="ml-auto h-5 w-16 rounded-full" />
                      </td>
                    </tr>
                  ))}
                {requests.map((request) => (
                  <tr key={request.id} className="border-t border-white/[0.06]">
                    <td className="whitespace-nowrap px-5 py-4 font-medium text-[#f3f2ee] sm:px-6">
                      {request.model}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-mono text-xs text-[#858580]">
                      {request.id}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-xs text-[#a5a5a1]">
                      {new Date(request.createdAt).toLocaleString("ru-RU")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums">
                      {request.totalTokens === null
                        ? "Нет данных"
                        : request.totalTokens.toLocaleString("ru-RU")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums">
                      {request.paymentSource === "SUBSCRIPTION"
                        ? `${formatBalance(request.chargedCost)} кр.`
                        : rubles(request.chargedCost)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right sm:px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs ${request.status === "SUCCEEDED" ? "text-[#9fc7a1]" : "text-[#c5c5c0]"}`}
                      >
                        <span
                          className="size-1.5 rounded-full bg-current"
                          aria-hidden="true"
                        />
                        {statusLabel(request.status)}
                        {request.diagnostic ? " · Тест" : ""}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <CreditHistory summary={summary} loading={!summary && !error} />
      </div>
      <TopUpModal
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        onPaid={() => setBalanceRevision((value) => value + 1)}
      />
    </main>
  );
}

function Metric({
  label,
  value,
  loading = false,
}: {
  label: string;
  value?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-[14px] bg-[#242424] px-4 py-4">
      <p className="text-xs text-[#999994]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
        {loading ? <Skeleton className="h-7 w-28" /> : (value ?? "Недоступно")}
      </p>
    </div>
  );
}

function rubles(value: string) {
  return `₽ ${formatBalance(value)}`;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    SUCCEEDED: "Успешно",
    FAILED: "Ошибка",
    INTERRUPTED: "Прерван",
    RUNNING: "Выполняется",
  };
  return labels[status] ?? "Неизвестно";
}

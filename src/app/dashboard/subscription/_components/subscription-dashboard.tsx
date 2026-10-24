"use client";

import { useEffect, useRef, useState } from "react";
import { IconSparkles } from "@tabler/icons-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { PaymentMethodSelector } from "@/components/modals/payment-method-selector";
import { ModalShell } from "@/components/modals/modal-shell";
import { PATHS } from "@/configs/paths/pages.paths";
import type {
  SubscriptionMethod,
  SubscriptionOrderSummary,
  SubscriptionPlan,
} from "@/configs/types/subscriptions.types";
import { dashboardFetch } from "@/lib/dashboard-client";
import { useSubscription } from "../../_components/use-subscription";
import { SubscriptionStatus, credits, date } from "./subscription-status";
import { SubscriptionThanksModal } from "./subscription-thanks-modal";
import { useSubscriptionThanks } from "./use-subscription-thanks";
import {
  SubscriptionHistorySkeleton,
  SubscriptionPlansSkeleton,
  SubscriptionStatusSkeleton,
} from "./subscription-skeleton";

const buttonClass =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-[#ffe02e] px-4 py-2 text-sm font-semibold text-[#171717] transition-colors hover:bg-[#ffcc36] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe02e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1b1b1b] disabled:cursor-not-allowed disabled:opacity-50";

export function SubscriptionDashboard() {
  const { data, error, refresh } = useSubscription();
  const [selected, setSelected] = useState<SubscriptionPlan | null>(null);
  const [method, setMethod] = useState<SubscriptionMethod>("balance");
  const [pending, setPending] = useState(false);
  const [order, setOrder] = useState<SubscriptionOrderSummary | null>(null);
  const { paidOrder, dismiss } = useSubscriptionThanks(data?.orders, order);
  const requestId = useRef<string | null>(null);
  const redirectAfterCheckout = useRef(false);

  useEffect(() => {
    if (paidOrder) {
      redirectAfterCheckout.current = false;
      setSelected(null);
    }
  }, [paidOrder]);

  const displayedOrder =
    data?.orders.find((item) => item.id === order?.id) ?? order;

  useEffect(() => {
    if (!selected) {
      redirectAfterCheckout.current = false;
      return;
    }
    if (!redirectAfterCheckout.current || !displayedOrder) return;
    if (displayedOrder.status === "PENDING" && displayedOrder.invoiceUrl) {
      redirectAfterCheckout.current = false;
      window.location.assign(displayedOrder.invoiceUrl);
    } else if (!["CREATING", "PENDING"].includes(displayedOrder.status)) {
      redirectAfterCheckout.current = false;
    }
  }, [selected, displayedOrder]);

  const selectedMode = data?.paymentModes[method];
  const purchasedPeriods =
    selectedMode === "test"
      ? (data?.testPeriods ?? [])
      : (data?.upcoming ?? []);
  const lastPeriod = purchasedPeriods[purchasedPeriods.length - 1];
  const startsAt =
    lastPeriod?.endsAt ??
    (selectedMode === "live" ? data?.current?.endsAt : undefined);

  function selectPlan(
    plan: SubscriptionPlan,
    existingOrder?: SubscriptionOrderSummary,
  ) {
    redirectAfterCheckout.current = false;
    const pendingOrder = existingOrder ?? data?.orders.find(
      (item) =>
        item.planId === plan.id &&
        ["CREATING", "PENDING"].includes(item.status),
    ) ?? (
      order?.planId === plan.id &&
      ["CREATING", "PENDING"].includes(order.status)
        ? order
        : null
    );
    setSelected(plan);
    setOrder(pendingOrder);
    if (pendingOrder) {
      setMethod(pendingOrder.method === "card" ? "card" : "cryptobot");
    }
    requestId.current = null;
  }

  async function checkout() {
    if (!selected || pending) return;
    redirectAfterCheckout.current = method !== "balance";
    setPending(true);
    requestId.current ??= crypto.randomUUID();
    try {
      const result = await dashboardFetch<{ order: SubscriptionOrderSummary }>(
        PATHS.API.DASHBOARD.SUBSCRIPTION_CHECKOUT,
        {
          method: "POST",
          body: JSON.stringify({
            planId: selected.id,
            method,
            requestId: requestId.current,
          }),
        },
      );
      setOrder(result.order);
      if (result.order.status === "PAID") {
        setSelected(null);
      } else if (
        ["FAILED", "EXPIRED", "CANCELLED"].includes(result.order.status)
      ) {
        toast.error(
          "Этот счёт закрыт. Выберите тариф заново для новой покупки.",
        );
      }
      await refresh();
    } catch (failure) {
      redirectAfterCheckout.current = false;
      toast.error(
        failure instanceof Error
          ? failure.message
          : "Не удалось оплатить подписку",
      );
    } finally {
      setPending(false);
    }
  }

  async function cancelOrder(id: string) {
    if (pending) return;
    redirectAfterCheckout.current = false;
    setPending(true);
    try {
      await dashboardFetch(PATHS.API.DASHBOARD.SUBSCRIPTION_ORDER(id), {
        method: "DELETE",
      });
      toast.success("Статус счёта обновлён");
      await refresh();
    } catch (failure) {
      toast.error(
        failure instanceof Error ? failure.message : "Не удалось отменить счёт",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <main
      className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8"
      aria-labelledby="dashboard-page-title"
    >
      <div className="mx-auto max-w-[1340px] space-y-6">
        <section className="space-y-6 rounded-[20px] bg-[#1b1b1b] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1
              id="dashboard-page-title"
              className="text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              Подписка Access
            </h1>
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-[#1b1b1b] p-4 text-sm text-[#ffb3a9]"
            >
              {error}{" "}
              <button
                type="button"
                onClick={() => void refresh()}
                className="ml-2 min-h-11 underline focus-visible:ring-2 focus-visible:ring-[#ffe02e]"
              >
                Повторить
              </button>
            </p>
          )}
          {data ? (
            <SubscriptionStatus data={data} />
          ) : !error ? (
            <SubscriptionStatusSkeleton />
          ) : null}
        </section>
        <section aria-labelledby="subscription-plans-title">
          <h2
            id="subscription-plans-title"
            className="mb-4 text-lg font-semibold"
          >
            Выберите тариф
          </h2>
          {!data && !error && <SubscriptionPlansSkeleton />}
          <div className="grid gap-4 lg:grid-cols-3">
            {data?.plans.map((plan) => (
              <article
                key={plan.id}
                className="flex flex-col rounded-[18px] bg-[#1b1b1b] p-6"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  {plan.id === "vega" && (
                    <span className="rounded-full bg-[#ffe02e]/10 px-2.5 py-1 text-xs text-[#ffe02e]">
                      Лучший выбор
                    </span>
                  )}
                </div>
                <p className="mt-5 text-3xl font-semibold tabular-nums">
                  {plan.amount.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₽{" "}
                  <span className="text-sm font-normal text-[#a5a5a1]">
                    / 30 дней
                  </span>
                </p>
                <ul className="my-6 list-disc space-y-3 pl-4 text-sm leading-6 text-[#d0d0cb] marker:text-[#ffe02e]/70">
                  <li>
                    <strong className="text-[#f3f2ee]">
                      {plan.credits.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} кредитов
                    </strong>{" "}
                    на период
                  </li>
                  <li>Генераций одновременно: {plan.concurrentRequests}</li>
                  <li>{plan.requestsPerMinute} запросов в минуту</li>
                  <li>
                    {plan.id === "nova"
                      ? "Без GPT Astra и Claude Fable"
                      : "Все модели каталога"}
                  </li>
                </ul>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => selectPlan(plan)}
                  className={`${buttonClass} mt-auto`}
                >
                  {data.current ? "Оплатить следующий период" : "Выбрать тариф"}
                </button>
              </article>
            ))}
          </div>
        </section>
        {data && data.testPeriods.length > 0 && (
          <section className="rounded-[15px] bg-[#1b1b1b] p-6">
            <h2 className="font-semibold">Тестовые покупки</h2>
            <p className="mt-2 text-sm text-[#a5a5a1]">
              Эти пакеты не дают доступ к реальным генерациям.
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {data.testPeriods.map((period) => (
                <li key={period.id}>
                  {period.planName} · {credits(period.credits)} тестовых
                  кредитов · с {date(period.startsAt)}
                </li>
              ))}
            </ul>
          </section>
        )}
        <section
          className="rounded-[15px] bg-[#1b1b1b] p-5 sm:p-6"
          aria-labelledby="subscription-history-title"
        >
          <h2
            id="subscription-history-title"
            className="text-base font-semibold"
          >
            История покупок
          </h2>
          {!data && !error && <SubscriptionHistorySkeleton />}
          {data?.orders.length === 0 && (
            <p className="mt-4 text-sm text-[#a5a5a1]">Покупок пока нет.</p>
          )}
          <ul className="mt-3 divide-y divide-white/[0.06]">
            {data?.orders.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm"
              >
                <div>
                  <p>
                    {item.planName} · {credits(item.amount)} ₽{" "}
                    {item.mode === "test" && (
                      <span className="text-[#ffe02e]">· Тест</span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-[#a5a5a1]">
                    {date(item.createdAt)} · {methodLabel(item.method)} ·{" "}
                    {statusLabel(item.status)}
                  </p>
                </div>
                {["CREATING", "PENDING"].includes(item.status) && (
                  <div className="flex flex-wrap gap-3">
                    {!item.invoiceUrl && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          const plan = data.plans.find(
                            (p) => p.id === item.planId,
                          );
                          if (plan) {
                            selectPlan(plan, item);
                          }
                        }}
                        className={buttonClass}
                      >
                        Продолжить оформление
                      </button>
                    )}
                    {item.invoiceUrl && (
                      <Button
                        asChild={!pending}
                        disabled={pending}
                        className={buttonClass}
                      >
                        {pending ? (
                          "Оплатить счёт"
                        ) : (
                          <a
                            href={item.invoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Оплатить счёт
                          </a>
                        )}
                      </Button>
                    )}
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void cancelOrder(item.id)}
                      className="min-h-11 rounded-lg px-3 text-[#a5a5a1] hover:bg-[#242424] focus-visible:ring-2 focus-visible:ring-[#ffe02e] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Отменить счёт
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
      <SubscriptionThanksModal
        open={paidOrder !== null}
        testMode={paidOrder?.mode === "test"}
        onClose={dismiss}
      />
      <ModalShell
        open={selected !== null}
        titleId="subscription-checkout-title"
        title={selected ? `Подписка ${selected.name}` : "Подписка"}
        description="Один период на 30 дней, без автопродления."
        icon={<IconSparkles aria-hidden="true" size={19} />}
        onClose={() => {
          if (!pending) setSelected(null);
        }}
      >
        {selectedMode === "test" && (
          <div
            role="status"
            className="mt-4 rounded-lg bg-[#ffe02e]/10 p-3 text-sm leading-relaxed text-[#ffe02e]"
          >
            Тестовый режим
          </div>
        )}
        <div className="mt-5">
          <PaymentMethodSelector<SubscriptionMethod>
            value={method}
            options={[
              { value: "card", label: "Карта", icon: "card", disabled: !data?.paymentModes.card },
              { value: "cryptobot", label: "CryptoBot", icon: "cryptobot", disabled: !data?.paymentModes.cryptobot },
              { value: "balance", label: `Баланс · ${credits(data?.balance ?? 0)} ₽`, icon: "balance", disabled: !data?.paymentModes.balance },
            ]}
            disabled={pending || order !== null}
            onChange={(value) => {
              setMethod(value);
              requestId.current = null;
            }}
          />
          <div className="mt-5 rounded-xl bg-[#101010] p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-[#a5a5a1]">К оплате</span>
              <strong className="text-xl tabular-nums">{credits(selected?.amount ?? 0)} ₽</strong>
            </div>
            {startsAt && (
              <p className="mt-2 text-xs text-[#a5a5a1]">
                Начало: {date(startsAt)}
              </p>
            )}
          </div>
        </div>
        {displayedOrder && (
          <p role="status" className="mt-4 text-sm text-[#a5a5a1]">
            {statusLabel(displayedOrder.status)}.{" "}
            {displayedOrder.status !== "PAID" &&
              "После оплаты статус обновится автоматически."}
          </p>
        )}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => setSelected(null)}
            className="!bg-transparent px-4 text-sm font-medium text-[#bdbdb8] hover:!bg-white/[0.06] hover:!text-[#f3f2ee]"
          >
            Отмена
          </Button>
          {displayedOrder?.status === "PAID" ? (
            <Button type="button" size="sm" onClick={() => setSelected(null)}>Готово</Button>
          ) : displayedOrder?.invoiceUrl ? (
            <Button
              asChild={!pending}
              disabled={pending}
              size="sm"
              className="px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
            >
              {pending ? (
                "Перейти к оплате"
              ) : (
                <a href={displayedOrder.invoiceUrl} target="_blank" rel="noopener noreferrer">
                  Перейти к оплате
                </a>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={pending || !selectedMode || (!!displayedOrder && displayedOrder.status !== "CREATING")}
              onClick={() => void checkout()}
              className="px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Оформляем…" : "Оплатить подписку"}
            </Button>
          )}
        </div>
      </ModalShell>
    </main>
  );
}

function methodLabel(method: string) {
  return method === "balance"
    ? "Баланс"
    : method === "card"
      ? "Банковская карта"
      : "CryptoBot";
}
function statusLabel(status: string) {
  const labels: Record<string, string> = {
    CREATING: "Счёт создаётся",
    PENDING: "Ожидает оплаты",
    PAID: "Оплачено",
    FAILED: "Ошибка оплаты",
    EXPIRED: "Счёт истёк",
    CANCELLED: "Счёт отменён",
  };
  return labels[status] ?? status;
}

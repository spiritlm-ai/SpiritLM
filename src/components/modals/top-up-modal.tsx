"use client";

import { formatBalance } from "@/lib/format-balance";
import { SUGGESTED_TOP_UP_AMOUNTS } from "@/configs/consts/dashboard.const";
import { PATHS } from "@/configs/paths/pages.paths";
import { PAYMENT_LIMITS } from "@/configs/consts/payments.const";
import type { PaymentOverview, PaymentSummary } from "@/configs/types/payments.types";
import { dashboardFetch } from "@/lib/dashboard-client";
import { IconWallet } from "@tabler/icons-react";
import toast from "react-hot-toast";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PaymentMethodSelector } from "./payment-method-selector";
import { ModalShell } from "./modal-shell";

import type { TopUpModalProps } from "@/configs/types/modals.types";

type PaymentMethod = "cryptobot" | "bank_card";

export function TopUpModal(props: TopUpModalProps) {
  const [method, setMethod] = useState<PaymentMethod>("bank_card");
  useEffect(() => {
    if (!props.open) {
      return;
    }
    if (
      ["bank_card", "sbp"].includes(
        new URLSearchParams(window.location.search).get("payment_method") ?? "",
      )
    ) {
      setMethod("bank_card");
      const url = new URL(window.location.href);
      url.searchParams.delete("payment_method");
      window.history.replaceState(window.history.state, "", url);
    }
  }, [props.open]);
  return (
    <TopUpPaymentForm
      key={method}
      {...props}
      method={method}
      onMethodChange={setMethod}
    />
  );
}

function TopUpPaymentForm({
  open,
  onClose,
  onPaid,
  method,
  onMethodChange,
}: TopUpModalProps & {
  method: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
}) {
  const card = method === "bank_card";
  const paymentsPath = card
    ? PATHS.API.DASHBOARD.YOOKASSA_PAYMENTS
    : PATHS.API.DASHBOARD.PAYMENTS;
  const paymentPath = card
    ? PATHS.API.DASHBOARD.YOOKASSA_PAYMENT
    : PATHS.API.DASHBOARD.PAYMENT;
  const [amount, setAmount] = useState("1000");
  const [overview, setOverview] = useState<PaymentOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef<string | null>(null);
  const creating = useRef(false);
  const redirectAfterCreation = useRef(false);
  const observedPayment = useRef<{ id: string; status: PaymentSummary["status"] } | null>(
    null,
  );
  const onPaidRef = useRef(onPaid);
  onPaidRef.current = onPaid;
  const payment = overview?.payment?.status === "CANCELLED"
    ? null
    : overview?.payment;
  const paymentId = payment?.id;
  const pending = payment?.status === "PENDING" || payment?.status === "CREATING";

  useEffect(() => {
    if (!open) {
      redirectAfterCreation.current = false;
      return;
    }
    const controller = new AbortController();
    setError(null);
    dashboardFetch<PaymentOverview>(paymentsPath, {
      signal: controller.signal,
    })
      .then((data) => {
        if (controller.signal.aborted) return;
        setOverview(data);
        if (data.payment) setAmount(data.payment.amount);
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            failure instanceof Error ? failure.message : "Не удалось загрузить платёж",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [open, paymentsPath]);

  useEffect(() => {
    if (!paymentId || !pending || loading || checking || cancelling)
      return;
    const controller = new AbortController();
    let timer: number | undefined;
    async function poll() {
      try {
        const data = await dashboardFetch<PaymentOverview>(paymentPath(paymentId!), {
          method: "POST",
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setOverview(data);
        setError(null);
        if (data.payment?.status !== "PENDING" && data.payment?.status !== "CREATING")
          return;
      } catch (failure) {
        if (controller.signal.aborted) return;
        setError(
          failure instanceof Error ? failure.message : "Не удалось проверить оплату",
        );
      }
      timer = window.setTimeout(() => void poll(), PAYMENT_LIMITS.POLL_MS);
    }
    void poll();
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [paymentId, pending, loading, paymentPath, checking, cancelling]);

  useEffect(() => {
    if (!open || !card || !pending || !payment?.expiresAt) return;
    const expiresAt = new Date(payment.expiresAt).getTime();
    const timer = window.setTimeout(() => {
      setOverview((previous) => {
        if (!previous?.payment || previous.payment.id !== payment.id) return previous;
        if (!["CREATING", "PENDING"].includes(previous.payment.status)) return previous;
        return {
          ...previous,
          payment: { ...previous.payment, status: "EXPIRED", invoiceUrl: null },
        };
      });
    }, Math.max(0, expiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [open, card, pending, payment]);

  useEffect(() => {
    if (!payment) return;
    const previous = observedPayment.current;
    observedPayment.current = { id: payment.id, status: payment.status };
    if (
      payment.status === "PAID" &&
      (previous?.id !== payment.id || previous.status !== "PAID")
    ) {
      if (previous?.id === payment.id) {
        toast.success(
          `Баланс пополнен на ${formatBalance(payment.amount)} ₽`,
        );
      }
      onPaidRef.current?.();
    }
  }, [payment]);

  useEffect(() => {
    if (!open || !redirectAfterCreation.current || !payment) return;
    if (payment.status === "PENDING" && payment.invoiceUrl) {
      redirectAfterCreation.current = false;
      window.location.assign(payment.invoiceUrl);
    } else if (!["CREATING", "PENDING"].includes(payment.status)) {
      redirectAfterCreation.current = false;
    }
  }, [open, payment, card]);

  async function createInvoice() {
    if (creating.current || pending || !overview) return;
    creating.current = true;
    redirectAfterCreation.current = true;
    setSubmitting(true);
    setError(null);
    requestId.current ??= crypto.randomUUID();
    try {
      const data = await dashboardFetch<{ payment: PaymentSummary }>(paymentsPath, {
        method: "POST",
        body: JSON.stringify({ amount, requestId: requestId.current }),
      });
      setOverview((previous) =>
        previous ? { ...previous, payment: data.payment } : previous,
      );
      requestId.current = null;
    } catch (failure) {
      redirectAfterCreation.current = false;
      setError(failure instanceof Error ? failure.message : "Не удалось создать счёт");
    } finally {
      creating.current = false;
      setSubmitting(false);
    }
  }

  async function checkPayment() {
    if (!payment || checking) return;
    setChecking(true);
    try {
      const data = await dashboardFetch<PaymentOverview>(paymentPath(payment.id), {
        method: "POST",
      });
      setOverview(data);
      setError(null);
      if (data.payment?.status === "PENDING" || data.payment?.status === "CREATING") {
        toast.error("Счёт пока не оплачен");
      } else if (data.payment?.status === "EXPIRED") {
        toast.error("Срок действия счёта истёк");
      }
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Не удалось проверить оплату",
      );
    } finally {
      setChecking(false);
    }
  }

  async function cancelInvoice() {
    if (!payment || cancelling) return;
    redirectAfterCreation.current = false;
    setCancelling(true);
    setError(null);
    try {
      const data = await dashboardFetch<{ payment: PaymentSummary }>(
        paymentPath(payment.id),
        { method: "DELETE" },
      );
      setOverview((previous) =>
        previous
          ? {
              ...previous,
              payment: data.payment.status === "CANCELLED" ? null : data.payment,
            }
          : previous,
      );
      requestId.current = null;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Не удалось отменить счёт");
    } finally {
      setCancelling(false);
    }
  }

  const validAmount =
    /^\d{1,6}(\.\d{1,2})?$/.test(amount) &&
    Number(amount) >= PAYMENT_LIMITS.MIN_AMOUNT &&
    Number(amount) <= PAYMENT_LIMITS.MAX_AMOUNT;

  return (
    <ModalShell
      open={open}
      titleId="top-up-title"
      title="Пополнение баланса"
      description="Выберите сумму пополнения."
      icon={<IconWallet aria-hidden="true" size={19} />}
      onClose={onClose}
    >
      <div className="mt-5">
        {overview?.mode === "test" && (
          <p className="mb-4 rounded-lg bg-[#ffe02e]/10 p-3 text-sm leading-relaxed text-[#ffe02e]">
            Тестовый режим
          </p>
        )}
        <div className="mb-5">
          <PaymentMethodSelector
            value={method}
            options={[
              { value: "bank_card", label: "Карта", icon: "card" },
              { value: "cryptobot", label: "CryptoBot", icon: "cryptobot" },
            ]}
            disabled={submitting || checking || cancelling}
            onChange={onMethodChange}
          />
        </div>
        <p className="mb-2 text-xs font-medium text-[#c6c6c1]">Сумма, ₽</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SUGGESTED_TOP_UP_AMOUNTS.map((suggestion) => (
            <Button
              key={suggestion}
              type="button"
              disabled={pending || submitting || loading}
              aria-pressed={Number(amount) === suggestion}
              variant="outline"
              size="sm"
              onClick={() => {
                setAmount(String(suggestion));
                requestId.current = null;
              }}
              className={`min-h-10 rounded-lg border border-transparent px-2 text-sm font-medium ${
                Number(amount) === suggestion
                  ? "!bg-[#ffe02e]/10 !text-[#ffe02e] hover:!border-transparent hover:!bg-[#ffe02e]/10 hover:!text-[#ffe02e]"
                  : "!bg-[#242424] !text-[#c6c6c1] hover:!border-transparent hover:!bg-[#30302e] hover:!text-[#f3f2ee]"
              }`}
            >
              {suggestion.toLocaleString("ru-RU")}
            </Button>
          ))}
        </div>
        <label
          htmlFor="top-up-amount"
          className="mb-2 mt-4 block text-xs font-medium text-[#c6c6c1]"
        >
          Или укажите другую сумму
        </label>
        <div className="relative">
          <input
            id="top-up-amount"
            type="number"
            min={PAYMENT_LIMITS.MIN_AMOUNT}
            max={PAYMENT_LIMITS.MAX_AMOUNT}
            step="0.01"
            disabled={pending || submitting || loading}
            required
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              requestId.current = null;
            }}
            className="[appearance:textfield] h-11 w-full rounded-xl bg-[#101010] px-3 pr-10 text-sm text-[#f3f2ee] outline-none focus:ring-2 focus:ring-[#ffe02e]/20 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#858580]">
            ₽
          </span>
        </div>
        {payment && payment.status !== "PAID" && (
          <div
            role="status"
            className="mt-4 rounded-xl bg-[#101010] p-3 text-sm leading-relaxed text-[#c6c6c1]"
          >
            {payment.status === "CREATING" &&
              "Уточняем статус создания счёта. Повторно создавать его не нужно. Можно закрыть окно и вернуться позже."}
            {payment.status === "PENDING" &&
              (card
                ? "Платёж создан. Оплатите его картой на странице ЮKassa — статус обновится автоматически."
                : "Счёт создан. Оплатите его в Telegram — статус обновится автоматически.")}
            {payment.status === "CANCELLED" &&
              "Счёт отменён. Для пополнения можно создать новый счёт."}
            {payment.status === "EXPIRED" &&
              "Срок действия счёта истёк. Можно создать новый счёт."}
            {payment.status === "FAILED" &&
              "Не удалось создать счёт. Проверьте настройки или попробуйте позже."}
            {payment.expiresAt && payment.status === "PENDING" && (
              <span className="mt-1 block text-xs text-[#999994]">
                Действует до{" "}
                {new Date(payment.expiresAt).toLocaleTimeString("ru-RU", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                .
              </span>
            )}
            {(pending || payment.status === "EXPIRED") && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={checking || cancelling}
                  onClick={() => void checkPayment()}
                  className="min-h-9 rounded-lg bg-[#242424]/80 px-3 text-xs text-[#c6c6c1] hover:bg-[#30302e] hover:text-[#f3f2ee] disabled:cursor-wait"
                >
                  {checking ? "Проверяем…" : "Проверить оплату"}
                </Button>
                {payment.status === "PENDING" && (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={cancelling || checking || submitting}
                    onClick={() => void cancelInvoice()}
                    className="min-h-9 rounded-lg bg-[#242424]/80 px-3 text-xs text-[#c6c6c1] hover:bg-[#30302e] hover:text-[#f3f2ee] disabled:cursor-wait"
                  >
                    {cancelling ? "Отменяем…" : "Отменить счёт"}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-300">
            {error}
          </p>
        )}
        {!validAmount && !pending && !loading && (
          <p className="mt-3 text-xs text-[#999994]">
            Введите сумму от 100 до 100 000 ₽, до двух знаков после запятой.
          </p>
        )}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="!bg-transparent px-4 text-sm font-medium text-[#bdbdb8] hover:!bg-white/[0.06] hover:!text-[#f3f2ee]"
          >
            Отмена
          </Button>
          {payment?.status === "PENDING" && payment.invoiceUrl ? (
            <Button
              asChild={!cancelling}
              disabled={cancelling}
              size="sm"
              className="rounded-lg px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
            >
              {cancelling ? (
                "Перейти к оплате"
              ) : (
                <a href={payment.invoiceUrl} target="_blank" rel="noopener noreferrer">
                  Перейти к оплате
                </a>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              disabled={loading || submitting || cancelling || checking || pending || !validAmount || !overview}
              onClick={() => void createInvoice()}
              size="sm"
              className="rounded-lg bg-[#ffe02e] px-4 text-sm font-semibold text-[#171717] transition-colors hover:bg-[#ffcc36] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1b1b1b] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
            >
              {loading
                ? "Загрузка…"
                : pending
                  ? "Уточняем статус…"
                  : submitting
                    ? "Создаём счёт…"
                    : "Пополнить"}
            </Button>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

"use client";

import type { ApiKeyFundingSettings } from "@/configs/types/subscriptions.types";
import { formatBalance } from "@/lib/format-balance";
import { PATHS } from "@/configs/paths/pages.paths";

import {
  IconCheck,
  IconCopy,
  IconKey,
  IconSettings,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { ApiKeySettingsModal } from "@/components/modals/api-key-settings-modal";
import { CreateApiKeyModal } from "@/components/modals/create-api-key-modal";
import { TopUpModal } from "@/components/modals/top-up-modal";
import { ModalShell } from "@/components/modals/modal-shell";
import type { ApiKeySummary, IssuedApiKey } from "@/configs/types/api.types";
import { dashboardFetch } from "@/lib/dashboard-client";
import { Skeleton } from "../../_components/skeleton";

export function KeysDashboard() {
  const [keys, setKeys] = useState<ApiKeySummary[]>([]);
  const [issuedSecrets, setIssuedSecrets] = useState<Record<string, string>>(
    {},
  );
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showTopUpForm, setShowTopUpForm] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [keyToDelete, setKeyToDelete] = useState<ApiKeySummary | null>(null);
  const selectedKey = keys.find((key) => key.id === editingKey);
  const totalSpent = keys.reduce((total, key) => total + Number(key.spent), 0);
  const totalRequests = keys.reduce((total, key) => total + key.requests, 0);

  useEffect(() => {
    const controller = new AbortController();
    dashboardFetch<{ keys: ApiKeySummary[] }>(PATHS.API.DASHBOARD.KEYS, {
      signal: controller.signal,
    })
      .then((data) => setKeys(data.keys))
      .catch((failure: unknown) => {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "Не удалось загрузить ключи",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  async function createKey(name: string, settings: ApiKeyFundingSettings) {
    await toast.promise(
      (async () => {
        const result = await dashboardFetch<IssuedApiKey>(
          PATHS.API.DASHBOARD.KEYS,
          { method: "POST", body: JSON.stringify({ name, ...settings }) },
        );
        setKeys((current) => [
          {
            id: result.id,
            name: result.name,
            prefix: result.prefix,
            createdAt: result.createdAt,
            lastUsedAt: null,
            requests: 0,
            spent: "0",
            subscriptionCreditsUsed: "0",
            useSubscription: result.useSubscription,
            allowBalanceFallback: result.allowBalanceFallback,
          },
          ...current,
        ]);
        setShowCreateForm(false);
        setCopied(false);
        setIssuedSecrets((current) => ({
          ...current,
          [result.id]: result.secret,
        }));
        setSecret(result.secret);
      })(),
      {
        loading: "Создаём ключ…",
        success: "Ключ создан",
        error: (failure) => failure.message,
      },
    );
  }

  async function copySecret() {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      toast.success("Ключ скопирован");
    } catch {
      toast.error("Не удалось скопировать ключ. Выделите его вручную.");
    }
  }

  async function copyKey(keyId: string) {
    const value = issuedSecrets[keyId];
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Ключ скопирован");
    } catch {
      toast.error("Не удалось скопировать ключ");
    }
  }

  function deleteKey(key: ApiKeySummary) {
    if (pendingKey) return;
    setPendingKey(key.id);
    void toast
      .promise(
        (async () => {
          await dashboardFetch(PATHS.API.DASHBOARD.KEY(key.id), {
            method: "DELETE",
          });
          setKeys((current) => current.filter((item) => item.id !== key.id));
          setKeyToDelete(null);
          setEditingKey(null);
        })(),
        {
          loading: "Отзываем ключ…",
          success: "Ключ отозван",
          error: (failure) => failure.message,
        },
      )
      .catch(() => {})
      .finally(() => setPendingKey(null));
  }

  return (
    <main
      className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8"
      aria-labelledby="dashboard-page-title"
    >
      <div className="mx-auto max-w-[1340px]">
        <section className="mb-6 rounded-[20px] border border-white/[0.04] bg-[#1b1b1b] p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1
                id="dashboard-page-title"
                className="text-2xl font-semibold tracking-tight sm:text-3xl"
              >
                API-ключи
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#a5a5a1]">
                Ключи доступа и расходы по ним.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowTopUpForm(true)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#242424] px-4 text-sm font-semibold text-[#f3f2ee] transition-colors hover:bg-[#30302e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe02e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1b1b1b]"
              >
                Пополнить
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#ffe02e] px-4 text-sm font-semibold text-[#171717] transition-[background-color,transform] duration-200 hover:bg-[#ffcc36] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe02e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1b1b1b]"
              >
                <IconPlus aria-hidden="true" size={17} stroke={1.8} />
                Создать ключ
              </button>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Metric
              label="API-ключи"
              value={loading || error ? undefined : String(keys.length)}
              loading={loading}
            />
            <Metric
              label="Расход API-баланса за месяц"
              value={loading || error ? undefined : formatRubles(totalSpent)}
              loading={loading}
            />
            <Metric
              label="Запросы за месяц"
              value={
                loading || error
                  ? undefined
                  : totalRequests.toLocaleString("ru-RU")
              }
              loading={loading}
            />
          </div>
        </section>

        <section
          className="overflow-hidden rounded-[18px] bg-[#1b1b1b]"
          aria-labelledby="keys-title"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-6">
            <div>
              <h2 id="keys-title" className="text-base font-semibold">
                Мои ключи
              </h2>
              <p className="mt-1 text-xs text-[#858580]">
                Расходы и запросы за текущий месяц
              </p>
            </div>
            <span className="rounded-full bg-white/[0.06] px-3 py-1.5 text-xs text-[#a5a5a1]">
              {loading || error ? (
                <Skeleton className="h-4 w-8" />
              ) : (
                <>
                  {keys.length}{" "}
                  {keys.length === 1
                    ? "ключ"
                    : keys.length > 1 && keys.length < 5
                      ? "ключа"
                      : "ключей"}
                </>
              )}
            </span>
          </div>

          {loading ? (
            <ul className="list-none p-0" aria-label="Загрузка ключей">
              {[0, 1, 2].map((row) => (
                <li
                  key={row}
                  className="border-t border-white/[0.06] px-5 py-4 sm:px-6"
                >
                  <div className="grid gap-4 xl:grid-cols-[minmax(220px,1.5fr)_minmax(420px,2fr)_auto] xl:items-center">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-56" />
                    <Skeleton className="h-9 w-24" />
                  </div>
                </li>
              ))}
            </ul>
          ) : error ? (
            <p className="px-5 py-8 text-sm text-[#a5a5a1]" role="alert">
              {error}
            </p>
          ) : keys.length > 0 ? (
            <ul className="list-none p-0">
              {keys.map((key) => (
                <li
                  key={key.id}
                  className="border-t border-white/[0.06] px-5 py-4 sm:px-6"
                >
                  <div className="grid gap-4 xl:grid-cols-[minmax(220px,1.5fr)_minmax(420px,2fr)_auto] xl:items-center">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#242424] text-[#bdbdb8]">
                        <IconKey aria-hidden="true" size={17} stroke={1.6} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-medium text-[#f3f2ee]">
                          {key.name}
                        </h3>
                        <p className="mt-1 truncate font-mono text-xs text-[#777875]">
                          {key.prefix}••••••••
                        </p>
                      </div>
                    </div>

                    <div>
                      <dl className="grid grid-cols-2 gap-4 rounded-xl bg-[#242424]/70 px-3 py-2.5 sm:grid-cols-4 xl:bg-transparent xl:px-0 xl:py-0">
                        <div>
                          <dt className="text-[10px] uppercase tracking-wide text-[#777875]">
                            Кредиты подписки
                          </dt>
                          <dd className="mt-1 text-sm font-medium tabular-nums text-[#f3f2ee]">
                            {formatBalance(key.subscriptionCreditsUsed)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[10px] uppercase tracking-wide text-[#777875]">
                            API-баланс
                          </dt>
                          <dd className="mt-1 text-sm font-medium tabular-nums text-[#f3f2ee]">
                            {formatRubles(Number(key.spent))}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[10px] uppercase tracking-wide text-[#777875]">
                            Запросы
                          </dt>
                          <dd className="mt-1 text-sm tabular-nums text-[#d0d0cb]">
                            {key.requests.toLocaleString("ru-RU")}
                          </dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="text-[10px] uppercase tracking-wide text-[#777875]">
                            Последнее использование
                          </dt>
                          <dd className="mt-1 text-xs text-[#d0d0cb]">
                            {key.lastUsedAt
                              ? new Date(key.lastUsedAt).toLocaleString("ru-RU")
                              : "Ещё не использовался"}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="flex items-center gap-1 xl:justify-end">
                      {issuedSecrets[key.id] ? (
                        <button
                          type="button"
                          onClick={() => void copyKey(key.id)}
                          aria-label={`Скопировать ключ ${key.name}`}
                          title="Скопировать ключ"
                          className="inline-flex size-10 items-center justify-center rounded-lg text-[#999994] transition-colors hover:bg-white/[0.07] hover:text-[#f3f2ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe02e]"
                        >
                          <IconCopy aria-hidden="true" size={17} />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={pendingKey !== null}
                        onClick={() => setEditingKey(key.id)}
                        aria-label={`Настройки ключа ${key.name}`}
                        title="Настройки ключа"
                        className="inline-flex size-10 items-center justify-center rounded-lg text-[#999994] transition-colors hover:bg-white/[0.07] hover:text-[#f3f2ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe02e]"
                      >
                        <IconSettings aria-hidden="true" size={18} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="border-t border-white/[0.06] px-5 py-12 text-center sm:px-6">
              <p className="text-sm font-medium">Пока нет API-ключей</p>
              <p className="mt-1 text-xs text-[#858580]">
                Создайте ключ, чтобы начать работу.
              </p>
            </div>
          )}
        </section>
      </div>

      {selectedKey && (
        <ApiKeySettingsModal
          key={selectedKey.id}
          apiKey={selectedKey}
          onClose={() => setEditingKey(null)}
          onSaved={(updated) => {
            setKeys((current) =>
              current.map((key) => key.id === updated.id ? updated : key),
            );
            setEditingKey(null);
          }}
          onDelete={(key) => {
            setEditingKey(null);
            setKeyToDelete(key);
          }}
        />
      )}
      <ModalShell
        open={secret !== null}
        titleId="new-secret-title"
        title="Сохраните API-ключ"
        description="Он показывается один раз. После закрытия восстановить секрет нельзя — можно создать новый ключ."
        icon={<IconKey aria-hidden="true" size={19} />}
        onClose={() => setSecret(null)}
      >
        <label htmlFor="new-api-secret" className="sr-only">
          Новый API-ключ
        </label>
        <input
          id="new-api-secret"
          readOnly
          value={secret ?? ""}
          onFocus={(event) => event.target.select()}
          className="mt-5 h-12 w-full rounded-xl bg-[#101010] px-3 font-mono text-xs text-[#f3f2ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe02e]"
        />
        <button
          type="button"
          onClick={() => void copySecret()}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#ffe02e] px-4 py-2 text-sm font-semibold text-[#171717] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe02e]"
        >
          {copied ? (
            <IconCheck aria-hidden="true" size={16} />
          ) : (
            <IconCopy aria-hidden="true" size={16} />
          )}
          {copied ? "Скопировано" : "Скопировать"}
        </button>
      </ModalShell>
      <CreateApiKeyModal
        open={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onCreate={createKey}
      />
      <TopUpModal
        open={showTopUpForm}
        onClose={() => setShowTopUpForm(false)}
      />
      <ModalShell
        open={keyToDelete !== null}
        titleId="delete-key-title"
        title="Удалить API-ключ?"
        description={
          keyToDelete
            ? `Ключ «${keyToDelete.name}» будет отозван. Все приложения, использующие его, потеряют доступ. Это действие нельзя отменить.`
            : ""
        }
        icon={<IconTrash aria-hidden="true" size={19} />}
        onClose={() => {
          if (!pendingKey) setKeyToDelete(null);
        }}
      >
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={pendingKey !== null}
            onClick={() => setKeyToDelete(null)}
            className="inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-medium text-[#bdbdb8] transition-colors hover:bg-white/[0.06] hover:text-[#f3f2ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe02e] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={pendingKey !== null || keyToDelete === null}
            onClick={() => {
              if (keyToDelete) deleteKey(keyToDelete);
            }}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#e05a5a] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#ef6969] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8585] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <IconTrash aria-hidden="true" size={16} />
            {pendingKey === keyToDelete?.id ? "Удаляем…" : "Удалить ключ"}
          </button>
        </div>
      </ModalShell>
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

function formatRubles(value: number) {
  return `₽ ${formatBalance(value)}`;
}

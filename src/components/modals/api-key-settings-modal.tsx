"use client";

import { IconSettings, IconTrash } from "@tabler/icons-react";
import { useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PATHS } from "@/configs/paths/pages.paths";
import type { ApiKeySummary } from "@/configs/types/api.types";
import { dashboardFetch } from "@/lib/dashboard-client";
import { ModalShell } from "./modal-shell";

export function ApiKeySettingsModal({
  apiKey,
  onClose,
  onSaved,
  onDelete,
}: {
  apiKey: ApiKeySummary;
  onClose: () => void;
  onSaved: (key: ApiKeySummary) => void;
  onDelete: (key: ApiKeySummary) => void;
}) {
  const [name, setName] = useState(apiKey.name);
  const [useSubscription, setUseSubscription] = useState(apiKey.useSubscription);
  const [allowBalanceFallback, setAllowBalanceFallback] = useState(
    apiKey.allowBalanceFallback,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !name.trim()) return;
    setPending(true);
    setError(null);
    const settings = {
      name: name.trim(),
      useSubscription,
      allowBalanceFallback,
    };
    try {
      await dashboardFetch(PATHS.API.DASHBOARD.KEY(apiKey.id), {
        method: "PATCH",
        body: JSON.stringify(settings),
      });
      toast.success("Настройки ключа сохранены");
      onSaved({ ...apiKey, ...settings });
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Не удалось сохранить настройки",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <ModalShell
      open
      titleId="key-settings-title"
      title="Настройки API-ключа"
      description="Название и способ оплаты запросов."
      icon={<IconSettings aria-hidden="true" size={19} />}
      onClose={() => {
        if (!pending) onClose();
      }}
    >
      <form onSubmit={save} className="mt-5">
        <label htmlFor="key-settings-name" className="mb-2 block text-xs font-medium text-[#c6c6c1]">
          Название ключа
        </label>
        <input
          id="key-settings-name"
          autoFocus
          required
          maxLength={48}
          disabled={pending}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="h-11 w-full rounded-xl bg-[#101010] px-3 text-sm outline-none focus:ring-2 focus:ring-[#ffe02e]/40"
        />
        <div className="mt-5 space-y-3">
          <label htmlFor="key-settings-subscription" className="flex min-h-11 items-center justify-between gap-4 text-sm">
            Использовать подписку
            <Switch
              id="key-settings-subscription"
              checked={useSubscription}
              disabled={pending}
              onCheckedChange={(checked) => {
                setUseSubscription(checked);
                if (!checked) setAllowBalanceFallback(false);
              }}
            />
          </label>
          <label htmlFor="key-settings-fallback" className="flex min-h-11 items-center justify-between gap-4 text-sm text-[#a5a5a1]">
            Использовать баланс, если пакета не хватит
            <Switch
              id="key-settings-fallback"
              checked={allowBalanceFallback}
              disabled={pending || !useSubscription}
              onCheckedChange={setAllowBalanceFallback}
            />
          </label>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-[#ffb3a9]">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => onDelete(apiKey)}
            className="gap-2 rounded-lg !bg-[#e05a5a]/[0.08] px-3 !text-[#ff8585] hover:!bg-[#e05a5a]/15 hover:!text-[#ffaaaa]"
          >
            <IconTrash aria-hidden="true" size={17} stroke={1.5} className="shrink-0" />
            Удалить
          </Button>
          <Button type="submit" disabled={pending || !name.trim()}>
            {pending ? "Сохраняем…" : "Сохранить"}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

"use client";

import { formatBalance } from "@/lib/format-balance";
import Link from "next/link";
import { PATHS } from "@/configs/paths/pages.paths";
import { useSubscription } from "./use-subscription";

export function SubscriptionCard() {
  const { data, error } = useSubscription();
  return (
    <section
      className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[15px] bg-[#1b1b1b] p-5"
      aria-label="Подписка"
    >
      <div>
        <p className="font-medium">
          {data?.current ? `Spirit ${data.current.planName}` : "Подписка"}
        </p>
        <p className="mt-1 text-sm text-[#a5a5a1]">
          {error
            ? "Не удалось загрузить подписку"
            : !data
              ? "Загружаем…"
              : data.current
                ? `Доступно ${formatBalance(data.current.remainingCredits)} кредитов`
                : "Пакеты кредитов для регулярной работы"}
        </p>
      </div>
      <Link
        href={PATHS.DASHBOARD.SUBSCRIPTION}
        className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm text-[#ffe02e] hover:bg-[#242424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe02e]"
      >
        Управление подпиской →
      </Link>
    </section>
  );
}

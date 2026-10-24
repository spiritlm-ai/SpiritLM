import { formatBalance } from "@/lib/format-balance";
import type { SubscriptionOverview } from "@/configs/types/subscriptions.types";

export function SubscriptionStatus({ data }: { data: SubscriptionOverview }) {
  const current = data.current;
  const total = Number(current?.credits ?? 0);
  const available = Number(current?.remainingCredits ?? 0);
  const reserved = Number(current?.reservedCredits ?? 0);
  const spent = Math.max(0, total - available - reserved);
  const usedPercent = total ? Math.min(100, (spent / total) * 100) : 0;
  const reservedPercent = total
    ? Math.min(100 - usedPercent, (reserved / total) * 100)
    : 0;
  return (
    <section
      aria-labelledby="subscription-status-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[#a5a5a1]">Текущий тариф</p>
          <h2
            id="subscription-status-title"
            className="mt-1 text-2xl font-semibold"
          >
            {current ? `${current.planName.replace(/^Access:\s*/, "")}` : "Подписка не подключена"}
          </h2>
          <p className="mt-2 text-sm text-[#a5a5a1]">
            {current
              ? `Действует до ${date(current.endsAt)}`
              : ""}
          </p>
        </div>
        <span className="rounded-full bg-[#242424] px-3 py-2 text-xs text-[#d0d0cb]">
          {current ? "Активна" : "Без подписки"}
        </span>
      </div>
      {current && (
        <div className="mt-7">
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <p>
              Использовано{" "}
              <span className="tabular-nums">
                {credits(spent)} из {credits(total)}
              </span>{" "}
              кредитов
            </p>
            <p className="text-[#a5a5a1]">
              Доступно:{" "}
              <span className="text-[#f3f2ee] tabular-nums">
                {credits(available)}
              </span>
            </p>
          </div>
          <div
            role="progressbar"
            aria-label="Расход кредитов подписки"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={spent}
            aria-valuetext={`Использовано ${credits(spent)}, зарезервировано ${credits(reserved)}, доступно ${credits(available)} кредитов`}
            className="mt-3 flex h-3 overflow-hidden rounded-full bg-[#30302e]"
          >
            <div
              className="bg-[#ffe02e]"
              style={{ width: `${usedPercent}%` }}
            />
            <div
              className="bg-[#a5a5a1]"
              style={{ width: `${reservedPercent}%` }}
            />
          </div>
          <p className="mt-2 text-xs leading-5 text-[#a5a5a1]">
            В резерве: {credits(reserved)} кредитов.
          </p>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-[#a5a5a1]">
                Одновременные генерации
              </dt>
              <dd className="mt-1 tabular-nums">
                {data.running} / {current.concurrentRequests}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#a5a5a1]">
                Запросы за последние 60 секунд
              </dt>
              <dd className="mt-1 tabular-nums">
                {data.recent} / {current.requestsPerMinute}
              </dd>
            </div>
          </dl>
        </div>
      )}
      {data.upcoming.length > 0 && (
        <div className="mt-6 space-y-2 rounded-xl bg-[#242424] p-4">
          {data.upcoming.map((period) => (
            <p key={period.id} className="text-sm">
              Оплачено: <strong>{period.planName}</strong> · с{" "}
              {date(period.startsAt)} до {date(period.endsAt)}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}

export function credits(value: number | string) {
  return formatBalance(value);
}
export function date(value: string) {
  return new Date(value).toLocaleString("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

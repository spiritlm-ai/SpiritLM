import { Skeleton } from "../../_components/skeleton";

export function SubscriptionStatusSkeleton() {
  return (
    <div role="status" aria-label="Загрузка подписки">
      <p className="text-sm text-[#a5a5a1]">Текущий тариф</p>
      <Skeleton className="mt-1 h-8 w-48 max-w-full" />
      <Skeleton className="mt-2 h-5 w-36" />
    </div>
  );
}

export function SubscriptionPlansSkeleton() {
  return (
    <div
      role="status"
      aria-label="Загрузка тарифов"
      className="grid gap-4 lg:grid-cols-3"
    >
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="flex min-h-[340px] flex-col rounded-[18px] bg-[#1b1b1b] p-6"
        >
          <Skeleton className="h-7 w-24" />
          <Skeleton className="mt-5 h-9 w-40" />
          <ul className="my-6 space-y-3">
            {[0, 1, 2, 3].map((point) => (
              <li key={point} className="flex items-center gap-3">
                <Skeleton className="size-1.5 shrink-0 rounded-full" />
                <Skeleton className="h-5 w-full" />
              </li>
            ))}
          </ul>
          <Skeleton className="mt-auto h-11 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export function SubscriptionHistorySkeleton() {
  return (
    <div
      role="status"
      aria-label="Загрузка истории покупок"
      className="mt-3 space-y-4 py-4"
    >
      <Skeleton className="h-5 w-56 max-w-full" />
      <Skeleton className="h-5 w-40 max-w-full" />
    </div>
  );
}

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SUBSCRIPTION_PLANS } from "@/configs/consts/subscriptions.const";
import { PATHS } from "@/configs/paths/pages.paths";

const plans = Object.values(SUBSCRIPTION_PLANS);

export function Pricing() {
  return (
    <section className="bg-spirit-section" id="pricing">
      <div className="mx-auto max-w-5xl px-5 py-14 sm:px-7 lg:px-10 lg:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-heading text-4xl font-bold leading-tight tracking-tighter text-balance sm:text-5xl">
            SpiritLM Access
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-spirit-muted sm:text-base">
            Подписка на 30 дней с кредитами на запросы к моделям и лимитами API.
          </p>
        </div>

        <div className="mt-9 grid gap-4 md:grid-cols-3 lg:mt-11">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={
                "flex flex-col rounded-[18px] p-5 sm:p-6 " +
                (plan.id === "vega" ? "bg-[#242319]" : "bg-spirit-surface")
              }
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-semibold text-spirit-text">
                  {plan.name}
                </h3>
                {plan.id === "vega" && (
                  <span className="text-xs font-medium text-[#ffe02e]">
                    Популярный
                  </span>
                )}
              </div>
              <p className="mt-4 text-3xl font-semibold tabular-nums text-spirit-text">
                {plan.amount.toLocaleString("ru-RU")} ₽
                <span className="ml-1 text-sm font-normal text-spirit-muted">
                  / 30 дней
                </span>
              </p>
              <ul className="mt-5 flex-1 list-disc space-y-2 pl-5 text-sm leading-6 text-spirit-muted marker:text-[#ffe02e]">
                <li className="pl-1">
                  <span className="font-semibold text-spirit-text">
                    {plan.credits.toLocaleString("ru-RU")} кредитов
                  </span>{" "}
                  на запросы
                </li>
                <li className="pl-1">
                  До {plan.concurrentRequests} параллельных запросов
                </li>
                <li className="pl-1">{plan.requestsPerMinute} запросов в минуту</li>
                <li className="pl-1">
                  {plan.id === "nova"
                    ? "Без GPT Astra и Claude Fable"
                    : "Все модели каталога"}
                </li>
              </ul>
              <Button
                asChild
                className="mt-6 w-full rounded-lg"
                variant={plan.id === "vega" ? "default" : "ghost"}
              >
                <Link href={PATHS.DASHBOARD.SUBSCRIPTION}>Выбрать тариф</Link>
              </Button>
            </article>
          ))}
        </div>

        <p className="mt-5 text-center text-xs leading-5 text-spirit-muted">
          1 кредит = 1 ₽ по тарифам API. Без автопродления, остаток сгорает
          через 30 дней.
        </p>
      </div>
    </section>
  );
}

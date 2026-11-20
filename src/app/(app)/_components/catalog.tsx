import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PATHS } from "@/configs/paths/pages.paths";
import type { ModelGroup } from "@/configs/types/models.types";

export function Catalog({ groups }: { groups: ModelGroup[] }) {
  return (
    <section id="models" className="bg-spirit-section">
      <div className="mx-auto max-w-5xl px-5 py-14 sm:px-7 lg:px-10 lg:py-16">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-5">
          <h2 className="font-heading text-4xl font-bold leading-tight tracking-tighter text-balance sm:text-5xl">
            Выберите модель
          </h2>
          <div className="text-sm text-spirit-muted">
            <p className="m-0">Расчётные цены за 1 MTok</p>
            <Link
              href={PATHS.DASHBOARD.MODELS}
              className="mt-1 inline-block rounded font-medium underline underline-offset-4 hover:text-spirit-text focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffe02e]"
            >
              Полный каталог моделей
            </Link>
          </div>
        </div>

        <div className="grid gap-8 lg:gap-10">
          {groups.map((group) => (
            <section key={group.provider}>
              <div className="mb-4 flex items-center gap-3">
                <Image
                  src={group.icon}
                  alt=""
                  width={30}
                  height={30}
                  aria-hidden="true"
                  className={`size-[30px] object-contain ${
                    group.provider === "anthropic" || group.provider === "xai" ? "invert" : ""
                  }`}
                />
                <h3 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
                  {group.name}
                </h3>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {group.models
                  .slice(0, 3)
                  .map((model) => (
                    <Card
                      className="flex min-h-48 flex-col rounded-[20px] bg-[#1b1b1b] p-5 transition duration-200 hover:bg-spirit-surface-hover sm:p-6"
                      key={model.id}
                    >
                      <h4 className="mb-3 break-words text-base font-semibold tracking-tight sm:text-lg">
                        {model.name}
                      </h4>
                      <div className="mb-4 flex items-center gap-2 self-start rounded-full bg-[#303943] px-2.5 py-1 text-xs text-[#d7dde5]">
                        <Image
                          src={
                            group.provider === "openai"
                              ? group.icon
                              : group.modelProviderIcon
                          }
                          alt=""
                          width={15}
                          height={15}
                          aria-hidden="true"
                          className="size-[15px] rounded-full object-contain"
                        />
                        {group.modelProviderName}
                      </div>
                      <p className="mb-0 mt-auto flex items-baseline justify-between gap-2 text-sm">
                        <span className="text-spirit-muted">Цена за 1 MTok</span>
                        <span className="font-semibold tabular-nums text-spirit-text">
                          {model.pricePerMillionTokens}
                        </span>
                      </p>
                    </Card>
                  ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}

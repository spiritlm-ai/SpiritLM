import Image from "next/image";
import { MODEL_GROUPS } from "../../../configs/consts/models.const";
import { Card } from "@/components/ui/card";
import { IMAGES } from "@/configs/paths/images.paths";

export function Catalog() {
  return (
    <section id="models" className="bg-spirit-section">
      <div className="mx-auto max-w-5xl px-5 py-14 sm:px-7 lg:px-10 lg:py-16">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-5">
          <h2 className="font-heading text-4xl font-bold leading-tight tracking-tighter text-balance sm:text-5xl">
            Выберите модель
          </h2>
          <p className="m-0 text-sm text-spirit-muted">
            Предварительные цены за 1 MTok
          </p>
        </div>

        <div className="grid gap-8 lg:gap-10">
          {MODEL_GROUPS.filter((group) =>
            ["anthropic", "openai"].includes(group.provider),
          ).map((group) => (
            <section key={group.provider}>
              <div className="mb-4 flex items-center gap-3">
                <Image
                  src={group.provider === "anthropic" ? IMAGES.AI.ANTHROPIC : group.icon}
                  alt=""
                  width={30}
                  height={30}
                  aria-hidden="true"
                  className={`size-[30px] object-contain ${
                    group.provider === "anthropic" ? "invert" : ""
                  }`}
                />
                <h3 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
                  {group.name}
                </h3>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {group.models
                  .filter((model) =>
                    group.provider === "anthropic"
                      ? [
                          "anthropic/claude-opus-5.5",
                          "anthropic/claude-sonnet-5.5",
                          "anthropic/claude-haiku-5.5",
                        ].includes(model.id)
                      : [
                          "openai/gpt-6-astra",
                          "openai/gpt-6.1-sol",
                          "openai/gpt-6-luna",
                        ].includes(model.id),
                  )
                  .map((model) => (
                    <Card
                      className="flex min-h-48 flex-col rounded-[20px] bg-[#1b1b1b] p-5 transition duration-200 hover:bg-spirit-surface-hover sm:p-6"
                      key={model.id}
                    >
                      <h4 className="mb-3 truncate text-base font-semibold tracking-tight sm:text-lg">
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
        <div className="mt-8 flex flex-col gap-4 rounded-[20px] bg-[#151515] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="m-0 text-sm font-medium text-spirit-text">
            И ещё 3 провайдера
          </p>
          <div className="flex flex-wrap gap-2" aria-label="DeepSeek, Google и xAI">
            {[
              { name: "DeepSeek", image: IMAGES.AI.DEEPSEEK },
              { name: "Google", image: IMAGES.AI.GOOGLE },
              { name: "xAI", image: IMAGES.AI.XAI, invert: true },
            ].map((provider) => (
              <span
                className="inline-flex items-center gap-2 rounded-full bg-[#242424] px-3 py-2 text-xs font-medium text-[#d7dde5]"
                key={provider.name}
              >
                <Image
                  src={provider.image}
                  alt=""
                  width={18}
                  height={18}
                  aria-hidden="true"
                  className={`size-[18px] object-contain ${
                    provider.invert ? "invert" : ""
                  }`}
                />
                {provider.name}
              </span>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}

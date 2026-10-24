import Image from "next/image";
import { AGENTS } from "@/configs/consts/agents.const";

export function Agents() {
  return (
    <section id="agents">
      <div className="mx-auto max-w-5xl px-5 py-14 sm:px-7 lg:px-10 lg:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-heading text-4xl font-bold leading-tight tracking-tighter text-balance sm:text-5xl">
            Поддерживаем все популярные агенты и среды
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-spirit-muted sm:text-base">
            Подключайте SpiritLM к привычным инструментам и работайте с моделями
            через единый API.
          </p>
        </div>

        <ul className="mx-auto mt-10 flex max-w-5xl flex-wrap items-center justify-center gap-x-6 gap-y-6 sm:gap-x-9 lg:mt-12">
          {AGENTS.map((agent) => (
            <li
              key={agent.name}
              className="flex min-w-20 flex-col items-center gap-2 text-center"
            >
              <Image
                src={agent.image}
                alt=""
                aria-hidden="true"
                width={48}
                height={48}
                className={`size-9 object-contain sm:size-10 ${
                  "invert" in agent && agent.invert ? "invert" : ""
                }`}
              />
              <span className="text-sm font-medium text-spirit-text">
                {agent.name}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

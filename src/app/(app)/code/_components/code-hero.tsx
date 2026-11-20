import { IconArrowDown, IconArrowUpRight } from "@tabler/icons-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { IMAGES } from "@/configs/paths/images.paths";
import { LINKS } from "@/configs/paths/links.paths";
import { PATHS } from "@/configs/paths/pages.paths";

export function CodeHero() {
  return (
    <section aria-labelledby="code-title">
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-12 sm:px-7 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-10 lg:px-10 lg:py-24">
        <div>
          <h1
            id="code-title"
            className="flex items-center gap-3 font-heading text-5xl leading-none font-bold tracking-tighter sm:text-6xl"
          >
            <Image
              src={IMAGES.ICON}
              alt=""
              width={157}
              height={154}
              className="size-11 shrink-0 object-contain sm:size-14"
            />
            SpiritCode
          </h1>
          <p className="mt-5 max-w-sm text-base leading-relaxed text-pretty text-spirit-muted sm:text-lg">
            Работайте с моделями SpiritLM прямо в терминале. Опишите задачу, и SpiritCode
            найдёт нужные файлы, внесёт правки и покажет изменения.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3 lg:mt-8">
            <Button asChild size="lg" className="transition-none active:scale-100">
              <a href={PATHS.CODE.GET_STARTED}>
                Установить
                <IconArrowDown aria-hidden="true" size={17} stroke={1.8} />
              </a>
            </Button>
            <Button asChild size="lg" variant="ghost" className="transition-none active:scale-100">
              <a href={LINKS.SPIRITCODE_PYPI}>
                PyPI
                <IconArrowUpRight aria-hidden="true" size={16} stroke={1.7} />
              </a>
            </Button>
          </div>
        </div>
        <Image
          src={IMAGES.SPRT}
          alt="Интерфейс SpiritCode в терминале"
          width={1057}
          height={569}
          unoptimized
          priority
          className="h-auto w-full rounded-[15px]"
        />
      </div>
    </section>
  );
}

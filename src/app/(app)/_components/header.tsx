import Image from "next/image";
import Link from "next/link";
import { IMAGES } from "../../../configs/paths/images.paths";
import { PATHS } from "../../../configs/paths/pages.paths";
import { Button } from "@/components/ui/button";
import { Icon } from "./icon";

export function Header() {
  return (
    <section>
      <div className="mx-auto grid max-w-5xl gap-6 px-5 py-12 sm:px-7 lg:grid-cols-2 lg:items-center lg:gap-8 lg:px-10 lg:py-16">
        <div className="relative z-10 max-w-xl">
        <h1 className="mb-4 font-heading text-5xl font-bold leading-none tracking-tighter text-balance sm:text-6xl lg:mb-5 lg:text-6xl">
          Одна точка входа
          <br />
          в мир ИИ.
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-spirit-muted sm:text-lg">
          Подключайте Claude и GPT через единый API — без лишних интеграций.
        </p>
        <Button asChild size="lg" className="mt-6 lg:mt-8">
          <Link href={PATHS.DASHBOARD.ROOT}>
            Начать работу
            <Icon name="arrow" size={17} />
          </Link>
        </Button>
        </div>

        <div className="relative grid min-h-96 place-items-center lg:min-h-0" aria-label="SpiritLM объединяет модели искусственного интеллекта">
          <div className="relative h-96 w-full max-w-md sm:h-[28rem] sm:max-w-lg lg:h-[32rem]">
            <Image src={IMAGES.IMAGES.LANDING} alt="Маскот SpiritLM с символами ИИ" fill priority sizes="(max-width: 40rem) 90vw, 46vw" className="object-contain drop-shadow-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
}

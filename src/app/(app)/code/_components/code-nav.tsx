import Image from "next/image";
import Link from "next/link";
import { IMAGES } from "@/configs/paths/images.paths";
import { PATHS } from "@/configs/paths/pages.paths";
import { AccountNavActions } from "../../_components/account-nav-actions";

export function CodeNav() {
  return (
    <header className="bg-spirit-header">
      <a
        href="#code-content"
        className="sr-only z-20 rounded-lg bg-spirit-accent px-4 py-3 text-spirit-accent-ink focus:not-sr-only focus:absolute focus:top-3 focus:left-3"
      >
        Перейти к содержимому
      </a>
      <nav
        aria-label="Навигация по SpiritCode"
        className="mx-auto grid min-h-14 max-w-5xl grid-cols-[1fr_auto] items-center gap-x-3 px-5 sm:px-7 md:grid-cols-[1fr_auto_1fr] lg:px-10"
      >
        <Link
          href={PATHS.HOME}
          aria-label="SpiritLM — главная"
          className="group inline-flex min-h-11 w-fit items-center gap-2 rounded-md text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-spirit-accent"
        >
          <Image src={IMAGES.ICON} alt="" width={26} height={26} />
          <span>SpiritLM</span>
          <span aria-hidden="true" className="px-0.5 text-spirit-quiet max-[360px]:hidden">/</span>
          <span className="font-medium text-spirit-muted group-hover:text-spirit-text max-[360px]:hidden">
            Code
          </span>
        </Link>
        <div className="hidden gap-7 text-sm text-spirit-muted md:flex">
          <a
            href={PATHS.CODE.FEATURES}
            className="inline-flex min-h-11 items-center rounded-md hover:text-spirit-text focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-spirit-accent"
          >
            Возможности
          </a>
          <a
            href={PATHS.CODE.GET_STARTED}
            className="inline-flex min-h-11 items-center rounded-md hover:text-spirit-text focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-spirit-accent"
          >
            Быстрый старт
          </a>
        </div>
        <div className="flex items-center gap-2 justify-self-end [&_[data-slot=button]]:transition-none [&_[data-slot=button]]:active:scale-100">
          <AccountNavActions />
        </div>
      </nav>
    </header>
  );
}

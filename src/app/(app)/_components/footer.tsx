import Image from "next/image";
import { LINKS } from "../../../configs/paths/links.paths";
import { IMAGES } from "../../../configs/paths/images.paths";

export function Footer() {
  return (
    <footer className="mx-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 px-0 py-8 text-xs sm:mx-7 lg:mx-10">
      <Image
        src={IMAGES.LOGO}
        alt="SpiritLM"
        width={100}
        height={40}
      />
      <nav className="flex flex-wrap items-center gap-x-5 gap-y-2" aria-label="Связаться с SpiritLM">
        <a
          className="text-spirit-muted transition-colors hover:text-spirit-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spirit-accent focus-visible:ring-offset-2 focus-visible:ring-offset-spirit-canvas"
          href={LINKS.TELEGRAM_CHANNEL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Telegram-канал
        </a>
        <a
          className="text-spirit-muted transition-colors hover:text-spirit-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spirit-accent focus-visible:ring-offset-2 focus-visible:ring-offset-spirit-canvas"
          href={LINKS.TELEGRAM_SUPPORT}
          target="_blank"
          rel="noopener noreferrer"
        >
          Поддержка
        </a>
      </nav>
      <small className="whitespace-nowrap text-xs text-spirit-quiet">© SpiritLM 2026</small>
    </footer>
  );
}

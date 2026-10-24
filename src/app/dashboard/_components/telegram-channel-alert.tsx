"use client";

import Image from "next/image";
import { IconX } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { IMAGES } from "@/configs/paths/images.paths";
import { LINKS } from "@/configs/paths/links.paths";

const DISMISSED_KEY = "spiritlm:telegram-channel-alert-dismissed";

export function TelegramChannelAlert() {
  const [isVisible, setIsVisible] = useState(false);
  const [hasCheckedStorage, setHasCheckedStorage] = useState(false);

  useEffect(() => {
    setIsVisible(window.localStorage.getItem(DISMISSED_KEY) !== "true");
    setHasCheckedStorage(true);
  }, []);

  function dismissAlert() {
    window.localStorage.setItem(DISMISSED_KEY, "true");
    setIsVisible(false);
  }

  if (!hasCheckedStorage || !isVisible) {
    return null;
  }

  return (
    <aside
      className="sticky top-12 z-30 flex w-full items-center gap-2 bg-[#4f9ee6] py-2 pl-3 pr-12 text-sm text-white shadow-lg shadow-black/25 sm:pl-4"
      aria-label="Telegram-канал SpiritLM"
    >
      <Image
        src={IMAGES.IMAGES.TELEGRAM}
        alt=""
        width={22}
        height={22}
        className="size-[22px] shrink-0"
        aria-hidden="true"
      />
      <p className="min-w-0 text-left leading-5 text-white">
        Новости и обновления SpiritLM — в нашем{" "}
        <a
          href={LINKS.TELEGRAM_CHANNEL}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-white transition-colors hover:text-white/80 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Telegram-канале
        </a>
      </p>
      <button
        type="button"
        onClick={dismissAlert}
        className="absolute right-1 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label="Закрыть уведомление о Telegram-канале"
      >
        <IconX className="size-4" stroke={1.8} aria-hidden="true" />
      </button>
    </aside>
  );
}

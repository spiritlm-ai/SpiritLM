"use client";

import { IconCheck, IconCopy } from "@tabler/icons-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SPIRITCODE_INSTALL_COMMAND } from "@/configs/consts/spiritcode.const";
import { IMAGES } from "@/configs/paths/images.paths";
import { LINKS } from "@/configs/paths/links.paths";

export function SpiritCode() {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  useEffect(() => {
    if (!copied) return;

    const timeout = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(SPIRITCODE_INSTALL_COMMAND);
      setCopied(true);
      setCopyFailed(false);
    } catch {
      setCopied(false);
      setCopyFailed(true);
    }
  }

  return (
    <section aria-labelledby="spiritcode-title">
      <div className="mx-auto grid max-w-5xl gap-8 px-5 py-10 sm:px-7 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-10 lg:px-10 lg:py-12">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <Image
              src={IMAGES.ICON}
              alt=""
              aria-hidden="true"
              width={44}
              height={44}
              className="size-11 object-contain"
            />
            <h2
              id="spiritcode-title"
              className="font-heading text-4xl font-bold leading-tight tracking-tighter sm:text-5xl"
            >
              SpiritCode
            </h2>
          </div>
          <p className="mt-3 max-w-sm text-base leading-relaxed text-pretty text-spirit-muted">
            Наш кодинг-агент для работы с моделями SpiritLM в терминале.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex min-h-12 max-w-full items-center gap-3 rounded-xl bg-spirit-surface py-1 pr-1 pl-4">
              <code className="min-w-0 break-words text-sm leading-6 text-spirit-text">
                <span aria-hidden="true" className="select-none text-spirit-accent">$ </span>
                {SPIRITCODE_INSTALL_COMMAND}
              </code>
              <button
                type="button"
                onClick={() => void copyCommand()}
                aria-label={copied ? "Команда скопирована" : "Скопировать команду установки"}
                title={copied ? "Скопировано" : "Копировать"}
                className="relative inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-spirit-muted transition-colors duration-150 hover:bg-spirit-surface-hover hover:text-spirit-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spirit-accent"
              >
                <IconCopy
                  aria-hidden="true"
                  size={18}
                  stroke={1.5}
                  className={`transition-opacity duration-150 motion-reduce:transition-none ${copied ? "opacity-0" : "opacity-100"}`}
                />
                <IconCheck
                  aria-hidden="true"
                  size={18}
                  stroke={1.5}
                  className={`absolute text-spirit-accent transition-opacity duration-150 motion-reduce:transition-none ${copied ? "opacity-100" : "opacity-0"}`}
                />
              </button>
            </div>
            <Button asChild size="lg" variant="ghost">
              <a
                href={LINKS.SPIRITCODE_PYPI}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="SpiritCode на PyPI (откроется в новой вкладке)"
              >
                PyPI
              </a>
            </Button>
          </div>
          <p role="status" className={copyFailed ? "mt-2 text-sm text-spirit-muted" : "sr-only"}>
            {copyFailed
              ? "Не удалось скопировать. Выделите команду и скопируйте вручную."
              : copied ? "Команда скопирована" : ""}
          </p>
        </div>
        <div className="min-w-0 overflow-hidden rounded-xl bg-spirit-surface">
          <div aria-hidden="true" className="flex h-11 items-center gap-2 px-4">
            <span className="size-2.5 rounded-full bg-[#ff5f57]" />
            <span className="size-2.5 rounded-full bg-[#febc2e]" />
            <span className="size-2.5 rounded-full bg-[#28c840]" />
          </div>
          <Image
            src={IMAGES.IMAGES.SPIRITCODE}
            alt="SpiritCode: открытый кодинг-агент в терминале"
            width={693}
            height={407}
          />
        </div>
      </div>
    </section>
  );
}

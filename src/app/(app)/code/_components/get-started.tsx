import { IconArrowRight, IconBook2 } from "@tabler/icons-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  SPIRITCODE_INSTALL_COMMAND,
  SPIRITCODE_LAUNCH_COMMAND,
} from "@/configs/consts/spiritcode.const";
import { PATHS } from "@/configs/paths/pages.paths";
import { CommandLine } from "./command-line";

export function GetStarted() {
  return (
    <section
      id={PATHS.CODE.GET_STARTED.slice(1)}
      aria-labelledby="code-start-title"
      className="scroll-mt-8"
    >
      <div className="mx-auto grid max-w-5xl gap-8 px-5 py-14 sm:px-7 sm:py-18 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-10 lg:px-10">
        <div>
          <h2
            id="code-start-title"
            className="font-heading text-3xl leading-tight font-bold tracking-tighter sm:text-4xl"
          >
            Первый запуск
          </h2>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-pretty text-spirit-muted sm:text-lg">
            Для подключения понадобится ключ SpiritLM. Для работы с файлами выберите модель
            с поддержкой инструментов.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 sm:mt-7">
            <Button asChild className="transition-none active:scale-100">
              <Link href={PATHS.DASHBOARD.KEYS}>
                Создать API-ключ
                <IconArrowRight aria-hidden="true" size={16} stroke={1.7} />
              </Link>
            </Button>
            <Button asChild variant="ghost" className="transition-none active:scale-100">
              <Link href={`${PATHS.DASHBOARD.DOCS}${PATHS.DOCS.SPIRITCODE}`}>
                <IconBook2 aria-hidden="true" size={17} stroke={1.7} />
                Документация
              </Link>
            </Button>
          </div>
        </div>
        <ol role="list" className="divide-y divide-spirit-border-subtle overflow-hidden rounded-[15px] bg-spirit-section">
          <li className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 px-4 py-4 sm:gap-x-4 sm:px-6 sm:py-5">
            <span aria-hidden="true" className="pt-1 font-mono text-xs text-spirit-accent">01</span>
            <div>
              <h3 className="font-semibold">Установите пакет</h3>
              <div className="mt-2"><CommandLine command={SPIRITCODE_INSTALL_COMMAND} /></div>
            </div>
          </li>
          <li className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 px-4 py-4 sm:gap-x-4 sm:px-6 sm:py-5">
            <span aria-hidden="true" className="pt-1 font-mono text-xs text-spirit-accent">02</span>
            <div>
              <h3 className="font-semibold">Запустите агент в папке проекта</h3>
              <div className="mt-2"><CommandLine command={SPIRITCODE_LAUNCH_COMMAND} /></div>
              <p className="mt-2 text-sm text-pretty text-spirit-muted">
                При первом запуске введите API-ключ в скрытом поле.
              </p>
            </div>
          </li>
          <li className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 px-4 py-4 sm:gap-x-4 sm:px-6 sm:py-5">
            <span aria-hidden="true" className="pt-1 font-mono text-xs text-spirit-accent">03</span>
            <div>
              <h3 className="font-semibold">Выберите модель</h3>
              <p className="mt-1 text-sm text-pretty text-spirit-muted">
                Откройте каталог командой <code className="text-spirit-accent">/model</code>,
                выберите модель и опишите задачу.
              </p>
            </div>
          </li>
        </ol>
      </div>
    </section>
  );
}

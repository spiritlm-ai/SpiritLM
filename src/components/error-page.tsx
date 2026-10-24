"use client";

import Image from "next/image";
import { IconArrowLeft } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { IMAGES } from "@/configs/paths/images.paths";
import { PATHS } from "@/configs/paths/pages.paths";

type ErrorPageProps = {
  status: 404 | 500;
};

export function ErrorPage({ status }: ErrorPageProps) {
  const isNotFound = status === 404;

  function goBack() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.assign(PATHS.HOME);
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-spirit-canvas px-6 py-12 font-body text-spirit-text antialiased sm:px-10">
      <div className="grid w-full max-w-[960px] grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] items-center gap-x-5 gap-y-8 sm:gap-x-12 md:gap-x-20 md:gap-y-5">
        <Image
          src={isNotFound ? IMAGES.IMAGES.NOT_FOUND : IMAGES.IMAGES.ERROR}
          alt={
            isNotFound
              ? "Растерянный персонаж в поисках пропавшей страницы"
              : "Растерянный персонаж с надписью Error на лбу"
          }
          width={512}
          height={512}
          unoptimized
          className="w-full max-w-48 justify-self-center object-contain md:row-span-2 md:max-w-[400px]"
        />
        <p
          aria-hidden="true"
          className="font-heading text-[clamp(5rem,18vw,8rem)] leading-none font-bold tracking-[-0.07em] text-spirit-muted tabular-nums md:self-end md:text-[152px]"
        >
          {status}
        </p>
        <div className="col-span-2 md:col-span-1 md:col-start-2 md:self-start">
          <h1 className="max-w-md font-heading text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">
            <span className="sr-only">{status}. </span>
            {isNotFound ? "Страница не найдена" : "Ошибка сервера"}
          </h1>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-pretty text-spirit-muted">
            {isNotFound
              ? "Возможно, страница была удалена или в адресе есть опечатка."
              : "Не удалось загрузить страницу. Попробуйте вернуться чуть позже."}
          </p>
          <Button
            type="button"
            onClick={goBack}
            className="mt-8 min-w-36 shadow-none active:scale-[0.96] motion-reduce:transform-none motion-reduce:transition-none"
          >
            <IconArrowLeft aria-hidden="true" size={18} stroke={2} />
            Назад
          </Button>
        </div>
      </div>
    </main>
  );
}

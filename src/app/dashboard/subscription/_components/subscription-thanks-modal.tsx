"use client";

import Image from "next/image";
import {
  IconArrowUpRight,
  IconCheck,
  IconHeart,
  IconSparkle,
} from "@tabler/icons-react";
import { ModalShell } from "@/components/modals/modal-shell";
import { Button } from "@/components/ui/button";
import { IMAGES } from "@/configs/paths/images.paths";

type SubscriptionThanksModalProps = {
  open: boolean;
  testMode: boolean;
  onClose: () => void;
};

export function SubscriptionThanksModal({
  open,
  testMode,
  onClose,
}: SubscriptionThanksModalProps) {
  return (
    <ModalShell
      open={open}
      titleId="subscription-thanks-title"
      title="Спасибо за поддержку!"
      description="SpiritLM становится лучше вместе с вами."
      icon={<IconHeart aria-hidden="true" size={19} />}
      onClose={onClose}
    >
      {open && (
        <div className="mt-2 space-y-6">
          <div className="relative isolate mx-auto flex max-w-[300px] justify-center">
            <IconSparkle
              aria-hidden="true"
              size={25}
              stroke={1.5}
              className="absolute left-3 top-9 -rotate-12 text-[#ffe02e]"
            />
            <IconSparkle
              aria-hidden="true"
              size={15}
              stroke={1.5}
              className="absolute right-6 top-5 rotate-12 text-[#ffe02e]/50"
            />
            <IconHeart
              aria-hidden="true"
              size={20}
              stroke={1.5}
              className="absolute bottom-8 right-2 rotate-12 text-[#ff8d9b]"
            />
            <Image
              src={IMAGES.IMAGES.THANKS}
              alt="Анимированная благодарность за поддержку SpiritLM"
              width={512}
              height={512}
              unoptimized
              className="h-[min(32dvh,240px)] w-auto max-w-full object-contain"
            />
          </div>
          <div className="space-y-3 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ffe02e]/10 px-3 py-1.5 text-xs font-medium text-[#ffe02e]">
              <IconCheck aria-hidden="true" size={14} />
              {testMode ? "Тестовая покупка прошла" : "Оплата прошла успешно"}
            </span>
            <p className="text-balance font-heading text-[26px] font-semibold leading-tight tracking-[-0.04em] text-[#f3f2ee] sm:text-[30px]">
              Ещё <span className="text-[#ffe02e]">30 дней</span>
              <br />
              для ваших больших идей
            </p>
            <p className="mx-auto text-pretty text-sm leading-relaxed text-[#a5a5a1]">
              {testMode
                ? "Тестовая покупка прошла успешно. Вы помогаете нам делать SpiritLM лучше. Доступ к генерациям не изменился."
                : "Период подписки оформлен. Вы придумываете, мы помогаем воплощать. Уже ждём, что вы создадите дальше 💛"}
            </p>
          </div>
          <Button
            type="button"
            size="lg"
            onClick={onClose}
            className="w-full active:scale-[0.96] motion-reduce:transform-none"
          >
            Начать творить
            <IconArrowUpRight aria-hidden="true" size={18} />
          </Button>
        </div>
      )}
    </ModalShell>
  );
}

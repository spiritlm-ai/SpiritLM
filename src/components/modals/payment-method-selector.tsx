"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { IMAGES } from "@/configs/paths/images.paths";

export function PaymentMethodSelector<T extends string>({
  value,
  options,
  disabled,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; disabled?: boolean; icon: "card" | "cryptobot" | "balance" }[];
  disabled?: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label="Способ оплаты" className="grid grid-cols-2 gap-2">
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant="ghost"
          aria-pressed={value === option.value}
          disabled={disabled || option.disabled}
          onClick={() => onChange(option.value)}
          className={`min-h-14 gap-2 rounded-xl px-3 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${options.length === 3 && option.icon === "balance" ? "col-span-2" : ""} ${value === option.value ? "bg-[#ffe02e]/10 !text-[#ffe02e] hover:bg-[#ffe02e]/15" : "bg-[#242424] !text-[#c6c6c1] hover:bg-[#30302e]"}`}
        >
          <Image
            src={
              option.icon === "card"
                ? IMAGES.IMAGES.CARD
                : option.icon === "balance"
                  ? IMAGES.IMAGES.BALANCE
                  : IMAGES.IMAGES.CRYPTOBOT
            }
            alt=""
            width={32}
            height={32}
            sizes="32px"
            quality={90}
            className="size-7 shrink-0 object-contain"
          />
          <span className="min-w-0 whitespace-normal text-left leading-tight">{option.label}</span>
        </Button>
      ))}
    </div>
  );
}

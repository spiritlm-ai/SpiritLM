import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-body no-underline transition-[color,background-color,border-color,transform] duration-200 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-spirit-accent",
  {
    variants: {
    variant: {
      default: "bg-spirit-accent !text-spirit-accent-ink shadow-sm hover:bg-[#ffcc36] hover:!text-spirit-accent-ink",
      ghost:
        "rounded-xl bg-spirit-surface text-spirit-button-text hover:bg-spirit-surface-hover hover:text-spirit-text",
      outline:
        "border border-spirit-border-strong bg-spirit-section text-spirit-button-text hover:border-spirit-accent hover:bg-spirit-surface hover:text-spirit-accent",
      link: "min-h-10 rounded-none border-0 bg-transparent p-0 text-left text-sm font-semibold text-spirit-accent hover:text-spirit-accent-soft",
    },
    size: {
      default: "min-h-11 rounded-lg px-4 text-sm font-semibold",
      sm: "min-h-10 rounded-lg px-3 text-xs font-semibold",
      lg: "min-h-12 rounded-xl px-5 text-sm font-semibold",
      icon: "size-9 rounded-full p-0",
    },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({
  asChild = false,
  className,
  size,
  variant,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";

  return (
    <Component
      className={cn(buttonVariants({ className, size, variant }))}
      data-slot="button"
      {...props}
    />
  );
}

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-2xl border border-transparent bg-spirit-surface",
        className,
      )}
      data-slot="card"
      {...props}
    />
  );
}

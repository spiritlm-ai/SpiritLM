"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-[#474744] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe02e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1b1b1b] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[#ffe02e] motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-5 rounded-full bg-[#f3f2ee] shadow-sm transition-transform data-[state=checked]:translate-x-5 data-[state=checked]:bg-[#171717] data-[state=unchecked]:translate-x-0 motion-reduce:transition-none"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };

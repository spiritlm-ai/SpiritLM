"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { DASHBOARD_NAV_ITEMS } from "@/configs/consts/navigation.const";

const labels = {
  HOME: "Главная",
  MODELS: "Модели",
  DOCS: "Документация",
  KEYS: "API-Ключи",
  SUBSCRIPTION: "Подписка",
};

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={`sticky bottom-0 z-10 order-last flex w-full shrink-0 flex-col self-end border-t border-white/[0.08] bg-[#050505] px-2 py-2 text-[11px] text-[#f3f2ee] md:top-12 md:order-first md:self-start md:border-0 md:px-2 md:py-3 md:text-[13px] ${
        collapsed ? "md:w-14" : "md:w-[232px]"
      } md:h-[calc(100dvh-3rem)] md:transition-[width] md:duration-200`}
      aria-label="Навигация дашборда"
    >
      <nav
        className="grid grid-cols-5 gap-1 md:flex md:flex-col"
        aria-label="Разделы"
      >
        {DASHBOARD_NAV_ITEMS.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? labels[item.id] : undefined}
              className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1 font-normal transition-colors hover:bg-[#1b1b1b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe02e] md:h-9 md:min-h-0 md:flex-row md:justify-start md:gap-2 md:px-2.5 md:py-0 ${
                active ? "bg-[#242424]" : ""
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Image
                src={item.icon}
                alt=""
                width={16}
                height={16}
                className={`size-4 shrink-0 ${
                  item.id === "KEYS" || item.id === "SUBSCRIPTION"
                    ? "brightness-150 saturate-50"
                    : "brightness-0 invert"
                }`}
              />
              <span className="max-w-full truncate md:hidden">
                {labels[item.id]}
              </span>
              {!collapsed && (
                <span className="hidden truncate md:inline">
                  {labels[item.id]}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        className="mt-1 hidden h-9 items-center gap-3 rounded-lg px-2.5 text-[#a5a5a1] transition-colors hover:bg-[#1b1b1b] hover:text-[#f3f2ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe02e] md:mt-auto md:flex"
        aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
        aria-expanded={!collapsed}
      >
        <span
          className="w-4 shrink-0 text-center text-lg leading-none"
          aria-hidden="true"
        >
          {collapsed ? "›" : "‹"}
        </span>
        {!collapsed && <span>Свернуть</span>}
      </button>
    </aside>
  );
}

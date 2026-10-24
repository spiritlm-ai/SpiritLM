"use client";

import { IconCheck, IconChevronDown, IconChevronUp, IconCopy } from "@tabler/icons-react";
import { useState } from "react";

const COLLAPSED_LINE_LIMIT = 14;

export function CodeBlock({ title, value }: { title: string; value: string }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const lines = value.split("\n");
  const isLong = lines.length > COLLAPSED_LINE_LIMIT;
  const visibleValue =
    isLong && !expanded
      ? lines.slice(0, COLLAPSED_LINE_LIMIT).join("\n")
      : value;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <figure className="mt-4 overflow-hidden rounded-xl bg-[#111]">
      <figcaption className="flex min-h-11 items-center justify-between gap-3 px-4 pt-2">
        <span className="text-xs text-[#a5a5a1]">{title}</span>
        <button
          type="button"
          onClick={() => void copyCode()}
          aria-label={copied ? "Код скопирован" : "Скопировать код"}
          title={copied ? "Скопировано" : "Скопировать"}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-[#a5a5a1] transition-colors hover:bg-white/[0.07] hover:text-[#ffe02e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe02e]"
        >
          {copied ? (
            <IconCheck aria-hidden="true" size={16} stroke={1.8} />
          ) : (
            <IconCopy aria-hidden="true" size={16} stroke={1.5} />
          )}
        </button>
      </figcaption>
      <div className="relative">
        <pre
          tabIndex={0}
          aria-label={title}
          className={
            "overflow-x-auto whitespace-pre px-4 py-3 text-[13px] leading-6 text-[#e4e3de] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ffe02e] " +
            (isLong && !expanded ? "max-h-[22rem] overflow-y-hidden pb-14" : "")
          }
        >
          <code>{visibleValue}</code>
        </pre>
        {isLong && !expanded && (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent via-[#111]/25 to-[#111]/75"
            />
            <button
              type="button"
              aria-expanded={false}
              onClick={() => setExpanded(true)}
              className="absolute inset-x-0 bottom-0 flex min-h-12 w-full items-center justify-center gap-2 border-t border-white/[0.08] bg-[#161616] px-4 py-2 text-sm font-medium text-[#f3f2ee] transition-colors hover:bg-[#242424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ffe02e]"
            >
              <IconChevronDown aria-hidden="true" size={16} stroke={1.7} />
              Раскрыть
              <span className="text-xs text-[#a5a5a1]">
                ещё {lines.length - COLLAPSED_LINE_LIMIT} строк
              </span>
            </button>
          </>
        )}
      </div>
      {isLong && expanded && (
        <div className="flex w-full border-t border-white/[0.06]">
          <button
            type="button"
            aria-expanded={true}
            onClick={() => setExpanded(false)}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 px-4 py-2 text-sm text-[#a5a5a1] transition-colors hover:bg-white/[0.06] hover:text-[#f3f2ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ffe02e]"
          >
            <IconChevronUp aria-hidden="true" size={16} stroke={1.7} />
            Свернуть
          </button>
        </div>
      )}
      {copied && (
        <p className="sr-only" role="status">
          Код скопирован
        </p>
      )}
    </figure>
  );
}

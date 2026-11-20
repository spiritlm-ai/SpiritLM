"use client";

import { IconCheck, IconCopy } from "@tabler/icons-react";
import { useEffect, useState } from "react";

export function CommandLine({ command }: { command: string }) {
  const [copyResult, setCopyResult] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    if (copyResult !== "success") return;

    const timeout = window.setTimeout(() => setCopyResult(null), 2000);
    return () => window.clearTimeout(timeout);
  }, [copyResult]);

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(command);
      setCopyResult("success");
    } catch {
      setCopyResult("error");
    }
  }

  const copied = copyResult === "success";

  return (
    <div>
      <div className="flex min-h-13 items-center gap-2 rounded-lg bg-spirit-canvas py-1 pr-1 pl-3 sm:pl-4">
        <span aria-hidden="true" className="select-none font-mono text-spirit-accent">$</span>
        <code className="min-w-0 grow wrap-break-word text-xs text-spirit-code-text sm:text-sm">
          {command}
        </code>
        <button
          type="button"
          onClick={() => void copyCommand()}
          aria-label={`Скопировать команду ${command}`}
          title={copied ? "Скопировано" : "Скопировать команду"}
          className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-md text-spirit-muted hover:bg-spirit-surface hover:text-spirit-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-spirit-accent"
        >
          {copied ? (
            <IconCheck aria-hidden="true" size={17} stroke={1.7} className="text-spirit-accent" />
          ) : (
            <IconCopy aria-hidden="true" size={17} stroke={1.7} />
          )}
        </button>
      </div>
      <p
        role="status"
        className={copyResult === "error" ? "mt-2 text-sm text-spirit-muted" : "sr-only"}
      >
        {copyResult === "error"
          ? "Выделите команду и скопируйте её вручную."
          : copied ? "Команда скопирована." : ""}
      </p>
    </div>
  );
}

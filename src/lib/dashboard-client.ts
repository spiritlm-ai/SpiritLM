"use client";

import { http } from "./http-client";
import type { ApiErrorEnvelope } from "@/configs/types/api.types";

export async function dashboardFetch<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  const response = await http(url, { ...init, headers });
  const data: unknown = await response.json();
  if (!response.ok) {
    const envelope = data as ApiErrorEnvelope | null;
    throw new Error(
      typeof envelope?.error?.message === "string"
        ? envelope.error.message
        : "Не удалось загрузить данные",
    );
  }
  return data as T;
}

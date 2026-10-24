"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { dashboardFetch } from "@/lib/dashboard-client";
import { PATHS } from "@/configs/paths/pages.paths";
import { SUBSCRIPTION_POLL_MS } from "@/configs/consts/subscriptions.const";
import type { SubscriptionOverview } from "@/configs/types/subscriptions.types";

export function useSubscription() {
  const [data, setData] = useState<SubscriptionOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    try {
      const result = await dashboardFetch<SubscriptionOverview>(
        PATHS.API.DASHBOARD.SUBSCRIPTION,
        { signal: request.signal },
      );
      if (!request.signal.aborted) {
        setData(result);
        setError(null);
      }
    } catch (failure) {
      if (!request.signal.aborted)
        setError(
          failure instanceof Error
            ? failure.message
            : "Не удалось загрузить подписку",
        );
    }
  }, []);
  useEffect(() => {
    void refresh();
    const visibleRefresh = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = window.setInterval(visibleRefresh, SUBSCRIPTION_POLL_MS);
    document.addEventListener("visibilitychange", visibleRefresh);
    window.addEventListener("focus", visibleRefresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", visibleRefresh);
      window.removeEventListener("focus", visibleRefresh);
      controller.current?.abort();
    };
  }, [refresh]);
  return { data, error, refresh };
}

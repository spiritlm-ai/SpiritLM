"use client";

import { useEffect, useRef, useState } from "react";
import type { SubscriptionOrderSummary } from "@/configs/types/subscriptions.types";

const storageKey = "spiritlm:pending-subscription-thanks";

export function useSubscriptionThanks(
  orders: SubscriptionOrderSummary[] | undefined,
  checkoutOrder: SubscriptionOrderSummary | null,
) {
  const [paidOrder, setPaidOrder] = useState<SubscriptionOrderSummary | null>(null);
  const tracked = useRef<Set<string> | null>(null);
  const shown = useRef(new Set<string>());

  useEffect(() => {
    if (!tracked.current) {
      let saved: unknown;
      try {
        saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "[]");
      } catch {
        saved = [];
      }
      tracked.current = new Set(
        Array.isArray(saved)
          ? saved.filter((id): id is string => typeof id === "string")
          : [],
      );
    }

    // Remember pending invoices across the external payment redirect. Historical
    // paid orders should never trigger a celebration on an ordinary page visit.
    for (const order of [...(orders ?? []), ...(checkoutOrder ? [checkoutOrder] : [])]) {
      if (shown.current.has(order.id)) continue;
      if (["CREATING", "PENDING"].includes(order.status)) {
        tracked.current.add(order.id);
      } else if (order.status === "PAID") {
        if (tracked.current.has(order.id) || order.id === checkoutOrder?.id) {
          shown.current.add(order.id);
          setPaidOrder(order);
        }
        tracked.current.delete(order.id);
      } else {
        tracked.current.delete(order.id);
      }
    }

    try {
      sessionStorage.setItem(storageKey, JSON.stringify([...tracked.current]));
    } catch {
      // In-memory tracking still works when browser storage is unavailable.
    }
  }, [orders, checkoutOrder]);

  return { paidOrder, dismiss: () => setPaidOrder(null) };
}

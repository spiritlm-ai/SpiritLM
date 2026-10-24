import type { Metadata } from "next";
import { SubscriptionDashboard } from "./_components/subscription-dashboard";

export const metadata: Metadata = { title: "Подписка" };

export default function SubscriptionPage() {
  return <SubscriptionDashboard />;
}

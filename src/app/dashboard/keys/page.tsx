import type { Metadata } from "next";
import { KeysDashboard } from "./_components/keys-dashboard";

export const metadata: Metadata = {
  title: "API-ключи",
};

export default function DashboardKeysPage() {
  return <KeysDashboard />;
}

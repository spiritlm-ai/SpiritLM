import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Модели",
};

export default function DashboardModelsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}

import type { Metadata } from "next";
import { Navbar } from "./_components/navbar";
import { Sidebar } from "./_components/sidebar";
import { TelegramChannelAlert } from "./_components/telegram-channel-alert";
import { auth } from "@clerk/nextjs/server";

export const metadata: Metadata = {
  title: "Главная",
};

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await auth.protect();
  return (
    <>
      <Navbar />
      <div className="flex min-h-[calc(100dvh-3rem)] flex-col bg-[#050505] md:flex-row">
        <Sidebar />
        <div className="order-first min-w-0 flex-1 rounded-t-none bg-[#242424] text-[#f3f2ee] md:order-none md:rounded-tl-[20px]">
          <TelegramChannelAlert />
          {children}
        </div>
      </div>
    </>
  );
}

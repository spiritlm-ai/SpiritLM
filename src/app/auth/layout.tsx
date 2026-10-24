import { IMAGES } from "@/configs/paths/images.paths";
import Image from "next/image";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen min-h-[100svh] overflow-x-hidden bg-[#111111] px-5 text-[#f3f2ee]">
      <section className="mx-auto flex min-h-screen min-h-[100svh] w-full max-w-[520px] flex-col items-center justify-center py-5 text-center">
        <Image
          src={IMAGES.ICON}
          width={80}
          height={80}
          alt="Spirit"
          className="mb-3 h-14 w-14 opacity-70 sm:h-16 sm:w-16"
        />
        <h1 className="font-heading text-2xl font-bold tracking-tight">SpiritLM</h1>
        <p className="mt-2 max-w-[520px] text-sm leading-5 text-[#c2c2c2] sm:text-base sm:leading-6">
          Платформа, которая объединяет все популярные ИИ-модели в одном провайдере
        </p>
        <div className="mt-5 w-full">
          {children}
        </div>
      </section>
    </div>
  );
}

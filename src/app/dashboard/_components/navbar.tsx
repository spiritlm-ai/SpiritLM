import Image from "next/image";
import Link from "next/link";
import { IMAGES } from "@/configs/paths/images.paths";
import { PATHS } from "@/configs/paths/pages.paths";
import { UserMenuButton } from "@/components/user-menu-button";

export function Navbar() {
  return (
    <header className="sticky top-0 z-20 flex h-12 items-center justify-between bg-spirit-header px-4">
      <Link
        className="inline-flex shrink-0 items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spirit-text"
        href={PATHS.HOME}
        aria-label="SpiritLM — главная"
      >
        <Image
          src={IMAGES.LOGO}
          alt="SpiritLM"
          width={90}
          height={20}
          priority
        />
      </Link>

      <UserMenuButton />
    </header>
  );
}

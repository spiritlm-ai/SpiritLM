import Image from "next/image";
import Link from "next/link";
import { IMAGES } from "../../../configs/paths/images.paths";
import { PATHS } from "../../../configs/paths/pages.paths";
import { AccountNavActions } from "./account-nav-actions";

export function Navbar() {
  return (
    <header className="relative z-10 flex h-12 items-center justify-between bg-spirit-header px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-6">
        <Link
          className="inline-flex shrink-0 items-center gap-2 text-sm text-spirit-text"
          href={PATHS.HOME}
          aria-label="SpiritLM — главная"
        >
          <Image className="size-6" src={IMAGES.ICON} alt="" width={24} height={24} priority />
        </Link>
      </div>

      <nav className="flex items-center gap-2" aria-label="Основные действия">
        <AccountNavActions />
      </nav>
    </header>
  );
}

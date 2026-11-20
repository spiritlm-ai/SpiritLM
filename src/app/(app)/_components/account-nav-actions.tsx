import { Show } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserMenuButton } from "@/components/user-menu-button";
import { PATHS } from "@/configs/paths/pages.paths";

export function AccountNavActions() {
  return (
    <>
      <Button asChild className="min-h-8 rounded-md px-3 text-xs" size="sm">
        <Link href={PATHS.DASHBOARD.ROOT}>Перейти</Link>
      </Button>
      <Show when="signed-out">
        <Button asChild className="min-h-8 rounded-md px-3 text-xs" variant="ghost" size="sm">
          <Link href="/auth/sign-in">Войти</Link>
        </Button>
      </Show>
      <Show when="signed-in">
        <UserMenuButton />
      </Show>
    </>
  );
}

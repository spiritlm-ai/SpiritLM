"use client";

import { UserButton } from "@clerk/nextjs";
import { IconBrandTelegram } from "@tabler/icons-react";
import { LINKS } from "@/configs/paths/links.paths";

export function UserMenuButton() {
  return (
    <UserButton>
      <UserButton.MenuItems>
        <UserButton.Action label="manageAccount" />
        <UserButton.Action label="signOut" />
        <UserButton.Action
          label="Написать в поддержку"
          labelIcon={<IconBrandTelegram size={16} aria-hidden="true" />}
          onClick={() => {
            window.open(LINKS.TELEGRAM_SUPPORT, "_blank", "noopener,noreferrer");
          }}
        />
      </UserButton.MenuItems>
    </UserButton>
  );
}

import type { ReactNode } from "react";

export type TopUpModalProps = {
  open: boolean;
  onClose: () => void;
  onPaid?: () => void;
};

export type CreateApiKeyModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (
    name: string,
    settings: import("./subscriptions.types").ApiKeyFundingSettings,
  ) => Promise<void> | void;
};

export type ModalShellProps = {
  open: boolean;
  titleId: string;
  title: string;
  description: string;
  icon: ReactNode;
  onClose: () => void;
  children: ReactNode;
};

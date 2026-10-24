import type { AuthSkeletonProps } from "@/configs/types/auth.types";

export function AuthSkeleton({ mode }: AuthSkeletonProps) {
  const isSignUp = mode === "sign-up";

  return (
    <div
      aria-label="Загрузка формы"
      aria-busy="true"
      role="status"
      className={`mx-auto w-full max-w-[400px] animate-pulse rounded-xl bg-[#383838] ${
        isSignUp ? "h-[480px]" : "h-[380px]"
      }`}
    />
  );
}

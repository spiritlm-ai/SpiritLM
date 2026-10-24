import { ClerkLoaded, ClerkLoading, SignIn } from "@clerk/nextjs";
import { AuthSkeleton } from "@/app/auth/_components/auth-skeleton";

export default function SignInPage() {
  return (
    <main
      className="auth-clerk auth-clerk-sign-in flex w-full items-center justify-center"
    >
      <ClerkLoading>
        <AuthSkeleton mode="sign-in" />
      </ClerkLoading>
      <ClerkLoaded>
        <SignIn
          routing="path"
          path="/auth/sign-in"
        />
      </ClerkLoaded>
    </main>
  );
}

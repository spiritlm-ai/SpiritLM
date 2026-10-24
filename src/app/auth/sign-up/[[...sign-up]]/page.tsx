import { ClerkLoaded, ClerkLoading, SignUp } from "@clerk/nextjs";
import { AuthSkeleton } from "@/app/auth/_components/auth-skeleton";

export default function SignUpPage() {
  return (
    <main
      className="auth-clerk flex w-full items-center justify-center"
    >
      <ClerkLoading>
        <AuthSkeleton mode="sign-up" />
      </ClerkLoading>
      <ClerkLoaded>
        <SignUp
          routing="path"
          path="/auth/sign-up"
        />
      </ClerkLoaded>
    </main>
  );
}

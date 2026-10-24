import { ClerkProvider } from "@clerk/nextjs";
import { ruRU } from "@clerk/localizations";
import type { Metadata } from "next";
import { IconCircleCheckFilled, IconCircleXFilled, IconLoader2 } from "@tabler/icons-react";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SpiritLM",
    template: "%s",
  },
  description: "Подключайте ведущие языковые модели через единый API SpiritLM.",
  icons: { icon: "/favicon.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ru"
      style={{ scrollbarGutter: "stable" }}
      className="[scrollbar-width:thin] [scrollbar-color:#42423d_#080808] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-[#080808] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#42423d] [&::-webkit-scrollbar-thumb:hover]:bg-[#777875] [&_*]:[scrollbar-width:thin] [&_*]:[scrollbar-color:#42423d_#080808] [&_*::-webkit-scrollbar]:w-2 [&_*::-webkit-scrollbar-track]:bg-[#080808] [&_*::-webkit-scrollbar-thumb]:rounded-full [&_*::-webkit-scrollbar-thumb]:bg-[#42423d] [&_*::-webkit-scrollbar-thumb:hover]:bg-[#777875]"
    >
      <body className="min-h-screen bg-spirit-canvas font-body text-spirit-text antialiased selection:bg-spirit-accent selection:text-spirit-accent-ink">
        <ClerkProvider
          localization={{
            ...ruRU,
            socialButtonsBlockButton: "{{provider}}",
            socialButtonsBlockButtonManyInView: "{{provider}}",
          }}
          signInUrl="/auth/sign-in"
          signUpUrl="/auth/sign-up"
          appearance={{
            variables: {
              colorPrimary: "#ffffff",
              colorBackground: "#202020",
              colorForeground: "#f3f2ee",
              colorPrimaryForeground: "#202020",
              colorMutedForeground: "#a5a5a1",
              colorMuted: "#383838",
              colorInput: "#383838",
              colorInputForeground: "#f3f2ee",
              colorNeutral: "#a5a5a1",
              colorBorder: "#424242",
              colorRing: "#f3f2ee",
              colorDanger: "#ff7777",
              borderRadius: "12px",
              fontFamily: "Figtree, Arial, sans-serif",
            },
            options: {
              unsafe_disableDevelopmentModeWarnings: true,
            },
          }}
        >
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 3200,
              style: {
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "12px",
                background: "#353535",
                color: "#f3f2ee",
              },
              iconTheme: {
                primary: "#ffe02e",
                secondary: "#454545",
              },
              loading: {
                icon: (
                  <span className="flex size-8 items-center justify-center">
                    <IconLoader2 aria-hidden="true" size={22} className="animate-spin text-[#ffe02e]" />
                  </span>
                ),
              },
              success: {
                icon: (
                  <span className="flex size-8 items-center justify-center">
                    <IconCircleCheckFilled aria-hidden="true" size={22} className="text-[#ffe02e]" />
                  </span>
                ),
              },
              error: {
                icon: (
                  <span className="flex size-8 items-center justify-center">
                    <IconCircleXFilled aria-hidden="true" size={22} className="text-[#ffe02e]" />
                  </span>
                ),
              },
            }}
          />
        </ClerkProvider>
      </body>
    </html>
  );
}

"use client";

import { ErrorPage } from "@/components/error-page";
import "./globals.css";

export default function GlobalError() {
  return (
    <html lang="ru">
      <body>
        <ErrorPage status={500} />
      </body>
    </html>
  );
}

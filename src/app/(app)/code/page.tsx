import type { Metadata } from "next";
import { Footer } from "../_components/footer";
import { CodeFeatures } from "./_components/code-features";
import { CodeHero } from "./_components/code-hero";
import { CodeNav } from "./_components/code-nav";
import { GetStarted } from "./_components/get-started";

export const metadata: Metadata = {
  title: "SpiritCode",
  description:
    "SpiritCode работает с файлами проекта, показывает правки и сохраняет сессии. Установите агент и подключите модели SpiritLM.",
  other: {
    "page-type": "software",
    "site-kind": "software",
  },
};

export default function CodePage() {
  return (
    <div className="motion-safe:[:root:has(&)]:scroll-smooth">
      <CodeNav />
      <main id="code-content" tabIndex={-1} data-type="software">
        <CodeHero />
        <CodeFeatures />
        <GetStarted />
      </main>
      <div className="mx-auto max-w-5xl [&_a]:transition-none">
        <Footer />
      </div>
    </div>
  );
}

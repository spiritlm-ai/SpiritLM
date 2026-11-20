import { Catalog } from "./_components/catalog";
import { Agents } from "./_components/agents";
import { Footer } from "./_components/footer";
import { Header } from "./_components/header";
import { Navbar } from "./_components/navbar";
import { Pricing } from "./_components/pricing";
import { SpiritCode } from "./_components/spiritcode";
import { connection } from "next/server";
import { websiteModelGroups } from "@/lib/model-catalog";

export default async function Home() {
  await connection();
  const modelGroups = await websiteModelGroups();

  return (
    <div className="mx-auto overflow-hidden" id="top">
      <Navbar />
      <main>
        <Header />
        <Catalog groups={modelGroups} />
        <Agents />
        <SpiritCode />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}

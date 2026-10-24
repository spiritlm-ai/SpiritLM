import { Catalog } from "./_components/catalog";
import { Agents } from "./_components/agents";
import { Footer } from "./_components/footer";
import { Header } from "./_components/header";
import { Navbar } from "./_components/navbar";
import { Pricing } from "./_components/pricing";

export default function Home() {
  return (
    <div className="mx-auto overflow-hidden" id="top">
      <Navbar />
      <main>
        <Header />
        <Catalog />
        <Agents />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}

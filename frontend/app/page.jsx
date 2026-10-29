import { SITE_CONFIG, createPageMetadata } from "@/lib/seo";
import HomeClient from "@/components/home/HomeClient";

export const metadata = createPageMetadata({
  title: SITE_CONFIG.defaultTitle,
  description: SITE_CONFIG.description,
  path: "/",
  keywords: [
    "Kalceria official",
    "automotive collective",
    "car meet Indonesia",
    "Kalcerians map",
    "Kalceria merch",
  ],
});

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#050a14]">
      <h1 className="sr-only">
        Kalceria — Automotive Culture and Interactive Digital Art Collective
      </h1>
      <HomeClient />
    </main>
  );
}

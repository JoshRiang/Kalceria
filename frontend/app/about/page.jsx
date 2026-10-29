import AboutUs from "@/components/AboutUs";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "About Us",
  description:
    "Discover the story behind Kalceria (Ālea iacta est), an automotive culture and digital craftsmanship movement forged by enthusiasts, engineers, and creative architects.",
  path: "/about",
  keywords: [
    "About Kalceria",
    "End of Line Club",
    "Kalceria team",
    "automotive design collective",
  ],
  ogImage: "/man.webp",
});

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#050a14]">
      <AboutUs />
    </main>
  );
}

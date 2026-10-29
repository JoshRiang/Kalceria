import { createPageMetadata } from "@/lib/seo";
import MapPageClient from "@/components/map/MapPageClient";

export const metadata = createPageMetadata({
  title: "Kalcerians Live Map — Tactical Community Radar",
  description:
    "Explore the live Kalcerians tactical radar map, discover active automotive community broadcasts, headquarters meetups, and real-time mini events across Indonesia.",
  path: "/map",
  ogImage: "/mapman.webp",
  keywords: [
    "Kalceria map",
    "Kalcerians live radar",
    "Indonesia automotive community map",
    "car meet radar",
  ],
});

export default function MapPage() {
  return <MapPageClient />;
}


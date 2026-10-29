import { createPageMetadata } from "@/lib/seo";
import SeeEvent from "@/components/SeeEvent";

export const metadata = createPageMetadata({
  title: "Events",
  description:
    "Discover upcoming Kalceria automotive events, curated car culture meetups, underground drops, and nationwide Kalcerians gatherings across Indonesia.",
  path: "/events",
  ogImage: "/bg_s1ev.webp",
  keywords: [
    "Kalceria events",
    "Indonesia car meets",
    "automotive culture events",
    "Kalcerians meetups",
  ],
});

export default function EventsPage() {
  return <SeeEvent />;
}

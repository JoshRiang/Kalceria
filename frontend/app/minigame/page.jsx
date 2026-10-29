import { createPageMetadata } from "@/lib/seo";
import MinigameClient from "@/components/minigame/MinigameClient";

export const metadata = createPageMetadata({
  title: "Kalcer's Game",
  description:
    "Play Kalcer's Game daily flip challenge, climb the Kalceria community leaderboard, and compete for exclusive Social Cult automotive event vouchers.",
  path: "/minigame",
  ogImage: "/bg_game.webp",
  keywords: [
    "Kalcer's Game",
    "Kalceria minigame",
    "Social Cult event voucher",
    "daily flip challenge",
  ],
});

export default function MinigamePage() {
  return <MinigameClient />;
}


import { createSeededRandom } from "@/lib/seededRandom";

export const CARD_IMAGES = ["/ge_1.webp", "/ge_2.webp", "/ge_3.webp", "/ge_4.webp"];

export function shuffleArray(arr, seed) {
  const a = [...arr];
  const random = createSeededRandom(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function makeCards(seed) {
  const pairs = [...CARD_IMAGES, ...CARD_IMAGES];
  const shuffled = shuffleArray(pairs, seed);
  return shuffled.map((img, i) => ({
    id: i, 
    img, 
    flipped: false, 
    matched: false,
    gridX: i % 4,
    gridY: Math.floor(i / 4)
  }));
}


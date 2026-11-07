import { uploadBlobMedia } from "@/lib/api";
import { isAhmadDummyUser } from "../usePersonalCallState";

export const LOCAL_CHAT_CACHE_PREFIX = "kalceria_e2ee_chat_v4_";

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function uploadMediaWithPersistFallback(blobOrFile) {
  if (!blobOrFile) return null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await uploadBlobMedia(blobOrFile);
      if (res?.url && !String(res.url).startsWith("blob:")) {
        return res.url;
      }
    } catch {}
  }
  if (blobOrFile.size <= 350 * 1024) {
    try {
      return await blobToDataUrl(blobOrFile);
    } catch {}
  }
  return null;
}

export const QUICK_EMOJIS = ["🔥", "🚗", "💨", "🙌", "😎", "❤️", "😂", "👍", "⚡", "🏁"];

export function formatMessageTime(ts) {
  const d = new Date(Number(ts) || Date.now());
  return d
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase();
}

export const GAUL_JAKSEL_STARTERS = [
  "Nongs mana kita hari ini?",
  "Kuy cabut kuy",
  "Weh gw mau curhat nih...",
  "Gas pol jangan kasih kendor!",
  "Lagi di mana lu bro?",
  "Ngopi santuy dulu gak sih?",
  "Info sunmori besok dong!",
  "Sumpah ini seru parah sih...",
  "Lu udah otw belom nih?",
  "Mampir bengkel bentar kuy!",
  "Mau ikutan rolling bareng gak?",
  "Goks parah vibes-nya!",
  "Ada yang lagi nongkrong di sini?",
  "Gaskeun lah tanpa ragu!",
  "Share lok sekarang juga dong",
  "Jangan lupa kabar-kabari ya",
  "Jujurly gw lagi butuh asupan kopi",
  "Cekidot spot baru ini deh",
  "Which is better nongkrong di mana?",
  "Basically kita butuh healing bentar",
  "Literally serame itu di situ?",
  "Sabi kali join anak-anak nanti malem",
  "Kopdar dadakan sabi nih",
  "Sound check knalpot dulu bos",
  "Meetup di check point biasa ya!",
];

export function getChatTimeLabel(ts) {
  const msgDate = new Date(Number(ts) || Date.now());
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const msgStart = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate()).getTime();

  const hours = msgDate.getHours();
  const minutes = String(msgDate.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";
  const displayHours = hours % 12 || 12;
  const timeStr = `${displayHours}.${minutes} ${ampm}`;

  if (msgStart >= todayStart) {
    return `Today ${timeStr}`;
  }
  if (msgStart >= yesterdayStart) {
    return `Yesterday ${timeStr}`;
  }
  const dateStr = msgDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `${dateStr} ${timeStr}`;
}

export function getDateLabel(ts) {
  return getChatTimeLabel(ts);
}

export function getInitialSeedMessages(targetUser, currentUserId) {
  if (!targetUser) return [];
  const isAhmad = isAhmadDummyUser(targetUser);
  if (!isAhmad) return [];

  const now = Date.now();
  const yesterdayEvening = now - 21 * 60 * 60 * 1000;
  const todayAfternoon = now - 45 * 60 * 1000;

  return [
    {
      id: `seed_${targetUser.id}_1`,
      senderId: String(targetUser.id),
      recipientId: String(currentUserId || "me"),
      text: "Bro, malem ini jadi rolling ke Sektor 9?",
      msgType: "text",
      ts: yesterdayEvening - 120000,
      status: "read",
      verifiedE2EE: true,
    },
    {
      id: `seed_${targetUser.id}_2`,
      senderId: String(currentUserId || "me"),
      recipientId: String(targetUser.id),
      text: "Gas bro, jam 9 kumpul di titik biasa ya",
      msgType: "text",
      ts: yesterdayEvening,
      status: "read",
      verifiedE2EE: true,
    },
    {
      id: `seed_${targetUser.id}_3`,
      senderId: String(targetUser.id),
      recipientId: String(currentUserId || "me"),
      text: "Siap mantap! Kabarin kalo udah otw, bisa voice/video call langsung.",
      msgType: "text",
      ts: todayAfternoon,
      status: "read",
      verifiedE2EE: true,
    },
  ];
}

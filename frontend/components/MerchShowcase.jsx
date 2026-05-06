"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Mock Data ────────────────────────────────────────────────────────────────
const merchData = [
  { id: "m1",  photoUrl: "https://picsum.photos/seed/m1/400/400",  link: "https://tokopedia.com",  isSeven: true,  isPilih: false },
  { id: "m2",  photoUrl: "https://picsum.photos/seed/m2/400/400",  link: "https://shopee.co.id",   isSeven: true,  isPilih: false },
  { id: "m3",  photoUrl: "https://picsum.photos/seed/m3/400/400",  link: "https://tokopedia.com",  isSeven: true,  isPilih: false },
  { id: "m4",  photoUrl: "https://picsum.photos/seed/m4/400/400",  link: "https://shopee.co.id",   isSeven: false, isPilih: false },
  { id: "m5",  photoUrl: "https://picsum.photos/seed/m5/400/400",  link: "https://tokopedia.com",  isSeven: false, isPilih: false },
  { id: "m6",  photoUrl: "https://picsum.photos/seed/m6/400/400",  link: "https://shopee.co.id",   isSeven: false, isPilih: false },
  { id: "m7",  photoUrl: "https://picsum.photos/seed/m7/400/400",  link: "https://tokopedia.com",  isSeven: false, isPilih: false },
  { id: "m8",  photoUrl: "https://picsum.photos/seed/m8/400/400",  link: "https://shopee.co.id",   isSeven: false, isPilih: false },
  { id: "m9",  photoUrl: "https://picsum.photos/seed/m9/400/400",  link: "https://tokopedia.com",  isSeven: true,  isPilih: false },
  { id: "m10", photoUrl: "https://picsum.photos/seed/m10/400/400", link: "https://shopee.co.id",   isSeven: false, isPilih: false },
  { id: "m11", photoUrl: "https://picsum.photos/seed/m11/400/400", link: "https://tokopedia.com",  isSeven: false, isPilih: false },
  { id: "m12", photoUrl: "https://picsum.photos/seed/m12/400/400", link: "https://shopee.co.id",   isSeven: true,  isPilih: false },
];

// ─── Shuffle Utility ──────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── useMerchRandomizer Hook ──────────────────────────────────────────────────
function useMerchRandomizer(initialData) {
  const [inventory, setInventory] = useState(initialData);
  const [displayedItems, setDisplayedItems] = useState([]);

  const pickNextBatch = useCallback(() => {
    setInventory((prev) => {
      let pool = prev.filter((i) => !i.isPilih);

      // NullIt: reset if pool < 4
      if (pool.length < 4) {
        const reset = prev.map((i) => ({ ...i, isPilih: false }));
        pool = reset;
      }

      const poolSeven = shuffle(pool.filter((i) => i.isSeven));
      const poolOld   = shuffle(pool.filter((i) => !i.isSeven));

      const picked = [];
      for (const item of poolSeven) {
        if (picked.length >= 4) break;
        picked.push(item);
      }
      for (const item of poolOld) {
        if (picked.length >= 4) break;
        picked.push(item);
      }

      const pickedIds = new Set(picked.map((i) => i.id));
      const nextInventory = prev.map((i) =>
        pickedIds.has(i.id) ? { ...i, isPilih: true } : i
      );

      setDisplayedItems(picked);
      return nextInventory;
    });
  }, []);

  useEffect(() => {
    pickNextBatch();
    const id = setInterval(pickNextBatch, 5000);
    return () => clearInterval(id);
  }, [pickNextBatch]);

  return displayedItems;
}

// ─── Marketplace Logos ────────────────────────────────────────────────────────
function MarketplaceLogos() {
  return (
    <div className="flex items-center gap-6 justify-center mb-8">
      <a
        href="https://tokopedia.com"
        target="_blank"
        rel="noopener noreferrer"
        className="grayscale opacity-70 transition-all duration-300 hover:grayscale-0 hover:opacity-100"
      >
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/7/72/Tokopedia_new_logo.png"
          alt="Tokopedia"
          className="h-8 object-contain"
        />
      </a>
      <a
        href="https://shopee.co.id"
        target="_blank"
        rel="noopener noreferrer"
        className="grayscale opacity-70 transition-all duration-300 hover:grayscale-0 hover:opacity-100"
      >
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Shopee.svg/1024px-Shopee.svg.png"
          alt="Shopee"
          className="h-8 object-contain"
        />
      </a>
    </div>
  );
}

// ─── Merch Card ───────────────────────────────────────────────────────────────
function MerchCard({ item, index }) {
  const isShopee = item.link.includes("shopee");

  return (
    <motion.a
      key={item.id}
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.8, delay: index * 0.1 }}
      className="relative rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 bg-white group"
    >
      {item.isSeven && (
        <span className="absolute top-3 left-3 z-10 bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
          NEW
        </span>
      )}
      <span
        className={`absolute top-3 right-3 z-10 text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow ${
          isShopee ? "bg-orange-500" : "bg-green-600"
        }`}
      >
        {isShopee ? "Shopee" : "Tokopedia"}
      </span>
      <div className="overflow-hidden aspect-square">
        <img
          src={item.photoUrl}
          alt={item.id}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
    </motion.a>
  );
}

// ─── MerchShowcase Component ──────────────────────────────────────────────────
export default function MerchShowcase() {
  const displayedItems = useMerchRandomizer(merchData);

  return (
    <section className="w-full max-w-4xl mx-auto px-4 py-12">
      <h2 className="text-3xl font-bold text-center mb-2 tracking-tight">Merch Kalceria</h2>
      <p className="text-center text-gray-500 mb-6 text-sm">Ganti setiap 5 detik · Prioritas item terbaru</p>

      <MarketplaceLogos />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AnimatePresence mode="popLayout">
          {displayedItems.map((item, idx) => (
            <MerchCard key={item.id} item={item} index={idx} />
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}

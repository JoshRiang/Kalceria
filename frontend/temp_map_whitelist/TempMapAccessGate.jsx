"use client";

/**
 * [TEMPORARY FEATURE FLAG] Direct `/map` Route Whitelist Access Gate
 *
 * Mounted in `frontend/app/map/page.jsx` AROUND `<MapPageClient />` so Tier A
 * `MapPageClient.jsx` remains 100% untouched (0 Hook Delta) and zero Leaflet /
 * GPS / WebRTC / Map polling logic ever executes for non-whitelisted visitors.
 */

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { fetchMe } from "@/lib/api";
import { clearSession, establishSession, hasUserSession } from "@/lib/session";
import { createSeededRandom } from "@/lib/seededRandom";
import {
  TEMP_MAP_WHITELIST_ENABLED,
  extractUserEmail,
  isEmailWhitelistedForMap,
} from "./mapWhitelistConfig";

function TempMapComingSoonScreen({ isLoggedIn }) {
  const particles = useMemo(() => {
    const random = createSeededRandom("temp-map-coming-soon-particles-v1");
    return Array.from({ length: 24 }).map((_, i) => ({
      id: i,
      left: `${random() * 100}%`,
      top: `${random() * 100}%`,
      size: random() > 0.85 ? 5 : 2,
      color: ["#00FFFF", "#ff006e", "#ffd60a", "#ffffff"][Math.floor(random() * 4)],
      delay: random() * 5,
      duration: 4 + random() * 5,
      xDrift: (random() - 0.5) * 70,
      yDrift: (random() - 0.5) * 70,
    }));
  }, []);

  return (
    <main className="min-h-screen bg-[#050a14] relative flex items-center justify-center overflow-hidden text-white font-mono z-50">
      <div className="absolute top-[5%] left-[-15%] w-[60vw] h-[60vw] rounded-full blur-[140px] bg-[#00FFFF]/25 pointer-events-none z-0" />
      <div className="absolute top-[15%] right-[-15%] w-[60vw] h-[60vw] rounded-full blur-[140px] bg-[#ff006e]/35 pointer-events-none z-0" />

      <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden z-[1]">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full opacity-0 will-change-[transform,opacity]"
            style={{
              width: p.size,
              height: p.size,
              left: p.left,
              top: p.top,
              backgroundColor: p.color,
              boxShadow: `0 0 8px ${p.color}`,
              "--dx": `${p.xDrift.toFixed(1)}px`,
              "--dy": `${p.yDrift.toFixed(1)}px`,
              animation: `tempMapDrift ${p.duration.toFixed(2)}s ease-in-out ${p.delay.toFixed(2)}s infinite`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center flex flex-col items-center gap-7 max-w-lg px-6">
        <Image
          src="/mapman.webp"
          alt="Kalcerians Map Preview"
          width={2048}
          height={2066}
          sizes="192px"
          quality={75}
          priority
          className="w-44 h-44 sm:w-48 sm:h-48 object-contain drop-shadow-[0_0_30px_rgba(0,255,255,0.35)]"
        />

        <div className="space-y-3.5">
          <p className="font-sans text-[11px] font-extrabold uppercase tracking-[0.3em] text-[#ffd60a]">
            Kalcerians Users Map
          </p>
          <h1 className="font-mono font-black uppercase tracking-tighter text-3xl xs:text-4xl md:text-5xl text-white leading-tight">
            Coming Soon
          </h1>
          <p className="font-sans text-white/85 text-sm md:text-base font-medium tracking-wide max-w-sm mx-auto">
            {isLoggedIn
              ? "Users Map is currently in private preview and will open to all Kalcerians soon."
              : "Users Map is currently in private preview. Check back soon or sign in with an invited account."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-1">
          <Link
            href="/?skip_intro=true"
            className="relative inline-block pointer-events-auto px-8 md:px-10 py-2.5 md:py-3.5 font-sans font-extrabold uppercase tracking-wide text-[13px] md:text-[15px] text-black bg-white transition-all hover:bg-[#ff006e] hover:text-white group shadow-[0_0_20px_rgba(255,255,255,0.12)] focus-polygon focus-visible:outline-none cursor-pointer"
            style={{
              clipPath:
                "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)",
            }}
            onClick={() => {
              if (typeof window !== "undefined") {
                sessionStorage.setItem("introPlayed", "true");
                sessionStorage.setItem("landingSeen", "true");
              }
            }}
          >
            <span className="relative z-10">BACK TO HOME</span>
            <span
              aria-hidden="true"
              className="block absolute inset-0 bg-[#050a14] scale-x-0 origin-right group-hover:scale-x-100 transition-transform duration-300 ease-out z-0"
            />
          </Link>

          {!isLoggedIn && (
            <Link
              href="/?auth=true"
              className="inline-block px-6 py-2.5 font-sans font-bold uppercase tracking-wider text-xs text-white/80 hover:text-white transition-colors underline underline-offset-4"
              onClick={() => {
                if (typeof window !== "undefined") {
                  sessionStorage.setItem("triggerAuth", "true");
                  sessionStorage.setItem("introPlayed", "true");
                }
              }}
            >
              Sign In
            </Link>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes tempMapDrift {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
            opacity: 0;
          }
          50% {
            transform: translate3d(var(--dx), var(--dy), 0);
            opacity: 0.75;
          }
        }
      `}</style>
    </main>
  );
}

export function TempMapAccessGate({ children }) {
  const [gateState, setGateState] = useState(() =>
    TEMP_MAP_WHITELIST_ENABLED ? "checking" : "allowed"
  );
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    if (!TEMP_MAP_WHITELIST_ENABLED) {
      setGateState("allowed");
      return;
    }

    let cancelled = false;
    const localSession = hasUserSession();

    // Always verify live session identity against `/api/users/me` so neither
    // stale localStorage nor client tampering can bypass the temporary flag.
    fetchMe()
      .then((user) => {
        if (cancelled) return;
        const email = extractUserEmail(user);
        if (user) {
          establishSession(user);
          setHasSession(true);
        }
        if (isEmailWhitelistedForMap(email)) {
          setGateState("allowed");
        } else {
          setGateState("blocked");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const status = err?.response?.status;
        if (status === 401 || status === 403 || !localSession) {
          clearSession();
          setHasSession(false);
        } else {
          setHasSession(localSession);
        }
        setGateState("blocked");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (gateState === "allowed") {
    return children;
  }

  if (gateState === "checking") {
    return (
      <main
        aria-busy="true"
        className="min-h-screen w-full bg-[#050a14] flex items-center justify-center"
      />
    );
  }

  return <TempMapComingSoonScreen isLoggedIn={hasSession} />;
}


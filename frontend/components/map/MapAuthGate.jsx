"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { createSeededRandom } from "@/lib/seededRandom";

export const MapAuthGate = memo(function MapAuthGate() {
  const loginGateParticles = useMemo(() => {
    const random = createSeededRandom("map-login-gate-particles-v1");
    return Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      left: `${random() * 100}%`,
      top: `${random() * 100}%`,
      size: random() > 0.85 ? 5 : 2,
      color: ["#FF0000", "#FF3C00", "#FF7B00", "#FFA600"][Math.floor(random() * 4)],
      delay: random() * 5,
      duration: 4 + random() * 5,
      xDrift: (random() - 0.5) * 80,
      yDrift: (random() - 0.5) * 80,
    }));
  }, []);

  return (
    <main className="min-h-screen bg-[#050a14] relative flex items-center justify-center overflow-hidden text-white font-mono z-50">
      {/* Animated Background Blobs (GPU Compositor Driven) */}
      <div
        className="absolute top-[5%] left-[-15%] w-[60vw] h-[60vw] rounded-full blur-[140px] bg-[#00FFFF]/30 pointer-events-none z-0 will-change-transform animate-[mapGateBlobA_10s_ease-in-out_infinite]"
      />
      <div
        className="absolute top-[15%] right-[-15%] w-[60vw] h-[60vw] rounded-full blur-[140px] bg-[#ff006e]/40 pointer-events-none z-0 will-change-transform animate-[mapGateBlobB_12s_ease-in-out_2s_infinite]"
      />

      {/* Micro Particle Layer (GPU Compositor Driven) */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden z-[1]">
        {loginGateParticles.map((p) => (
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
              animation: `mapGateDrift ${p.duration.toFixed(2)}s ease-in-out ${p.delay.toFixed(2)}s infinite`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center flex flex-col items-center gap-8 max-w-lg px-6">
        <Image
          src="/mapman.webp"
          alt="Kalcerians Map Guardian"
          width={2048}
          height={2066}
          sizes="192px"
          quality={75}
          priority
          fetchPriority="high"
          className="w-48 h-48 object-contain drop-shadow-[0_0_30px_rgba(0,255,255,0.35)]"
        />

        <div className="space-y-4">
          <h1
            className="font-sans font-black uppercase tracking-tighter text-4xl md:text-5xl lg:text-6xl text-white"
            style={{
              textShadow: "1px 1px 0px #bbb, 2px 2px 0px #999, 3px 3px 0px #777, 4px 4px 10px rgba(0,0,0,0.8)",
            }}
          >
            Authentication Required
          </h1>
          <p className="font-sans text-white text-sm md:text-base font-semibold tracking-wide max-w-sm mx-auto opacity-90">
            You need to login first to access the Kalcerians Map.
          </p>
        </div>

        <Link
          href="/?auth=true"
          className="relative inline-block pointer-events-auto mt-2 px-12 py-4 font-sans font-extrabold uppercase tracking-widest text-[13px] text-[#050a14] bg-white border border-white transition-all hover:border-[#FF00FF] hover:bg-transparent hover:text-white group cursor-pointer shadow-[0_0_30px_rgba(255,255,255,0.15)]"
          style={{ clipPath: "polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)" }}
          onClick={() => {
            if (typeof window !== "undefined") {
              sessionStorage.setItem("triggerAuth", "true");
            }
          }}
        >
          <span className="relative z-10">GO TO LOGIN</span>
          <span aria-hidden="true" className="block absolute inset-0 bg-[#FF00FF]/10 scale-y-0 origin-bottom group-hover:scale-y-100 transition-transform duration-300 ease-out z-0" />
        </Link>
      </div>

      <style jsx>{`
        @keyframes mapGateBlobA {
          0%, 100% { transform: translate3d(-10%, -5%, 0) scale(1); }
          50% { transform: translate3d(10%, 5%, 0) scale(1.2); }
        }
        @keyframes mapGateBlobB {
          0%, 100% { transform: translate3d(10%, 5%, 0) scale(1.1); }
          50% { transform: translate3d(-10%, -5%, 0) scale(1.3); }
        }
        @keyframes mapGateDrift {
          0%, 100% { transform: translate3d(0, 0, 0); opacity: 0; }
          50% { transform: translate3d(var(--dx), var(--dy), 0); opacity: 0.8; }
        }
      `}</style>
    </main>
  );
});

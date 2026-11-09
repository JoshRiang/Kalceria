"use client";

import { motion } from "framer-motion";
import { DynamicCollage } from "../particles";

export function LandingHeroSection({
  heroSectionRef,
  heroVideoRef,
  ambientGated,
  isLoggedIn,
  onOpenLogoutConfirm,
  onNavigateAuth,
}) {
  return (
    <section
      ref={heroSectionRef}
      className="relative w-full min-h-[85vh] flex flex-col items-center justify-center overflow-hidden py-24 z-10"
    >
      <DynamicCollage isGated={ambientGated} />
      <div className="absolute inset-0 bg-gradient-to-b from-[#050a14]/50 via-[#050a14]/10 to-[#050a14] z-0" />

      {/* Video Container */}
      <div className="relative w-[88%] md:w-[72%] max-w-4xl aspect-square md:aspect-video rounded-lg overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.8)] border border-white/10 bg-[#050a14]/90 flex flex-col items-center justify-center z-10">
        <video
          ref={heroVideoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover bg-[#000000]/60"
        >
          <source src="/video_landingatas.mp4" type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-black/50 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-6 md:gap-10 px-4 w-full">
          <motion.img
            src="/logo_landing.webp"
            alt="Kalceria"
            className="w-[85%] md:w-[70%] max-w-3xl h-auto object-contain drop-shadow-2xl"
            draggable={false}
            animate={{ y: [-6, 6, -6] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />

          {isLoggedIn ? (
            <button
              onClick={onOpenLogoutConfirm}
              className="relative z-10 font-sans font-black text-white uppercase tracking-widest text-[13px] md:text-[15px] hover:text-red-400 transition-colors duration-300 py-2 px-4 focus:outline-none"
            >
              LOGOUT
            </button>
          ) : (
            <button
              onClick={() => {
                try {
                  localStorage.removeItem("kalceria_auth_return");
                  localStorage.removeItem("kalceria_password_reset_from_map");
                  sessionStorage.removeItem("kalceria_auth_return");
                  sessionStorage.removeItem("kalceria_password_reset_from_map");
                  sessionStorage.removeItem("kalceria_is_password_reset_login");
                } catch {}
                onNavigateAuth?.();
              }}
              className="relative px-8 md:px-10 py-2.5 md:py-3.5 font-sans font-extrabold uppercase tracking-wide text-[13px] md:text-[15px] text-black bg-white transition-all hover:bg-[#FF00FF] hover:text-white group shadow-[0_0_20px_rgba(255,255,255,0.1)] focus-polygon focus-visible:outline-none cursor-pointer"
              style={{
                clipPath:
                  "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)",
              }}
            >
              <span className="relative z-10">LOGIN / REGISTER</span>
              <div className="absolute inset-0 bg-[#050a14] scale-x-0 origin-right group-hover:scale-x-100 transition-transform duration-300 ease-out z-0" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

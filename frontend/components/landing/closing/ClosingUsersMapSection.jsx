"use client";
import { motion } from "framer-motion";
import { SolarPhoenix } from "../backgrounds";

export function ClosingUsersMapSection({ isMobile }) {
  const handleMapNavigate = () => {
    sessionStorage.setItem("landingScrollTarget", "section-map");
    sessionStorage.setItem("landingScrollY", window.scrollY);
    sessionStorage.removeItem("mapIntroSeen");
    sessionStorage.setItem("playMapIntro", "true");
    window.location.href = "/map";
  };

  return (
    <section id="section-map" className="relative w-full aspect-square bg-[#0c1528] flex flex-col items-center justify-center z-50 overflow-hidden border-t border-slate-900" style={{ contentVisibility: "auto", containIntrinsicSize: "900px" }}>
      {/* Background Blobs (Cyan, Magenta, Gold) - GPU-Optimized on Mobile */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-80 mix-blend-screen">
        {isMobile ? (
          <div 
            className="absolute inset-0"
            style={{
              background: "radial-gradient(circle at 15% 15%, rgba(0,255,255,0.4) 0%, transparent 55%), radial-gradient(circle at 85% 85%, rgba(217,70,239,0.4) 0%, transparent 60%), radial-gradient(circle at 50% 50%, rgba(250,204,21,0.25) 0%, transparent 65%)"
            }}
          />
        ) : (
          <>
            <motion.div 
              animate={{ scale: [1, 1.25, 1], x: ["-15%", "15%", "-15%"], y: ["-10%", "10%", "-10%"] }} 
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} 
              className="absolute top-[-10%] left-[-10%] w-[75vw] h-[75vw] rounded-full will-change-transform"
              style={{ background: "radial-gradient(circle closest-side, rgba(0,255,255,0.68) 0%, rgba(0,255,255,0.28) 45%, transparent 100%)" }}
            />
            <motion.div 
              animate={{ scale: [1.1, 1.35, 1.1], x: ["15%", "-15%", "15%"], y: ["10%", "-10%", "10%"] }} 
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }} 
              className="absolute bottom-[-10%] right-[-10%] w-[80vw] h-[80vw] rounded-full will-change-transform"
              style={{ background: "radial-gradient(circle closest-side, rgba(217,70,239,0.68) 0%, rgba(217,70,239,0.28) 45%, transparent 100%)" }}
            />
            <motion.div 
              animate={{ scale: [1, 1.4, 1], x: ["0%", "10%", "0%"], y: ["20%", "-20%", "20%"] }} 
              transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 4 }} 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[70vw] rounded-full will-change-transform"
              style={{ background: "radial-gradient(circle closest-side, rgba(250,204,21,0.58) 0%, rgba(250,204,21,0.22) 45%, transparent 100%)" }}
            />
          </>
        )}
      </div>

      {/* Earthman on mobile - sits at z-[3], behind particles (z-[4]) and asteroids (z-10 container wrapper) */}
      {isMobile && (
        <motion.img 
          src="/hp/earthman_hp.webp" 
          alt="Earthman" 
          className="absolute bottom-[-1%] h-[105%] xs:h-[115%] object-contain z-[3] pointer-events-none"
          initial={{ y: 60, opacity: 0, rotate: 0, scale: 1 }}
          whileInView={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      )}

      <SolarPhoenix isMobile={isMobile} />

      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
        {/* Earth - Core Centerpiece */}
        {!isMobile && (
          <motion.img 
            src="/earth.webp" 
            alt="Earth" 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[34%] md:h-[46%] object-contain opacity-90 z-0 drop-shadow-[0_0_50px_rgba(0,255,255,0.2)]"
            animate={{ rotate: 360 }}
            transition={{ duration: 180, repeat: Infinity, ease: "linear" }}
          />
        )}

        {/* Top Header Title: USERS MAP with SUPPORT US Typography and Large Flexible Size */}
        <div className="absolute top-6 xs:top-8 sm:top-10 md:top-12 lg:top-14 xl:top-16 left-1/2 -translate-x-1/2 z-40 w-full px-4 text-center select-none">
          <button
            type="button"
            onClick={handleMapNavigate}
            className="bg-transparent border-none p-0 inline-block cursor-pointer focus:outline-none hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            <h2 className="font-mono font-black uppercase tracking-tighter text-4xl xs:text-5xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[9.5rem] 2xl:text-[11rem] text-white whitespace-nowrap leading-none">
              USERS MAP
            </h2>
          </button>
        </div>

        {/* Find The Others Button - Unified with SEE THE JOURNEY Typography & Proportion */}
        <div className="absolute z-40 bottom-[8%] md:bottom-auto md:top-1/2 left-1/2 -translate-x-1/2 md:-translate-y-1/2 flex items-center justify-center">
          <button
            type="button"
            onClick={handleMapNavigate}
            className="relative px-8 md:px-10 py-2.5 md:py-3.5 font-sans font-extrabold uppercase tracking-wide text-[13px] md:text-[15px] text-black bg-white transition-all hover:bg-[#FF00FF] hover:text-white group shadow-[0_0_20px_rgba(255,255,255,0.1)] focus-polygon focus-visible:outline-none cursor-pointer"
            style={{ clipPath: "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)" }}
          >
            <span className="relative z-10">FIND THE OTHERS</span>
            <div className="absolute inset-0 bg-[#050a14] scale-x-0 origin-right group-hover:scale-x-100 transition-transform duration-300 ease-out z-0" />
          </button>
        </div>

        {/* Earthman - Desktop Hero Figure at Bottom */}
        {!isMobile && (
          <motion.img 
            src="/earthman.webp" 
            alt="Earthman" 
            className="absolute bottom-[-4%] h-[40%] md:h-[54%] object-contain z-20 pointer-events-none"
            initial={{ y: 60, opacity: 0, rotate: 0, scale: 1 }}
            whileInView={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        )}

        {/* Asteroid Field - Optimized to 2 on Mobile, 4 on Desktop to eliminate lag */}
        {[
          { id: 1, src: '/asteroid_1.webp', top: '8%', left: '8%', size: '36px', delay: 0, rot: 45 },
          { id: 4, src: '/asteroid_1.webp', top: '12%', right: '12%', size: '42px', delay: 0.8, rot: -80 },
          { id: 7, src: '/asteroid_2.webp', bottom: '26%', left: '6%', size: '32px', delay: 0.4, rot: -40, desktopOnly: true },
          { id: 8, src: '/asteroid_1.webp', bottom: '22%', right: '10%', size: '40px', delay: 1.5, rot: 100, desktopOnly: true },
        ].filter(ast => !isMobile || !ast.desktopOnly).map((ast) => (
          <motion.img
            key={ast.id}
            src={ast.src}
            alt="Asteroid"
            className="absolute pointer-events-none opacity-50 z-[5]"
            style={{ 
              top: ast.top, 
              left: ast.left, 
              right: ast.right, 
              bottom: ast.bottom, 
              width: ast.size
            }}
            animate={{ 
              y: [0, -12, 0],
              rotate: [ast.rot - 15, ast.rot + 15, ast.rot - 15]
            }}
            transition={{ 
              duration: 6 + (ast.id % 4), 
              repeat: Infinity, 
              ease: "easeInOut", 
              delay: ast.delay 
            }}
          />
        ))}

        {/* Floating Clouds Assembly - Redistributed on iPad Family for open, spacious framing around Earth with zero button overlap */}
        {!isMobile && (
          <>
            {/* Left Cloud: awan_3 - Redistributed for iPad family to upper-left flank */}
            <motion.img 
              src="/awan_3.webp" 
              alt="Cloud Left"
              className="absolute left-[23%] md:left-[16%] xl:left-[23%] bottom-[27%] md:bottom-[36%] xl:bottom-[27%] h-[103px] md:h-[145px] xl:h-[184px] object-contain opacity-100 z-30 pointer-events-none"
              animate={{ 
                y: [0, -15, 0], 
                rotate: [-37, -33, -37],
                scale: [1, 1.05, 1]
              }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Right Top Cloud: awan_2 - Redistributed for iPad family to upper-right arc */}
            <motion.img 
              src="/awan_2.webp" 
              alt="Cloud Right Top"
              className="absolute right-[28%] md:right-[22%] xl:right-[28%] top-[27%] md:top-[19%] xl:top-[27%] h-[76px] md:h-[105px] xl:h-[131px] object-contain opacity-100 z-30 pointer-events-none"
              animate={{ 
                y: [0, -12, 0], 
                rotate: [1, -3, 1],
                scale: [1, 1.08, 1]
              }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            />

            {/* Right Middle Cloud: awan_2 - Redistributed for iPad family to lower-right flank below button */}
            <motion.img 
              src="/awan_2.webp" 
              alt="Cloud Right Middle"
              className="absolute right-[21%] md:right-[14%] xl:right-[21%] bottom-[33%] md:bottom-[21%] xl:bottom-[33%] h-[66px] md:h-[95px] xl:h-[121px] object-contain opacity-100 z-30 pointer-events-none"
              animate={{ 
                y: [0, -20, 0], 
                rotate: [-1, 1, -1],
                scale: [1, 1.03, 1]
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            />
          </>
        )}
      </div>
    </section>
  );
}

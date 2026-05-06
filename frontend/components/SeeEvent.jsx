"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Dummy Images Setup ───────────────────────────────────────────────────────
const HERO_IMAGES = [
  "/bg_s1ev.jpeg",
  "/bg_s2ev.jpeg",
  "/bg_s3ev.jpeg",
  "/bg_s4ev.jpeg",
];

const EVENT_DATA = [
  {
    id: 1,
    image: "/event_1.jpeg",
    title: "Freshman Cruise",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam.",
    gradient: "from-orange-500 via-yellow-300 to-orange-500",
    stroke: "#F97316",
    shadow: "rgba(250,204,21,0.5)"
  },
  {
    id: 2,
    image: "/event_2.jpeg",
    title: "Cars & Bikes",
    description: "Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris.",
    gradient: "from-blue-500 via-cyan-300 to-blue-500",
    stroke: "#3B82F6",
    shadow: "rgba(34,211,238,0.5)"
  },
  {
    id: 3,
    image: "/event_3.jpeg",
    title: "Cars Valentine",
    description: "Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu.",
    gradient: "from-purple-500 via-pink-400 to-purple-500",
    stroke: "#A855F7",
    shadow: "rgba(236,72,153,0.5)"
  }
];

// ─── Helper: Rainbow Pixels Component ─────────────────────────────────────────
function RainbowPixels() {
  const colors = ["#FF0000", "#FF7F00", "#FFFF00", "#00FF00", "#0000FF", "#4B0082", "#9400D3", "#D946EF", "#00FFFF"];
  // We use hardcoded random-looking values to avoid hydration mismatch if needed,
  // but since it's "use client", Math.random() is fine inside useEffect if we want, 
  // or we can just use useMemo to only run on client. 
  const particles = React.useMemo(() => Array.from({ length: 30 }).map(() => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: Math.random() * 6 + 4,
    duration: 15 + Math.random() * 20,
    delay: Math.random() * 5,
    xDrift: (Math.random() - 0.5) * 150
  })), []);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden mix-blend-screen opacity-50">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 10px ${p.color}`
          }}
          animate={{
            y: [0, -300, 0],
            x: [0, p.xDrift, 0],
            rotate: [0, 180, 360],
            opacity: [0.1, 0.8, 0.1]
          }}
          transition={{ duration: p.duration, repeat: Infinity, ease: "linear", delay: p.delay }}
        />
      ))}
    </div>
  );
}

// ─── Helper: Typewriter Component ─────────────────────────────────────────────
const Typewriter = ({ text, speed = 50, delay = 0 }) => {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let timeout = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        if (i <= text.length) {
          setDisplayed(text.slice(0, i));
          i++;
        } else {
          clearInterval(interval);
        }
      }, speed);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, speed, delay]);

  return <span>{displayed}</span>;
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SeeEvent() {
  const [heroIdx, setHeroIdx] = useState(0);
  const [eventIdx, setEventIdx] = useState(0);

  // Auto-slide Hero Carousel
  useEffect(() => {
    const heroTimer = setInterval(() => {
      setHeroIdx((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => clearInterval(heroTimer);
  }, []);

  // Auto-slide Event Carousel
  useEffect(() => {
    const eventTimer = setInterval(() => {
      setEventIdx((prev) => (prev + 1) % EVENT_DATA.length);
    }, 6000);
    return () => clearInterval(eventTimer);
  }, []);

  return (
    <div className="w-full min-h-screen bg-[#0B0C10] text-white font-sans overflow-x-hidden">
      
      {/* ─── SECTION 1: HERO CAROUSEL ────────────────────────────────────────── */}
      <section className="relative w-full h-screen overflow-hidden flex items-center">
        {/* Background Carousel */}
        <AnimatePresence mode="sync">
          {HERO_IMAGES.map((src, idx) => (
            idx === heroIdx && (
              <motion.div
                key={src}
                initial={{ opacity: 0, x: "10%" }}
                animate={{ opacity: 1, x: "0%", transition: { duration: 1.5, ease: "easeOut" } }}
                exit={{ opacity: 0, x: "-10%", transition: { duration: 1.5 } }}
                className="absolute inset-0 w-full h-full"
              >
                {/* Continuous panning after entry */}
                <motion.div 
                  animate={{ x: ["0%", "-5%"] }}
                  transition={{ duration: 10, ease: "linear", repeat: Infinity, repeatType: "mirror" }}
                  className="w-[110%] h-full bg-cover bg-center bg-[#1a1c23]"
                  style={{ backgroundImage: `url(${src})` }}
                />
              </motion.div>
            )
          ))}
        </AnimatePresence>

        {/* Warm Overlay */}
        <div className="absolute inset-0 bg-orange-400/20 mix-blend-overlay z-0 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0B0C10] z-0 pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 container mx-auto px-6 md:px-12 pt-20">
          <div className="relative inline-block">
            
            {/* L-Shape Upperline with Coki Image */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="relative mb-4 w-max flex items-end group"
            >
               <img src="/coki_event.png" alt="Coki Event" className="w-24 md:w-32 block relative z-10" />
               {/* Vertical part of L (50% height) */}
               <div className="absolute left-0 bottom-0 w-[4px] h-[50%] bg-white z-20" />
               {/* Horizontal part of L */}
               <div className="absolute left-0 bottom-0 h-[4px] w-full bg-white z-20" />
            </motion.div>

            <motion.h1
              initial={{ x: '-100vw' }}
              animate={{ x: 0 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-6xl md:text-8xl font-black tracking-tighter text-left text-white drop-shadow-2xl font-rog mb-6 relative z-10"
              style={{ WebkitTextStroke: "1px rgba(255,255,255,0.2)" }}
            >
              SEE EVENT
            </motion.h1>
          </div>
          <div className="max-w-2xl text-lg md:text-xl font-medium text-gray-200 leading-relaxed drop-shadow-lg h-[150px]">
            <Typewriter 
              text="This Event hosted by Kalceria and by the use of community. We bring automotive enthusiasts together to share the same obsession. Prepare your engines for the ultimate street euphoria." 
              delay={800} 
              speed={40} 
            />
          </div>
        </div>
      </section>

      {/* ─── SECTION 2 & 3 WRAPPER (For Stickers & Particles) ──────────────── */}
      <div className="relative w-full bg-[#0B0C10]">
        
        {/* Rainbow Pixel Particles */}
        <RainbowPixels />

        {/* Porsche (stikermobil_5) at bottom right */}
        <img src="/stikermobil_5.png" alt="Porsche" className="absolute z-10 w-40 md:w-56 bottom-10 right-[10%] -rotate-3 opacity-80 drop-shadow-xl pointer-events-none" />
        
        {/* Mercedes Benz (stikermobil_2) at bottom left */}
        <img src="/stikermobil_2.png" alt="Mercedes Benz" className="absolute z-10 w-40 md:w-56 bottom-10 left-[2%] rotate-6 opacity-80 drop-shadow-xl pointer-events-none" />

        {/* ─── SECTION 2: DYNAMIC EVENT CARDS ──────────────────────────────── */}
        <section className="relative w-full py-24 z-20 pointer-events-none">
          <div className="container mx-auto px-6 md:px-12 pointer-events-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              
              {/* Left: Picture Card Carousel */}
              <div className="relative w-full aspect-[4/5] rounded-2xl shadow-2xl bg-[#0B0C10] scale-[1.03]">
                {/* Angkot (stikermobil_4) below the photo card */}
                <img src="/stikermobil_4.png" alt="Angkot" className="absolute z-30 w-40 md:w-56 -bottom-36 md:-bottom-48 -left-10 md:-left-16 -rotate-3 opacity-90 drop-shadow-2xl pointer-events-none" />
                
                <div className="relative w-full h-full rounded-2xl overflow-hidden border border-gray-800">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={eventIdx}
                      initial={{ opacity: 0, x: "100%" }}
                      animate={{ opacity: 1, x: "0%" }}
                      exit={{ opacity: 0, x: "-100%" }}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute inset-0 w-full h-full"
                    >
                      <div 
                        className="w-full h-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${EVENT_DATA[eventIdx].image})` }}
                      />
                      <div className="absolute inset-0 shadow-[inset_0_0_50px_rgba(0,0,0,0.6)]" />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Right: Text Details (Sync Animation) */}
              <div className="flex flex-col justify-center h-[300px] relative z-20">
                
                {/* Static Stickers (Outside AnimatePresence) */}
                {/* Sticker 1: Placed on the Event Title Layer */}
                <img src="/stikermobil_1.png" alt="Sticker" className="absolute -top-36 md:-top-44 right-10 w-40 md:w-56 rotate-6 opacity-90 drop-shadow-2xl z-10 pointer-events-none" />
                
                {/* Lamborghini (stikermobil_3) exactly at the bottom middle of paragraph */}
                <img src="/stikermobil_3.png" alt="Lamborghini" className="absolute z-10 w-48 md:w-64 -bottom-10 md:-bottom-20 left-1/2 -translate-x-1/2 rotate-3 opacity-70 drop-shadow-2xl pointer-events-none" />

                <AnimatePresence mode="wait">
                  <motion.div
                    key={eventIdx}
                    initial={{ x: 100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.3 } }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col text-right items-end relative z-20"
                  >
                    <motion.h2 
                      animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className={`text-5xl md:text-6xl font-rog text-transparent bg-clip-text bg-gradient-to-r ${EVENT_DATA[eventIdx].gradient} mb-6 inline-block relative z-20`}
                      style={{ 
                        WebkitTextStroke: `2px ${EVENT_DATA[eventIdx].stroke}`, 
                        minHeight: "1.2em",
                        filter: `drop-shadow(0 0 10px ${EVENT_DATA[eventIdx].shadow})`
                      }}
                    >
                      <Typewriter text={EVENT_DATA[eventIdx].title} speed={70} delay={300} />
                    </motion.h2>

                    <div className="relative">
                      {/* Paragraph without container so the Lamborghini behind it is visible */}
                      <p className="text-gray-200 text-lg md:text-xl leading-relaxed max-w-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-medium relative z-20">
                        {EVENT_DATA[eventIdx].description}
                      </p>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

            </div>
          </div>
        </section>

        {/* ─── SECTION 3: COMMUNITY INTERACTION ────────────────────────────── */}
        <section className="relative w-full pb-32 pt-12 z-20 pointer-events-none">
          <div className="container mx-auto px-6 md:px-12 pointer-events-auto max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
              
              {/* Box 1: Wanna Join */}
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="relative bg-transparent p-8 rounded-2xl border-2 border-dashed border-gray-500 flex flex-col justify-between shadow-[0_0_30px_rgba(217,70,239,0.02)] backdrop-blur-sm h-full"
              >
                <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white mb-6 text-center">Wanna Join?</h3>
                <div className="flex flex-col items-center justify-center flex-1">
                  <button
                    type="button"
                    className="relative w-full py-3 font-sans font-extrabold uppercase tracking-wide text-[15px] text-[#050a14] bg-white border border-white transition-all hover:border-[#FF00FF] hover:bg-transparent hover:text-white group cursor-pointer"
                    style={{ clipPath: "polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)" }}
                  >
                    <span className="relative z-10">APPLY NOW</span>
                    <div className="absolute inset-0 bg-[#FF00FF]/10 scale-y-0 origin-bottom group-hover:scale-y-100 transition-transform duration-300 ease-out z-0" />
                  </button>
                </div>
              </motion.div>

              {/* Box 2: Any Idea */}
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="relative bg-transparent p-8 rounded-2xl border-2 border-dashed border-gray-500 shadow-[0_0_30px_rgba(0,255,255,0.02)] backdrop-blur-sm h-full flex flex-col justify-between"
              >
                {/* Otniel Image Floating Above */}
                <img src="/otniel_event.png" alt="Otniel" className="absolute top-0 right-8 -translate-y-full w-32 md:w-40 z-30 drop-shadow-2xl pointer-events-none" />

                <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white mb-6 text-center">Any Idea?</h3>
                <form className="flex flex-col gap-4 flex-1 justify-end">
                  <textarea 
                    placeholder="Drop your event suggestions here..."
                    className="w-full bg-black/30 border border-gray-700 border-dashed rounded-xl p-3 text-white focus:outline-none focus:border-[#00FFFF] focus:ring-1 focus:ring-[#00FFFF] transition-all resize-none h-24 text-sm"
                  />
                  <button
                    type="button"
                    className="relative w-full py-3 font-sans font-extrabold uppercase tracking-wide text-[15px] text-[#050a14] bg-[#00FFFF] border border-[#00FFFF] transition-all hover:border-[#00FFFF] hover:bg-transparent hover:text-white group cursor-pointer"
                    style={{ clipPath: "polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)" }}
                  >
                    <span className="relative z-10">SUBMIT IDEA</span>
                    <div className="absolute inset-0 bg-[#00FFFF]/10 scale-y-0 origin-bottom group-hover:scale-y-100 transition-transform duration-300 ease-out z-0" />
                  </button>
                </form>
              </motion.div>

            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence, useInView, useSpring, useTransform, animate } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import api from "@/lib/api";

// ─── Constants ───────────────────────────────────────────────────────────────
const HERO_IMAGES = [
  "/bg_s1ev.jpeg",
  "/bg_s2ev.jpeg",
  "/bg_s3ev.jpeg",
  "/bg_s4ev.jpeg",
];

const CLIP = { clipPath: "polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)" };
const CLIP_CARD = { clipPath: "polygon(30px 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%, 0 30px)" };

// ─── Stat Counter Component (Watchdog style) ──────────────────────────────
function StatCounter({ target, label, suffix = "", align = "start", active = false }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (active) {
      const controls = animate(0, target, {
        duration: 3, // Slower, more "grave" count-up
        ease: [0.16, 1, 0.3, 1], // Smooth cinematic ease
        onUpdate: (value) => setCount(Math.floor(value)),
      });
      return () => controls.stop();
    }
  }, [active, target]);

  return (
    <div className={`flex flex-col leading-none ${align === "end" ? "items-end" : "items-start"}`}>
      <div className="flex items-baseline">
        <span 
          className="font-mono font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]"
          style={{ fontSize: "clamp(2.2rem, 5.5vw, 4.5rem)" }}
        >
          {count}
        </span>
        {suffix && (
          <span 
            className="font-mono font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]"
            style={{ fontSize: "clamp(1.5rem, 3.5vw, 3rem)", marginLeft: "4px" }}
          >
            {suffix}
          </span>
        )}
      </div>
      <span 
        className="font-mono font-bold tracking-tight text-white/60"
        style={{ fontSize: "clamp(0.8rem, 1.8vw, 1.3rem)", marginTop: "6px" }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Components ──────────────────────────────────────────────────────────────
function RainbowPixels() {
  const colors = ["#FF0000", "#FF7F00", "#FFFF00", "#00FF00", "#0000FF", "#4B0082", "#9400D3", "#D946EF", "#00FFFF"];
  const particles = useMemo(() => Array.from({ length: 30 }).map(() => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: Math.random() * 6 + 4,
    duration: 15 + Math.random() * 20,
    delay: Math.random() * 5,
    xDrift: (Math.random() - 0.5) * 150
  })), []);

  return (
    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden mix-blend-screen opacity-50">
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

function MicroParticles() {
  const particles = useMemo(() => Array.from({ length: 60 }).map(() => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 0.5,
    duration: 8 + Math.random() * 12,
    delay: -Math.random() * 20,
    driftX: (Math.random() - 0.5) * 80
  })), []);

  return (
    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden opacity-30">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute bg-white rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            boxShadow: `0 0 4px rgba(255,255,255,0.6)`
          }}
          animate={{
            y: [0, -150, 0],
            x: [0, p.driftX, 0],
            opacity: [0, 0.7, 0]
          }}
          transition={{ duration: p.duration, repeat: Infinity, ease: "linear", delay: p.delay }}
        />
      ))}
    </div>
  );
}

// ─── Spinning Globe (Accurate Continent Dot Map) ──────────────────────────────
function SpinningGlobe() {
  const groupRef = useRef();


  // Highly refined continent regions — tighter boxes, many sub-regions to avoid ocean fill
  const dotPositions = useMemo(() => {
    const regions = [
      // ── NORTH AMERICA ──
      [60, 72, -140, -70],  // Canada west/central
      [48, 60, -125, -70],  // Canada south strip
      [25, 50, -125, -65],  // USA main
      [15, 30, -120, -85],  // Mexico
      [5,  16, -90,  -75],  // Central America thin strip
      [55, 72, -130, -100], // Alaska/Yukon
      [60, 80, -95,  -70],  // Baffin/Nunavut coast
      // ── SOUTH AMERICA ──
      [8,  12, -75,  -60],  // Venezuela/Colombia
      [-5, 8,  -78,  -48],  // Brazil north
      [-20, -5,-70,  -40],  // Brazil south
      [-40,-20, -73, -48],  // Argentina/Chile
      [-55,-40, -75, -60],  // Patagonia
      // ── EUROPE ──
      [36, 44, -10, 28],    // Spain/France/Italy
      [44, 55, -5,  25],    // France/Germany/Poland
      [55, 65, 5,   30],    // Scandinavia south
      [60, 70, 15,  30],    // Norway coast
      [55, 60, 22,  28],    // Baltic states
      [35, 42, 28,  36],    // Turkey
      [37, 42, -9,  -5],    // Portugal
      [36, 38, 12,  16],    // Sicily/S. Italy
      // ── AFRICA ──
      [30, 37, -5,  35],    // Morocco/Algeria/Libya/Egypt
      [15, 30, 15,  35],    // Sudan/Chad/Libya strip
      [-5, 15, -18, 45],    // West Africa wide
      [-30,-5, 10,  40],    // Central/East Africa
      [-35,-25,15,  32],    // South Africa
      [-26,-15,30,  36],    // Mozambique/Zimbabwe
      [5,  15, 35,  45],    // Ethiopia/Somalia west
      // ── ASIA ──
      [45, 72, 32,  80],    // Russia west/central
      [50, 72, 80,  130],   // Siberia
      [35, 55, 32,  80],    // Central Asia
      [35, 50, 80,  130],   // China north
      [20, 38, 60,  125],   // China south + India + SEA
      [8,  25, 68,  100],   // India subcontinent
      [8,  22, 98,  110],   // Indochina
      [35, 42, 26,  45],    // Turkey/Caucasus
      [10, 30, 35,  60],    // Arabian peninsula
      [22, 40, 45,  60],    // Iran
      // ── SOUTHEAST ASIA ──
      [0,  7,  100, 120],   // Sumatra/Malay
      [-8, 2,  108, 117],   // Java/Bali
      [-5, 4,  115, 120],   // Borneo east
      [5,  18, 120, 125],   // Philippines core
      // ── JAPAN ──
      [31, 45, 130, 142],
      // ── AUSTRALIA ──
      [-10,-5, 130, 140],   // NT top
      [-35,-10,115, 150],   // Main continent
      [-45,-38,145, 148],   // Tasmania
      // ── NEW ZEALAND ──
      [-47,-34,167, 178],
      // ── GREENLAND ──
      [60, 84, -55, -18],
      // ── ICELAND ──
      [63, 66, -25, -12],
      // ── MADAGASCAR ──
      [-26,-12,43,  51],
      // ── BRITISH ISLES ──
      [50, 60, -8,  2],
      // ── ALASKA ──
      [54, 64, -168,-140],
    ];

    const pts = [];
    // Vary density by region area for even distribution
    for (const [latMin, latMax, lonMin, lonMax] of regions) {
      const area = (latMax - latMin) * (lonMax - lonMin);
      const count = Math.max(40, Math.min(220, Math.floor(area * 0.7)));
      for (let i = 0; i < count; i++) {
        const lat = latMin + Math.random() * (latMax - latMin);
        const lon = lonMin + Math.random() * (lonMax - lonMin);
        const latR = (lat * Math.PI) / 180;
        const lonR = (lon * Math.PI) / 180;
        pts.push(
          Math.cos(latR) * Math.cos(lonR),
          Math.sin(latR),
          Math.cos(latR) * Math.sin(lonR)
        );
      }
    }
    return new Float32Array(pts);
  }, []);

  // Earth's axial tilt is approx 23.5 degrees
  const tiltRad = (23.5 * Math.PI) / 180;

  useFrame((_, delta) => {
    if (groupRef.current) {
      // Local rotation (spinning)
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <group ref={groupRef} rotation={[0, 0, tiltRad]} scale={0.75}>
      {/* Internal Dynamic Strings (Phage style) */}
      <GlobeCoreStrings />

      {/* High-visibility stark white grid */}
      <mesh>
        <sphereGeometry args={[1, 36, 18]} />
        <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.4} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Continent dot map — now Orange-Gold and glowing */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={dotPositions.length / 3} array={dotPositions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial 
          size={0.028} 
          color="#ff9900" 
          transparent 
          opacity={1} 
          sizeAttenuation 
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

// ─── Internal Globe Core Strings (Bacteriophage Style) ────────────────────────
function GlobeCoreStrings() {
  // Create 6 independent winding paths with unique movement data
  const stringData = useMemo(() => {
    const data = [];
    for (let j = 0; j < 6; j++) {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const r = 0.35 + Math.random() * 0.45;
        const phi = Math.random() * Math.PI * 2;
        const theta = Math.random() * Math.PI;
        pts.push(new THREE.Vector3(
          r * Math.sin(theta) * Math.cos(phi),
          r * Math.sin(theta) * Math.sin(phi),
          r * Math.cos(theta)
        ));
      }
      const curve = new THREE.CatmullRomCurve3(pts, true);
      data.push({
        geometry: new THREE.BufferGeometry().setFromPoints(curve.getPoints(120)),
        color: "#ff00ff", // Pure Magenta
        rotSpeed: [
          (Math.random() - 0.5) * 0.008, // Much slower, "grave" motion
          (Math.random() - 0.5) * 0.008,
          (Math.random() - 0.5) * 0.008
        ],
        ref: React.createRef()
      });
    }
    return data;
  }, []);

  useFrame((state) => {
    stringData.forEach((sd) => {
      if (sd.ref.current) {
        sd.ref.current.rotation.x += sd.rotSpeed[0];
        sd.ref.current.rotation.y += sd.rotSpeed[1];
        sd.ref.current.rotation.z += sd.rotSpeed[2];
        // Dynamic scaling for "pulsing" energy
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.5 + stringData.indexOf(sd)) * 0.08;
        sd.ref.current.scale.set(pulse, pulse, pulse);
      }
    });
  });

  return (
    <group>
      {stringData.map((sd, i) => (
        <group key={i} ref={sd.ref}>
          {/* LAYER 1: The core bright magenta filament */}
          <line geometry={sd.geometry}>
            <lineBasicMaterial 
              color="#ffffff" 
              transparent 
              opacity={1.0} 
              linewidth={1} 
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </line>
          {/* LAYER 2: The vibrant magenta body */}
          <line geometry={sd.geometry} scale={1.01}>
            <lineBasicMaterial 
              color="#ff00ff" 
              transparent 
              opacity={0.6} 
              linewidth={1} 
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </line>
          {/* LAYER 3: The deep magenta outer glow */}
          <line geometry={sd.geometry} scale={1.025}>
            <lineBasicMaterial 
              color="#ff00ff" 
              transparent 
              opacity={0.25} 
              linewidth={1} 
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </line>
        </group>
      ))}
    </group>
  );
}



// ─── Floating Photos around the Globe ─────────────────────────────────────────
const FLOAT_PHOTOS = [
  { src: "/ven_3.jpeg", top: "23%",   left: "26%",   rotate: -12, delay: 0.6  }, // Top Left
  { src: "/ven_2.jpeg", top: "23%",   right: "26%",  rotate:  12, delay: 1.1  }, // Top Right
  { src: "/ven_5.jpeg", bottom: "23%", left: "26%",   rotate: -12, delay: 0.3  }, // Bottom Left
  { src: "/ven_6.jpeg", bottom: "23%", right: "26%",  rotate:  12, delay: 2.2  }, // Bottom Right
];

function FloatingPhotoCard({ initialSrc, config, index }) {
  const [src, setSrc] = useState(initialSrc);
  const photos = useMemo(() => Array.from({ length: 20 }, (_, i) => `/foto_abt${i + 1}.jpeg`), []);

  useEffect(() => {
    const interval = setInterval(() => {
      const others = photos.filter(p => p !== src);
      const next = others[Math.floor(Math.random() * others.length)];
      setSrc(next);
    }, 3000 + Math.random() * 1000);
    return () => clearInterval(interval);
  }, [photos, src]);

  return (
    <motion.div
      className="absolute z-30 pointer-events-none"
      style={{ top: config.top, left: config.left, right: config.right, bottom: config.bottom }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: [0, -14, 0] }}
      transition={{
        opacity: { duration: 1.2, delay: config.delay },
        y: { duration: 4 + index * 0.4, repeat: Infinity, ease: "easeInOut", delay: config.delay },
      }}
    >
      <div 
        className="relative overflow-hidden" 
        style={{ 
          width: 112, 
          height: 77, 
          borderRadius: 14, 
          transform: `rotate(${config.rotate}deg)`,
          boxShadow: "0 8px 32px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.08)"
        }}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={src}
            src={src}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full object-cover"
            alt=""
          />
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function FloatingPhotos({ isMobile }) {
  const configs = [
    { src: "/ven_3.jpeg", top: "23%",   left: isMobile ? "11%" : "26%",   rotate: -12, delay: 0.6  }, // Top Left
    { src: "/ven_2.jpeg", top: "23%",   right: isMobile ? "11%" : "26%",  rotate:  12, delay: 1.1  }, // Top Right
    { src: "/ven_5.jpeg", bottom: "23%", left: isMobile ? "11%" : "26%",   rotate: -12, delay: 0.3  }, // Bottom Left
    { src: "/ven_6.jpeg", bottom: "23%", right: isMobile ? "11%" : "26%",  rotate:  12, delay: 2.2  }, // Bottom Right
  ];

  return (
    <>
      {configs.map((p, i) => (
        <FloatingPhotoCard key={i} index={i} config={p} initialSrc={p.src} />
      ))}
    </>
  );
}


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

const ChevronLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const ChevronRight = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

function ApplyModal({ events, startIndex, isMobile, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  const [mode, setMode] = useState("account");
  const [loading, setLoading] = useState(false);
  const event = events[idx];
  const [form, setForm] = useState({ name: "", email: "", contact: "", identifier: "", session: event?.sessionOptions?.[0] || "" });

  useEffect(() => {
    if (event) setForm(f => ({ ...f, session: event.sessionOptions?.[0] || "" }));
  }, [idx, event]);

  const next = () => setIdx(p => (p + 1) % events.length);
  const prev = () => setIdx(p => (p - 1 + events.length) % events.length);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = mode === "account" 
        ? { eventId: event.id, identifier: form.identifier, selectedSession: form.session }
        : { eventId: event.id, name: form.name, email: form.email, contact: form.contact, selectedSession: form.session };
      await api.post(`/events/${event.id}/register`, payload);
      alert("Registration successful!");
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full bg-white/90 border-none rounded-lg py-2 px-3 text-black outline-none focus:ring-2 focus:ring-fuchsia-500 transition-all font-sans text-[11px] font-medium placeholder:text-gray-400 shadow-xl";
  const labelClass = "block text-[8px] font-sans font-bold text-white uppercase mb-0.5 tracking-widest opacity-80 drop-shadow-md";
  const metaStyle = "text-[10px] md:text-[12px] font-medium text-gray-200 italic border-b border-white/10 shadow-[0_1px_4px_rgba(0,0,0,0.3)] pb-0.5 mb-2 block w-full";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <motion.div initial={{ scale: isMobile ? 0.78 : 0.9, y: 20 }} animate={{ scale: isMobile ? 0.825 : 1, y: 0 }} className="bg-[#0B0C10]/85 border border-white/10 w-full max-w-lg relative overflow-hidden backdrop-blur-2xl shadow-[0_0_100px_rgba(0,0,0,0.8)] p-6 md:p-8 transition-transform duration-500" style={CLIP}>
        
        {/* Dynamic Blobs */}
        <motion.div 
          animate={{ scale: [1, 1.3, 1], x: [0, 40, 0], y: [0, -40, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 -left-32 w-80 h-80 bg-fuchsia-600/20 rounded-full blur-[100px] pointer-events-none" 
        />
        <motion.div 
          animate={{ scale: [1.3, 1, 1.3], x: [0, -50, 0], y: [0, 50, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none" 
        />

        <button onClick={onClose} className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors text-2xl z-40">×</button>

        {/* Mini Carousel Header */}
        <div className="relative z-30 mb-6">
           <div className={`flex items-center justify-between mb-4 ${isMobile ? "px-10" : ""}`}>
              <button onClick={prev} className="w-10 h-10 flex items-center justify-center border border-white/20 text-white/40 hover:text-white hover:border-white transition-all bg-white/5 rounded-lg">
                <ChevronLeft />
              </button>
              <div className="text-center flex-1">
                 <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white italic mb-0.5" style={{ textShadow: "2px 2px 0 #FF00FF" }}>{event?.title}</h2>
                 <p className="text-[9px] text-slate-400 font-sans uppercase tracking-[0.2em] italic">Secure your slot in the grid</p>
              </div>
              <button onClick={next} className="w-10 h-10 flex items-center justify-center border border-white/20 text-white/40 hover:text-white hover:border-white transition-all bg-white/5 rounded-lg">
                <ChevronRight />
              </button>
           </div>

           <div className="grid grid-cols-2 gap-4 md:gap-6 items-center">
              <motion.div key={event?.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className={`relative w-full bg-white/5 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.7)] ${isMobile ? "aspect-square" : "aspect-[3/4]"}`} style={CLIP_CARD}>
                 <img src={event?.displayPhotoUrl} className="w-full h-full object-cover" alt="" />
                 <div className="absolute inset-0 border-2 border-white/10 pointer-events-none" style={CLIP_CARD} />
              </motion.div>
              <div className="flex flex-col justify-center h-full space-y-0.5">
                 <p className={metaStyle}>Location: <span className="text-white not-italic font-bold ml-2">{event?.location}</span></p>
                 <p className={metaStyle}>Start: <span className="text-white not-italic font-bold ml-2">{new Date(event?.regStartTime).toLocaleDateString()}</span></p>
                 <p className={metaStyle}>End: <span className="text-white not-italic font-bold ml-2">{new Date(event?.regEndTime).toLocaleDateString()}</span></p>
                 <p className={metaStyle}>Kuota: <span className="text-white not-italic font-bold ml-2">{event?.quota} Slots</span></p>
                 <p className={metaStyle}>Price: <span className="text-white not-italic font-bold ml-2">Rp {Number(event?.price).toLocaleString('id-ID')}</span></p>
              </div>
           </div>
        </div>

        {/* Elegant Form */}
        <div className="relative z-30 space-y-4">
           <div className="flex bg-black/60 p-1 rounded-lg border border-white/10 backdrop-blur-md shadow-inner">
              {["account", "guest"].map((m) => (
                <button key={m} onClick={() => setMode(m)} className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${mode === m ? "bg-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]" : "text-slate-500 hover:text-white"}`}>
                  {m === "account" ? "By Account" : "As Guest"}
                </button>
              ))}
           </div>

           <form onSubmit={handleSubmit} className="space-y-3">
              <AnimatePresence mode="wait">
                {mode === "account" ? (
                  <motion.div key="acc" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <label className={labelClass}>Gmail / Username</label>
                    <input className={inputClass} placeholder="reinathan@gmail.com" value={form.identifier} onChange={(e) => setForm({...form, identifier: e.target.value})} required />
                  </motion.div>
                ) : (
                  <motion.div key="gst" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                    <div>
                      <label className={labelClass}>Full Name</label>
                      <input className={inputClass} placeholder="Enter your name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Gmail</label>
                        <input className={inputClass} placeholder="mail@example.com" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required />
                      </div>
                      <div>
                        <label className={labelClass}>Contact</label>
                        <input className={inputClass} placeholder="WhatsApp" value={form.contact} onChange={(e) => setForm({...form, contact: e.target.value})} required />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <label className={labelClass}>Select Session</label>
                <select className={inputClass} value={form.session} onChange={(e) => setForm({...form, session: e.target.value})}>
                  {event?.sessionOptions?.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <button disabled={loading} className={`w-full py-3 bg-white text-black font-black uppercase tracking-tighter transition-all relative overflow-hidden group shadow-[0_0_30px_rgba(255,255,255,0.2)] ${loading ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-200"}`} style={{ clipPath: "polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)" }}>
                 <motion.div initial={{ x: "-100%" }} whileHover={{ x: "100%" }} transition={{ duration: 0.7 }} className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent skew-x-[-20deg] z-0" />
                 <span className="relative z-10 text-lg tracking-tighter">SECURE SPOT</span>
              </button>
           </form>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function SeeEvent() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const [heroIdx, setHeroIdx] = useState(0);
  const [eventIdx, setEventIdx] = useState(0);
  const [events, setEvents] = useState([]);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [idea, setIdea] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await api.get("/events");
      setEvents(r.data.events || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const heroTimer = setInterval(() => setHeroIdx((prev) => (prev + 1) % HERO_IMAGES.length), 5000);
    return () => clearInterval(heroTimer);
  }, []);

  useEffect(() => {
    if (events.length > 0) {
      const eventTimer = setInterval(() => setEventIdx((prev) => (prev + 1) % events.length), 6000);
      return () => clearInterval(eventTimer);
    }
  }, [events]);

  const activeEvent = events[eventIdx];
  const atmosRef = useRef(null);
  const isAtmosView = useInView(atmosRef, { once: true, margin: "-100px" });

  return (
    <div className="w-full min-h-screen bg-[#0B0C10] text-white font-sans overflow-x-hidden relative">
      
      {/* ─── SECTION 1: HERO CAROUSEL ────────────────────────────────────────── */}
      <section className="relative w-full h-screen overflow-hidden flex items-center justify-center">

        {/* Full-bleed raw slideshow: bg-cover spans full screen, slowly panning left like desktop */}
        <div className="absolute inset-0 z-0 overflow-hidden bg-[#0B0C10] flex items-center justify-center">
          {isMobile ? (
            <div 
              className="relative w-[90%] aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 backdrop-blur-md bg-white/5 shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] flex items-center justify-center"
              style={{ clipPath: "polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)" }}
            >
              <AnimatePresence mode="sync">
                {HERO_IMAGES.map((src, idx) => (
                  idx === heroIdx && (
                    <motion.div 
                      key={src} 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      exit={{ opacity: 0 }} 
                      transition={{ duration: 1.2 }} 
                      className="absolute inset-0 w-full h-full"
                    >
                      <motion.div 
                        animate={{ x: ["0%", "-15%"] }} 
                        transition={{ duration: 15, ease: "linear", repeat: Infinity, repeatType: "mirror" }} 
                        className="w-[120%] h-full bg-cover bg-center bg-no-repeat absolute left-0 top-0 opacity-80" 
                        style={{ backgroundImage: `url(${src})` }} 
                      />
                    </motion.div>
                  )
                ))}
              </AnimatePresence>
              <div className="absolute inset-0 bg-orange-400/10 mix-blend-overlay z-10 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10 pointer-events-none" />
            </div>
          ) : (
            <>
              <AnimatePresence mode="sync">
                {HERO_IMAGES.map((src, idx) => (
                  idx === heroIdx && (
                    <motion.div 
                      key={src} 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      exit={{ opacity: 0 }} 
                      transition={{ duration: 1.2 }} 
                      className="absolute inset-0 w-full h-full flex items-center justify-center"
                    >
                      <motion.div 
                        animate={{ x: ["0%", "-15%"] }} 
                        transition={{ duration: 15, ease: "linear", repeat: Infinity, repeatType: "mirror" }} 
                        className="w-[120%] h-full bg-cover bg-center bg-no-repeat absolute left-0 top-0" 
                        style={{ backgroundImage: `url(${src})` }} 
                      />
                    </motion.div>
                  )
                ))}
              </AnimatePresence>
              <div className="absolute inset-0 bg-orange-400/20 mix-blend-overlay z-10 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0B0C10] z-10 pointer-events-none" />
            </>
          )}
        </div>

        <div className={`relative z-10 container mx-auto px-6 md:px-12 flex flex-col ${isMobile ? "items-center text-center justify-center" : "items-start text-left justify-center h-full"}`}>
          <div className={`relative inline-block ${isMobile ? "text-center flex flex-col items-center justify-center" : "text-left flex flex-col items-start justify-center"}`}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5 }} className={`relative mb-6 w-max flex items-end justify-center group ${isMobile ? "mx-auto" : "ml-0"}`}>
               <img src="/coki_event.png" alt="Coki Event" className="w-24 md:w-36 block relative z-10 drop-shadow-2xl" />
               <div className="absolute left-0 bottom-0 w-[4px] h-[50%] bg-white z-20" />
               <div className="absolute left-0 bottom-0 h-[4px] w-full bg-white z-20" />
            </motion.div>

            <motion.h1 initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} className={`text-5xl md:text-7xl font-black tracking-tighter text-white drop-shadow-2xl font-rog mb-6 relative z-10 ${isMobile ? "text-center" : "text-left"}`} style={{ WebkitTextStroke: "1px rgba(255,255,255,0.2)" }}>
              SEE EVENT
            </motion.h1>
          </div>
          <div className={`max-w-2xl text-base md:text-lg font-medium text-gray-200 leading-relaxed drop-shadow-lg h-[150px] ${isMobile ? "text-center mx-auto" : "text-left ml-0"}`}>
            <Typewriter text="This Event hosted by Kalceria and by the use of community. We bring automotive enthusiasts together to share the same obsession. Prepare your engines for the ultimate street euphoria." delay={800} speed={40} />
          </div>
        </div>
      </section>

      {/* ─── SECTION 2 & 3 WRAPPER ─────────────────────────────────────────── */}
      <div className="relative w-full bg-[#0B0C10]">
        <RainbowPixels />
        <MicroParticles />
        <img src="/stikermobil_5.png" alt="" className="absolute z-10 w-40 md:w-56 bottom-10 right-[10%] opacity-80 drop-shadow-xl pointer-events-none transition-transform duration-700" style={{ transform: isMobile ? "translateY(-220%) rotate(-3deg)" : "rotate(-3deg)" }} />
        <img src="/stikermobil_2.png" alt="" className="absolute z-10 w-40 md:w-56 bottom-10 left-[2%] opacity-80 drop-shadow-xl pointer-events-none transition-transform duration-700" style={{ transform: isMobile ? "translateY(-220%) scale(0.8) rotate(6deg)" : "rotate(6deg)" }} />

        {/* ─── SECTION 1.5: ATMOSPHERIC BREAK ────────────────────────────────── */}
        <section ref={atmosRef} className="relative w-full py-[60vh] z-20 overflow-hidden">
          {/* Section Title with 3D Effect */}
          <div className="absolute top-[5%] left-1/2 -translate-x-1/2 z-30 text-center w-full px-4">
             <motion.h2 
               initial={{ opacity: 0, y: 30, filter: "blur(20px)" }}
               animate={isAtmosView ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: 30, filter: "blur(20px)" }}
               transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
               className="font-rog font-black tracking-tighter text-white uppercase relative inline-block select-none drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
               style={{ 
                 fontSize: isMobile ? "clamp(2.4rem, 7.2vw, 6rem)" : "clamp(2rem, 6vw, 5rem)",
                 WebkitTextStroke: "1px rgba(255,255,255,0.1)",
                 textShadow: `
                   0 1px 0 #ccc, 
                   0 2px 0 #c9c9c9, 
                   0 3px 0 #bbb, 
                   0 4px 0 #b9b9b9, 
                   0 5px 0 #aaa, 
                   0 6px 1px rgba(0,0,0,.1), 
                   0 0 5px rgba(0,0,0,.1), 
                   0 1px 3px rgba(0,0,0,.3), 
                   0 3px 5px rgba(0,0,0,.2), 
                   0 5px 10px rgba(0,0,0,.25), 
                   0 10px 10px rgba(0,0,0,.2), 
                   0 20px 20px rgba(0,0,0,.15)
                 `
               }}
             >
               <span className="text-[#ffcc00]">KALCER's</span> AROUND <span className="text-red-600">INDONESIA</span>
             </motion.h2>
          </div>

          {/* Enhanced Dynamic Background Blobs (Elegant Washy Wash) */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.28] mix-blend-screen">
             {/* Green Blob - Higher and more active */}
             <motion.div 
               animate={{ 
                 x: ["-10%", "20%", "5%", "-10%"],
                 y: ["-15%", "15%", "30%", "-15%"],
                 scale: [1, 1.3, 1.15, 1],
                 rotate: [0, 50, -50, 0]
               }}
               transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
               className="absolute top-[5%] left-[10%] w-[52vw] h-[52vw] rounded-full blur-[140px] bg-[#00ff88]/20"
             />
             {/* Gold Blob - Higher and more active */}
             <motion.div 
               animate={{ 
                 x: ["15%", "-15%", "10%", "15%"],
                 y: ["10%", "-10%", "-25%", "10%"],
                 scale: [1, 1.35, 1.2, 1],
                 rotate: [0, -60, 60, 0]
               }}
               transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
               className="absolute top-[10%] right-[10%] w-[58vw] h-[58vw] rounded-full blur-[160px] bg-[#ffcc00]/20"
             />
          </div>

          {/* Indonesia Map Background Behind Globe */}
          <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
             <img 
               src="/indo.png" 
               alt="Indonesia Map" 
               className="w-[151vw] md:w-[100vw] h-auto object-contain opacity-25 filter brightness-150 contrast-125" 
             />
          </div>

          {/* 3D Spinning Globe: scaled 25% smaller, 10% righter, 10% lower on mobile */}
          <div className={`absolute inset-0 z-0 flex items-center justify-center transition-all duration-700 origin-center ${isMobile ? "scale-[0.75] translate-x-[10%] translate-y-[10%]" : ""}`}>
             <Canvas camera={{ position: [0, 0, 4.5], fov: 45 }} style={{ pointerEvents: 'none' }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} />
                <SpinningGlobe />
             </Canvas>
          </div>
          {/* Aggressive Edge Blending for Seamless Transitions */}
          <div className="absolute top-0 left-0 w-full h-[30vh] bg-gradient-to-b from-[#0B0C10] to-transparent z-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-full h-[30vh] bg-gradient-to-t from-[#0B0C10] to-transparent z-10 pointer-events-none" />
          {/* Floating ven photos: dynamically spread left-right by 15% on mobile */}
          <FloatingPhotos isMobile={isMobile} />

          {/* ── LEFT STATS ── */}
          <div className="absolute left-6 md:left-12 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-12 pointer-events-none">
            <StatCounter target={10} label="Users" suffix="" active={isAtmosView} />
            <StatCounter target={10} label="Events" suffix="+" active={isAtmosView} />
          </div>

          {/* ── RIGHT STATS ── */}
          <div className="absolute right-6 md:right-12 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-12 pointer-events-none items-end">
            <StatCounter target={100}  label="Hours Streamed" suffix="+" align="end" active={isAtmosView} />
            <StatCounter target={1000} label="Days Created" suffix="" align="end" active={isAtmosView} />
          </div>
        </section>

        {/* ─── SECTION 2: DYNAMIC EVENT CARDS ──────────────────────────────── */}
        <section className="relative w-full py-24 z-20 pointer-events-none">
          <div className={`container mx-auto px-6 md:px-12 pointer-events-auto transition-transform duration-700 ${isMobile ? "translate-y-[-27.5%]" : ""}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              
              {/* Left: Picture Card Carousel - shrunk 50% on mobile */}
              <div className={`relative aspect-[4/5] rounded-2xl shadow-2xl bg-[#0B0C10] transition-all duration-300 ${isMobile ? "w-1/2 mx-auto scale-[1]" : "w-full scale-[1.03]"}`}>
                {!isMobile && (
                  <img src="/stikermobil_4.png" alt="" className="absolute z-30 w-40 md:w-56 -bottom-36 md:-bottom-48 -left-10 md:-left-16 opacity-90 drop-shadow-2xl pointer-events-none transition-transform duration-700" style={{ transform: "rotate(-3deg)" }} />
                )}
                
                <div className="relative w-full h-full rounded-2xl overflow-hidden border border-gray-800">
                  <AnimatePresence mode="wait">
                    {activeEvent && (
                      <motion.div key={activeEvent.id} initial={{ opacity: 0, x: "100%" }} animate={{ opacity: 1, x: "0%" }} exit={{ opacity: 0, x: "-100%" }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="absolute inset-0 w-full h-full">
                        <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${activeEvent.displayPhotoUrl})` }} />
                        <div className="absolute inset-0 shadow-[inset_0_0_50px_rgba(0,0,0,0.6)]" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Right: Text Details - centered and placed under card on mobile */}
              <div className={`flex flex-col justify-center min-h-[450px] relative z-20 ${isMobile ? "items-center text-center mt-12" : ""}`}>
                {!isMobile && (
                  <img src="/stikermobil_1.png" alt="" className="absolute -top-36 md:-top-44 right-10 w-40 md:w-56 opacity-90 drop-shadow-2xl z-10 pointer-events-none transition-transform duration-700" style={{ transform: "rotate(6deg)" }} />
                )}
                <img src="/stikermobil_3.png" alt="" className={`absolute z-10 w-36 md:w-44 bottom-[-110px] md:bottom-[-160px] opacity-70 drop-shadow-2xl pointer-events-none transition-all duration-700 ${isMobile ? "left-[85%]" : "left-1/2"}`} style={{ transform: isMobile ? "translateX(-50%) translateY(-380%) rotate(3deg)" : "translateX(-50%) rotate(3deg)" }} />

                <AnimatePresence mode="wait">
                  {activeEvent && (
                    <motion.div key={activeEvent.id} initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.3 } }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} className={`flex flex-col relative z-20 ${isMobile ? "text-center items-center" : "text-right items-end"}`}>
                      <motion.h2 
                        animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className={`text-5xl md:text-6xl font-black italic uppercase text-white tracking-tighter mb-6 inline-block relative z-20`}
                        style={{ 
                          WebkitTextStroke: "2px rgba(255,255,255,0.3)", 
                          minHeight: "1.2em",
                          textShadow: "0 0 15px rgba(255,0,255,0.5)"
                        }}
                      >
                        <Typewriter text={activeEvent.title} speed={70} delay={300} />
                      </motion.h2>

                      <div className="relative mb-8">
                        <p className={`text-gray-200 text-lg md:text-xl leading-relaxed max-w-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-medium relative z-20 mb-8 ${isMobile ? "text-center mx-auto" : "text-right"}`}>
                          {activeEvent.description}
                        </p>

                        <div className={`space-y-1 text-sm md:text-base font-medium text-gray-300 ${isMobile ? "text-center" : "text-right"}`}>
                          <p className="border-b border-fuchsia-500/30 shadow-[0_1px_5px_rgba(255,0,255,0.25)] pb-1 inline-block italic">Location: <span className="text-white not-italic font-bold">{activeEvent.location || "TBA"}</span></p><br/>
                          <p className="border-b border-fuchsia-500/30 shadow-[0_1px_5px_rgba(255,0,255,0.25)] pb-1 inline-block italic">Registration Start: <span className="text-white not-italic font-bold">{new Date(activeEvent.regStartTime).toLocaleDateString()} {new Date(activeEvent.regStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></p><br/>
                          <p className="border-b border-fuchsia-500/30 shadow-[0_1px_5px_rgba(255,0,255,0.25)] pb-1 inline-block italic">Registration End: <span className="text-white not-italic font-bold">{new Date(activeEvent.regEndTime).toLocaleDateString()} {new Date(activeEvent.regEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></p><br/>
                          <p className="border-b border-fuchsia-500/30 shadow-[0_1px_5px_rgba(255,0,255,0.25)] pb-1 inline-block italic">Kuota: <span className="text-white not-italic font-bold">{activeEvent.quota} Slots</span></p><br/>
                          <p className="border-b border-fuchsia-500/30 shadow-[0_1px_5px_rgba(255,0,255,0.25)] pb-1 inline-block italic">Price: <span className="text-white not-italic font-bold">Rp {Number(activeEvent.price).toLocaleString('id-ID')}</span></p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* On mobile, stikermobil_4 and stikermobil_1 sit beautifully centered and STATIC right below the description event */}
                {isMobile && (
                  <div className="w-full mt-10 flex items-center justify-center gap-10 pointer-events-none relative z-30">
                    <img src="/stikermobil_4.png" alt="" className="w-28 opacity-90 drop-shadow-2xl transition-transform duration-700" style={{ transform: "translateX(-60%) translateY(10%) scale(1.4) rotate(-3deg)" }} />
                    <img src="/stikermobil_1.png" alt="" className="w-28 opacity-90 drop-shadow-2xl transition-transform duration-700" style={{ transform: "translateX(40%) translateY(-40%) scale(1.2) rotate(6deg)" }} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ─── SECTION 3: COMMUNITY INTERACTION ────────────────────────────── */}
        <section className="relative w-full pb-32 pt-12 z-20 pointer-events-none">
          <div className="container mx-auto px-6 md:px-12 pointer-events-auto max-w-4xl">
            <div className="flex justify-center">
              <motion.div whileHover={{ scale: 1.02 }} className={`relative bg-[#0B0C10]/40 p-8 rounded-2xl border-2 border-dashed border-gray-500/30 backdrop-blur-xl flex flex-col justify-between h-[320px] w-full max-w-md transition-transform duration-700 ${isMobile ? "translate-y-[-95%]" : ""}`}>
                <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white mb-6 text-center">Wanna Join?</h3>
                <div className="flex-1 flex items-center justify-center">
                   <button onClick={() => setApplyModalOpen(true)} className="relative w-full py-5 font-sans font-black uppercase tracking-tighter text-black bg-white border border-white transition-all hover:bg-white/90 group cursor-pointer shadow-[0_0_40px_rgba(255,255,255,0.2)]" style={CLIP}>
                    <span className="relative z-10 text-2xl">APPLY NOW</span>
                    <div className="absolute inset-0 bg-black/5 scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-300 z-0" />
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

      </div>
      <AnimatePresence>
        {applyModalOpen && <ApplyModal events={events} startIndex={eventIdx} isMobile={isMobile} onClose={() => setApplyModalOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

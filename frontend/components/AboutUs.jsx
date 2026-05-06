"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Simple Static Typewriter for long text ───
function StaticTypewriter({ text, speed = 20, delay = 0 }) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    let t;
    if (started) {
      let i = 0;
      t = setInterval(() => {
        setDisplayed(text.substring(0, i));
        i++;
        if (i > text.length) clearInterval(t);
      }, speed);
    }
    return () => clearInterval(t);
  }, [text, speed, started]);

  return (
    <motion.span
      initial={{ opacity: 1 }}
      whileInView={{ opacity: 1 }}
      onViewportEnter={() => {
        setTimeout(() => setStarted(true), delay);
      }}
      viewport={{ once: true }}
    >
      {displayed}
    </motion.span>
  );
}

// ─── Ghostly Car Gallery Background (Section 2) ───
const GHOST_LANES = [10, 35, 60, 85]; // vertical percentages

function GhostItem({ ghost, onComplete }) {
  useEffect(() => {
    // Exact 12-second lifespan
    const timer = setTimeout(() => {
      onComplete(ghost);
    }, 12000);
    return () => clearTimeout(timer);
  }, [ghost, onComplete]);

  return (
    <motion.img
      src={ghost.src}
      initial={{ x: ghost.startX, y: ghost.startY, opacity: 0 }}
      animate={{ 
        x: ghost.endX, 
        y: ghost.startY, // Horizontal only movement
        opacity: [0, 0.3, 0.3, 0] 
      }}
      transition={{
        x: { duration: 12, ease: "linear" },
        // 12 seconds lifecycle: 1.2s fade in (0.1), hold until 9.0s (0.75), fade out by 12.0s (1.0)
        opacity: { duration: 12, times: [0, 0.1, 0.75, 1], ease: "easeInOut" }
      }}
      className="absolute w-64 h-64 grayscale mix-blend-overlay object-cover shadow-2xl pointer-events-none rounded-md z-[1]"
      onError={(e) => { e.target.style.display = 'none'; onComplete(ghost); }}
    />
  );
}

function GhostlyCarGallery() {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const [activeGhosts, setActiveGhosts] = useState([]);
  
  const occupiedLanesRef = useRef(new Set()); // Strict 4-Lane Highway tracking
  const ghostIdCounter = useRef(0);
  const availableImagesRef = useRef(Array.from({length: 20}, (_, i) => i + 1));

  useEffect(() => {
    if (!containerRef.current) return;
    const updateDims = () => {
      setDimensions({
        w: containerRef.current.offsetWidth,
        h: containerRef.current.offsetHeight
      });
    };
    updateDims();
    window.addEventListener("resize", updateDims);
    return () => window.removeEventListener("resize", updateDims);
  }, []);

  useEffect(() => {
    if (dimensions.w === 0 || dimensions.h === 0) return;
    
    // Aggressive Continuous Convoy Engine
    const MAX_GHOSTS = 8;
    
    const spawnInterval = setInterval(() => {
      setActiveGhosts(prev => {
        // Limit to max 8 ghosts on screen
        if (prev.length >= MAX_GHOSTS) return prev;

        // Find unlocked lanes
        const availableLanes = [0, 1, 2, 3].filter(lane => !occupiedLanesRef.current.has(lane));
        if (availableLanes.length === 0) return prev; // All lanes currently locked

        const newGhosts = [];
        const IMAGE_SIZE = 256; 
        
        // Lock a random lane
        const rndLaneIdx = Math.floor(Math.random() * availableLanes.length);
        const laneNum = availableLanes[rndLaneIdx];
        
        // PARTIAL LANE LOCKING: Unlock after 4 seconds to allow a convoy effect
        occupiedLanesRef.current.add(laneNum);
        setTimeout(() => {
          occupiedLanesRef.current.delete(laneNum);
        }, 4000);

        if (availableImagesRef.current.length === 0) {
          availableImagesRef.current = Array.from({length: 20}, (_, i) => i + 1);
        }
        const rndIdx = Math.floor(Math.random() * availableImagesRef.current.length);
        const imgId = availableImagesRef.current[rndIdx];
        availableImagesRef.current.splice(rndIdx, 1);

        const src = `/foto_abt${imgId}.jpeg`;
        const isLeft = Math.random() > 0.5;
        
        // Spawn far outside the screen bounds (Horizontal ONLY)
        const startX = isLeft ? -IMAGE_SIZE : dimensions.w;
        const endX = isLeft ? dimensions.w + 100 : -IMAGE_SIZE - 100;
        
        // Position strictly on the locked lane
        const startY = Math.max(0, (GHOST_LANES[laneNum] / 100) * dimensions.h - (IMAGE_SIZE / 2));

        ghostIdCounter.current++;
        newGhosts.push({
          id: ghostIdCounter.current,
          imgId,
          src,
          startX,
          endX,
          startY,
          laneNum
        });
        
        return [...prev, ...newGhosts];
      });
    }, 1500); // Check and spawn every 1.5 seconds

    return () => clearInterval(spawnInterval);
  }, [dimensions]);

  const handleGhostComplete = useCallback((ghostObj) => {
    // Note: Lane is already unlocked by the 4000ms timeout! We only return the image to the pool.
    availableImagesRef.current.push(ghostObj.imgId);
    setActiveGhosts(prev => prev.filter(g => g.id !== ghostObj.id));
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
      <AnimatePresence>
        {activeGhosts.map(ghost => (
          <GhostItem key={ghost.id} ghost={ghost} onComplete={handleGhostComplete} />
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Video Waves Gallery Background (Section 1) ───
const LANES = [10, 35, 60, 85]; // vertical percentages

function VideoWaveItem({ vid, onComplete }) {
  useEffect(() => {
    // Unmount and free lane exactly at 9.5 seconds to ensure the 10s video never freezes
    const timer = setTimeout(() => {
      onComplete(vid);
    }, 9500);
    return () => clearTimeout(timer);
  }, [vid, onComplete]);

  return (
    <motion.div
      initial={{ x: vid.startX, y: vid.startY, opacity: 0 }}
      animate={{ x: vid.endX, y: vid.startY, opacity: [0, 0.5, 0.5, 0] }}
      transition={{
        x: { duration: vid.duration, ease: "linear" },
        // 9 seconds total opacity lifecycle: fades in by 0.9s, holds until 7s, fully fades out by 9s
        opacity: { duration: 9, times: [0, 0.1, 0.77, 1], ease: "easeInOut" }
      }}
      className="absolute w-64 aspect-video rounded-lg shadow-2xl pointer-events-none overflow-hidden z-[50]"
    >
      <video 
        src={vid.src} 
        autoPlay 
        muted 
        playsInline 
        className="w-full h-full object-cover mix-blend-screen"
        onError={(e) => { e.target.style.display = 'none'; onComplete(vid); }}
      />
    </motion.div>
  );
}

function VideoWaveGallery() {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const [activeVideos, setActiveVideos] = useState([]);
  
  const occupiedLanesRef = useRef(new Set()); // Strict 4-Lane Highway tracking
  const vidIdCounter = useRef(0);
  const availableVidsRef = useRef(Array.from({length: 8}, (_, i) => i + 1));

  useEffect(() => {
    if (!containerRef.current) return;
    const updateDims = () => {
      setDimensions({
        w: containerRef.current.offsetWidth,
        h: containerRef.current.offsetHeight
      });
    };
    updateDims();
    window.addEventListener("resize", updateDims);
    return () => window.removeEventListener("resize", updateDims);
  }, []);

  useEffect(() => {
    if (dimensions.w === 0 || dimensions.h === 0) return;
    
    // Aggressive Continuous Convoy Engine
    const MAX_VIDEOS = 7;
    
    const spawnInterval = setInterval(() => {
      setActiveVideos(prev => {
        // Maintain an aggressive density without exceeding the limit
        if (prev.length >= MAX_VIDEOS) return prev;

        // Find unlocked lanes
        const availableLanes = [0, 1, 2, 3].filter(lane => !occupiedLanesRef.current.has(lane));
        if (availableLanes.length === 0) return prev; // All lanes currently locked

        const newVids = [];
        const VID_WIDTH = 256; 
        
        // Lock a random lane
        const rndLaneIdx = Math.floor(Math.random() * availableLanes.length);
        const laneNum = availableLanes[rndLaneIdx];
        
        // PARTIAL LANE LOCKING: Unlock after 3 seconds to allow a convoy effect
        occupiedLanesRef.current.add(laneNum);
        setTimeout(() => {
          occupiedLanesRef.current.delete(laneNum);
        }, 3000);

        if (availableVidsRef.current.length === 0) {
          availableVidsRef.current = Array.from({length: 8}, (_, i) => i + 1);
        }
        const rndIdx = Math.floor(Math.random() * availableVidsRef.current.length);
        const vidIdNum = availableVidsRef.current[rndIdx];
        availableVidsRef.current.splice(rndIdx, 1);

        const src = `/vid_abt${vidIdNum}.mp4`;
        const isLeft = Math.random() > 0.5;
        
        // Spawn far outside the screen bounds
        const startX = isLeft ? -VID_WIDTH : dimensions.w;
        const endX = isLeft ? dimensions.w + 50 : -VID_WIDTH - 50;
        
        // Position on the strictly locked lane
        const startY = Math.max(0, (LANES[laneNum] / 100) * dimensions.h - 72); // 72 is half of 144px height

        vidIdCounter.current++;
        newVids.push({
          id: vidIdCounter.current,
          vidIdNum,
          src,
          startX,
          endX,
          startY,
          laneNum,
          duration: 15 + Math.random() * 5 // Majestic 15 to 20 seconds slow traversal
        });
        
        return [...prev, ...newVids];
      });
    }, 1500); // Check and spawn every 1.5 seconds

    return () => clearInterval(spawnInterval);
  }, [dimensions]);

  const handleVideoComplete = useCallback((vidObj) => {
    // Note: Lane is already unlocked by the 3000ms timeout! We only return the video to the pool.
    availableVidsRef.current.push(vidObj.vidIdNum);
    setActiveVideos(prev => prev.filter(v => v.id !== vidObj.id));
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 z-[50] pointer-events-none overflow-hidden">
      <AnimatePresence>
        {activeVideos.map(vid => (
          <VideoWaveItem key={vid.id} vid={vid} onComplete={handleVideoComplete} />
        ))}
      </AnimatePresence>
    </div>
  );
}

export default function AboutUs() {
  const [mounted, setMounted] = useState(false);
  
  // ─── Mouse Tracking for Masking ───
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const containerRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: -1000, y: -1000 });
  };

  // FAQ state
  const [masterFaqOpen, setMasterFaqOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
    {
      q: "WHAT IS THE END OF LINE CLUB?",
      a: "A clandestine automotive culture collective focused on pushing the boundaries of aesthetics and performance. We exist at the intersection of high-octane engineering and premium digital art."
    },
    {
      q: "WHO IS BEHIND KALCERIA?",
      a: "Kalceria was forged by a dedicated core team including Coki, Wahib Embut, and the rest of the crew. They serve as the architects behind the movement, continuously pushing the limits of automotive luxury and interactive media."
    },
    {
      q: "HOW TO PARTICIPATE IN FUTURE EVENTS?",
      a: "Keep an eye on our event drops. We operate on an invite-only and limited-slot basis. Ensure you are registered and frequently check the dashboard for the latest coordinates."
    }
  ];

  if (!mounted) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full min-h-screen bg-[#050a14] text-white overflow-x-hidden selection:bg-[#FFD700] selection:text-black"
    >
      
      {/* ── SECTION 1: ABOUT US & DICTIONARY ── */}
      <section className="relative w-full min-h-screen flex flex-col items-center justify-center px-8 py-32 overflow-hidden z-10">
        
        {/* Video Waves Gallery */}
        <VideoWaveGallery />

        {/* Ambient Blobs: Magenta & Cyan */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-30 mix-blend-screen">
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[20%] left-[10%] w-[30vw] h-[30vw] rounded-full blur-[130px] bg-[#00FFFF]" />
          <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.25, 0.1] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }} className="absolute bottom-[10%] right-[20%] w-[40vw] h-[40vw] rounded-full blur-[160px] bg-[#FF00FF]" />
        </div>

        <div className="relative z-10 max-w-4xl w-full flex flex-col items-center text-center">
          
          <motion.h1 
            initial={{ y: -100, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-6xl md:text-8xl font-black uppercase tracking-tighter drop-shadow-2xl mb-6 font-mono"
          >
            ABOUT US
          </motion.h1>

          <motion.h2 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl italic font-medium tracking-wide text-slate-300 font-serif mb-16"
          >
            Ālea iacta est
            <span className="block mt-2 text-slate-500 text-lg md:text-xl tracking-widest">(The die is cast)</span>
          </motion.h2>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-left w-full max-w-2xl bg-black/40 p-10 shadow-2xl backdrop-blur-md relative border-l-4 border-slate-700 font-serif"
          >
            <h2 className="text-4xl font-bold mb-2 tracking-tight text-slate-100">Kalceria</h2>
            <p className="text-[#FFD700] italic mb-6 font-medium text-lg tracking-wide">noun. /kal·ce·ri·a/</p>
            <ol className="list-decimal pl-6 space-y-5 text-slate-300 leading-relaxed text-lg">
              <li className="pl-3 min-h-[3em]">
                <StaticTypewriter text="A state of transcendent automotive euphoria; the intersection where mechanical precision meets high-fidelity aesthetic design." speed={15} delay={1200} />
              </li>
              <li className="pl-3 min-h-[3em]">
                <StaticTypewriter text="A clandestine movement of enthusiasts dedicated to preserving the visceral experience of the drive in a digital age." speed={15} delay={3000} />
              </li>
            </ol>
          </motion.div>
        </div>
      </section>

      {/* Dynamic Cyan Separator Line */}
      <div className="w-full h-[1px] bg-cyan-500/50 animate-[pulse_2s_ease-in-out_infinite] shadow-[0_0_15px_#00FFFF] relative z-40" />

      {/* ── SECTION 2: MAN BEHIND THE SCENE ── */}
      <section className="relative w-full py-40 flex flex-col items-center overflow-hidden z-20 bg-[#050a14]">
        
        {/* Ghostly Car Gallery */}
        <GhostlyCarGallery />

        {/* Ambient Blobs: Golden & Cyan */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-30 mix-blend-screen">
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[20%] right-[10%] w-[30vw] h-[30vw] rounded-full blur-[130px] bg-[#FFD700]" />
          <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.25, 0.1] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }} className="absolute bottom-[20%] left-[20%] w-[40vw] h-[40vw] rounded-full blur-[160px] bg-[#00FFFF]" />
        </div>

        <div className="relative z-10 mb-20 text-center px-4 flex flex-col items-center pointer-events-none">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="text-4xl md:text-6xl lg:text-7xl font-mono font-black uppercase tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-slate-200 via-slate-100 to-slate-500 drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]"
          >
            MAN BEHIND THE SCENE
          </motion.h2>

          <motion.div 
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.4, ease: "circOut" }}
            className="h-[1px] w-full max-w-md bg-gradient-to-r from-transparent via-[#FFD700] to-transparent my-6 origin-center"
          />

          <div className="text-slate-400 font-mono text-xs md:text-sm tracking-widest max-w-2xl min-h-[2em]">
            <StaticTypewriter text="LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT. THE ARCHITECTS OF MOTION AND LUXURY. WE DO NOT JUST DRIVE, WE ENGINEER THE EXPERIENCE." speed={20} delay={1000} />
          </div>
        </div>

        {/* Cursor Masking Container */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.2 }}
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative z-10 w-[75%] max-w-4xl aspect-video md:aspect-[21/9] bg-[#0c1528] overflow-hidden border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.6)] cursor-crosshair group"
          style={{ clipPath: "polygon(40px 0, 100% 0, 100% calc(100% - 40px), calc(100% - 40px) 100%, 0 100%, 0 40px)" }}
        >
          {/* Base Layer: Grayscale ONLY (No Blur) */}
          <img 
            src="/man.png" 
            alt="The Team" 
            className="absolute inset-0 w-full h-full object-cover filter grayscale opacity-40 transition-all duration-500" 
            draggable={false}
          />
          
          {/* Reveal Layer: Full Color with Dynamic Mask via Mouse */}
          <motion.div 
            className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-300"
            animate={{ opacity: mousePos.x === -1000 ? 0 : 1 }}
            style={{
              WebkitMaskImage: `radial-gradient(circle 200px at ${mousePos.x}px ${mousePos.y}px, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)`,
              maskImage: `radial-gradient(circle 200px at ${mousePos.x}px ${mousePos.y}px, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)`
            }}
          >
            <img 
              src="/man.png" 
              alt="The Team Color" 
              className="w-full h-full object-cover contrast-110 saturate-110" 
              draggable={false}
            />
          </motion.div>
        </motion.div>
      </section>

      {/* Dynamic Cyan Separator Line */}
      <div className="w-full h-[1px] bg-cyan-500/50 animate-[pulse_2s_ease-in-out_infinite] shadow-[0_0_15px_#00FFFF] relative z-40" />

      {/* ── SECTION 3: THE FAQ ACCORDION ── */}
      <section className="relative w-full py-40 flex flex-col items-center overflow-hidden z-30 bg-[#050a14]">
        
        {/* Ambient Blobs: Golden & Magenta */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-30 mix-blend-screen">
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[10%] left-[30%] w-[30vw] h-[30vw] rounded-full blur-[130px] bg-[#FF00FF]" />
          <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.25, 0.1] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }} className="absolute bottom-[10%] right-[30%] w-[40vw] h-[40vw] rounded-full blur-[160px] bg-[#FFD700]" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          className="relative z-10 w-[90%] max-w-4xl flex flex-col"
        >
          {/* MASTER FAQ CARD */}
          <div className="flex flex-col border border-slate-700 bg-[#0a1120] overflow-hidden transition-all duration-300 shadow-2xl" style={{ clipPath: "polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)" }}>
            <button 
              onClick={() => setMasterFaqOpen(!masterFaqOpen)}
              className="w-full px-8 py-8 text-left flex justify-between items-center group hover:bg-[#111c34] transition-colors focus:outline-none"
            >
              <span className="font-mono font-black uppercase tracking-[0.2em] text-xl md:text-2xl text-white transition-colors">
                FREQUENTLY ASKED QUESTIONS
              </span>
              <span className="font-mono text-3xl text-white transition-transform duration-300" style={{ transform: masterFaqOpen ? "rotate(45deg)" : "rotate(0deg)" }}>
                +
              </span>
            </button>

            {/* NESTED QUESTIONS */}
            <AnimatePresence>
              {masterFaqOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="bg-[#050a14] border-t border-slate-800"
                >
                  <div className="p-4 md:p-8 flex flex-col gap-4">
                    
                    {faqs.map((faq, i) => (
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.15 }}
                        className="flex flex-col border border-slate-800 bg-[#0a1120] overflow-hidden hover:border-slate-600 transition-colors"
                      >
                        <button 
                          onClick={() => setOpenFaq(openFaq === i ? null : i)}
                          className="w-full px-6 py-5 text-left flex justify-between items-center group hover:bg-[#111c34] transition-colors focus:outline-none"
                        >
                          <span className="font-mono font-bold uppercase tracking-widest text-sm md:text-base text-slate-300 group-hover:text-white transition-colors pr-8">
                            {faq.q}
                          </span>
                          <span className="font-mono text-xl text-white transition-colors flex-shrink-0">
                            {openFaq === i ? "—" : "+"}
                          </span>
                        </button>

                        <AnimatePresence>
                          {openFaq === i && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="border-t border-slate-800"
                            >
                              <div className="px-6 py-6 font-sans text-slate-400 text-sm md:text-base leading-relaxed bg-[#060c18]">
                                {faq.a}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

      </section>

    </motion.div>
  );
}

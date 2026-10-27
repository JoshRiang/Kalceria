"use client";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export function LineParticles() {
  const colors = ["#FF0000", "#FF7F00", "#FFFF00", "#00FF00", "#0000FF", "#4B0082", "#9400D3", "#D946EF", "#00FFFF"];
  const particles = useMemo(() => Array.from({ length: 25 }).map(() => ({
    x: Math.random() * 20,
    y: Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: Math.random() * 5 + 2,
    duration: 1.5 + Math.random() * 2.5,
    delay: Math.random() * 5,
    xDrift: 20 + Math.random() * 60,
    yDrift: (Math.random() - 0.5) * 120
  })), []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="absolute inset-0 pointer-events-none overflow-visible"
    >
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${p.x}px`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 12px ${p.color}`
          }}
          animate={{
            x: [0, p.xDrift],
            y: [0, p.yDrift],
            opacity: [0, 1, 0],
            scale: [0.5, 1.5, 0.5]
          }}
          transition={{ 
            duration: p.duration, 
            repeat: Infinity, 
            ease: "circOut", 
            delay: p.delay 
          }}
        />
      ))}
    </motion.div>
  );
}

export function LogoutConfirmModal({ onConfirm, onCancel }) {
  const [catFrame, setCatFrame] = useState(1);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let interval;
    if (isLoggingOut) {
      // Auto-refresh after exactly 1s (Faster)
      const timer = setTimeout(() => {
        onConfirm();
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      // Normal toggling cats every 1s
      interval = setInterval(() => {
        setCatFrame(prev => (prev === 1 ? 2 : 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLoggingOut, onConfirm]);

  const handleYes = () => {
    setIsLoggingOut(true);
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Background Overlay */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={!isLoggingOut ? onCancel : undefined}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <AnimatePresence mode="wait">
        {!isLoggingOut ? (
          <motion.div
            key="confirm-box"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="relative w-full max-w-[450px] rounded-[30px] overflow-visible border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.6)]"
          >
            {/* Cat Mascot Area */}
            <div className="absolute bottom-[100%] left-1/2 -translate-x-[55%] w-32 h-32 z-50 pointer-events-none">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: [0, 1, 0.5, 1], // Entry then start pulse
                  boxShadow: [
                    "0 0 15px #fff, 0 0 30px #D946EF, 0 0 45px #FACC15",
                    "0 0 25px #fff, 0 0 50px #D946EF, 0 0 75px #FACC15",
                    "0 0 15px #fff, 0 0 30px #D946EF, 0 0 45px #FACC15"
                  ]
                }}
                transition={{ 
                  opacity: { duration: 0.8, times: [0, 0.2, 0.6, 1], delay: 0.2 },
                  boxShadow: { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
                }}
                className="absolute left-[1%] top-[0%] bottom-0 w-[10px] bg-white z-30" 
              >
                <LineParticles />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                className="w-full h-full"
              >
                <img
                  src={`/kucing${catFrame}.webp`}
                  alt="Cat"
                  className="w-full h-full object-contain object-bottom drop-shadow-[0_10px_20px_rgba(255,255,255,0.2)] z-10"
                />
              </motion.div>
            </div>

            {/* Modal Card Content */}
            <div className="relative bg-[#0c1528]/90 backdrop-blur-2xl rounded-[30px] p-10 flex flex-col items-center text-center">
              <motion.div
                animate={{ x: [-20, 20], opacity: [0.1, 0.2] }}
                transition={{ duration: 8, repeat: Infinity, repeatType: "mirror" }}
                className="absolute -top-20 -left-20 w-64 h-64 bg-red-600 rounded-full blur-[80px] pointer-events-none"
              />
              <h3 className="relative z-10 font-sans text-2xl font-black text-white uppercase tracking-tight mt-4 mb-12">
                You sure want to <span className="text-red-500">Log -Out?</span>
              </h3>
              <div className="relative z-10 flex gap-6 w-full">
                <button onClick={handleYes} className="flex-1 group relative py-4 rounded-[18px] overflow-hidden border border-white/5 transition-all">
                  <div className="absolute inset-0 bg-emerald-500/10 group-hover:bg-emerald-500/20" />
                  <span className="relative z-10 font-sans font-black text-emerald-500 uppercase tracking-widest text-sm">YES</span>
                </button>
                <button onClick={onCancel} className="flex-1 group relative py-4 rounded-[18px] overflow-hidden border border-white/5 transition-all">
                  <div className="absolute inset-0 bg-red-500/10 group-hover:bg-red-500/20" />
                  <span className="relative z-10 font-sans font-black text-red-500 uppercase tracking-widest text-sm">NO</span>
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="logout-loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center z-[1000]"
          >
            <div className="relative w-24 h-24 mb-6">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-full h-full animate-spin" viewBox="0 0 100 100">
                  <circle 
                    cx="50" cy="50" r="45" 
                    fill="none" 
                    stroke="white" 
                    strokeWidth="4" 
                    strokeDasharray="70 200" 
                    strokeLinecap="round"
                    className="opacity-90 shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                  />
                </svg>
              </div>
            </div>
            <p className="text-white font-sans font-black uppercase tracking-[0.4em] text-lg opacity-80">
              LOGGING OUT
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

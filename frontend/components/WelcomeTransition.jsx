"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

// ─── RedirectText Component ─────────────────────────────────────────────────
function RedirectText() {
  const [text, setText] = useState("");
  const fullText = "REDIRECTING";
  const [showDots, setShowDots] = useState(false);
  const [dots, setDots] = useState("");

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i <= fullText.length) {
        setText(fullText.slice(0, i));
        i++;
      } else {
        clearInterval(interval);
        setShowDots(true);
      }
    }, 80);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!showDots) return;
    let count = 1;
    const interval = setInterval(() => {
      setDots(".".repeat(count));
      count = (count % 3) + 1;
    }, 400);
    return () => clearInterval(interval);
  }, [showDots]);

  return (
    <div
      className="flex relative w-fit mx-auto select-none"
      style={{ 
        color: "rgba(255,255,255,0.7)", 
        fontFamily: "'Inter', sans-serif",
        fontSize: "9px", 
        letterSpacing: "0.8em",
        textTransform: "uppercase",
        fontWeight: 300,
      }}
    >
      <span>{text}</span>
      <span style={{ position: "absolute", left: "100%", whiteSpace: "pre" }}>
        {showDots ? dots : ""}
      </span>
    </div>
  );
}

// ─── Background Blobs ───────────────────────────────────────────────────────
function BackgroundBlobs() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <motion.div
        animate={{
          x: [0, 500, -300, 200, 0],
          y: [0, -300, 400, -200, 0],
          scale: [1, 1.8, 0.7, 1.4, 1],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute -top-40 -left-40 w-[800px] h-[800px] rounded-full filter blur-[150px] opacity-5"
        style={{ backgroundColor: "rgba(217, 70, 239, 0.6)" }}
      />
      <motion.div
        animate={{
          x: [0, -400, 300, -150, 0],
          y: [0, 400, -300, 250, 0],
          scale: [1, 1.4, 1.8, 0.8, 1],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        className="absolute -bottom-40 -right-40 w-[800px] h-[800px] rounded-full filter blur-[150px] opacity-5"
        style={{ backgroundColor: "rgba(0, 255, 255, 0.6)" }}
      />
    </div>
  );
}

// ─── Domino Chevrons ──────────────────────────────────────────────────────────
function DominoChevrons({ active, isMobile }) {
  const colors = ["#facc15", "#f59e0b", "#f97316", "#ea580c", "#dc2626", "#991b1b"];
  const chevronCount = isMobile ? 12 : 18;
  
  if (isMobile) {
    // Upward vertical sweep from bottom to top spanning full horizontal width for HP design
    return (
      <div 
        className="absolute pointer-events-none z-[5] overflow-hidden flex items-center mix-blend-screen"
        style={{
          transform: "rotate(-90deg)",
          transformOrigin: "center center",
          width: "100vh",
          height: "100vw",
          left: "50%",
          top: "50%",
          marginLeft: "-50vh",
          marginTop: "-50vw",
        }}
      >
        {active && Array.from({ length: chevronCount }).map((_, i) => {
          const colorIndex = Math.floor((i / chevronCount) * colors.length);
          const color = colors[colorIndex];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: "-100%" }}
              animate={{ 
                opacity: [0, 0.6, 0],
                x: ["-100%", "0%", "100%"],
              }}
              transition={{ 
                duration: 2.2, 
                delay: i * 0.12, 
                ease: "circOut" 
              }}
              className="h-[100vh] -ml-[10vw] flex-shrink-0"
              style={{ width: "22vw" }}
            >
              <svg viewBox="0 0 24 24" preserveAspectRatio="none" className="w-full h-full" style={{ color }}>
                <path d="M 0 0 L 12 12 L 0 24 L 8 24 L 20 12 L 8 0 Z" fill="currentColor" />
              </svg>
            </motion.div>
          );
        })}
      </div>
    );
  }

  // Desktop horizontal sweep
  return (
    <div className="absolute inset-0 pointer-events-none z-[5] overflow-hidden flex items-center mix-blend-screen">
      {active && Array.from({ length: chevronCount }).map((_, i) => {
        const colorIndex = Math.floor((i / chevronCount) * colors.length);
        const color = colors[colorIndex];
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -100 }}
            animate={{ 
              opacity: [0, 0.6, 0],
              x: [-100, 0, 100],
            }}
            transition={{ 
              duration: 2.2, 
              delay: i * 0.1, 
              ease: "circOut" 
            }}
            className="h-[100vh] -ml-[10vw] flex-shrink-0"
            style={{ width: "22vw" }}
          >
            <svg viewBox="0 0 24 24" preserveAspectRatio="none" className="w-full h-full" style={{ color }}>
              <path d="M 0 0 L 12 12 L 0 24 L 8 24 L 20 12 L 8 0 Z" fill="currentColor" />
            </svg>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── WelcomeTransition Main ──────────────────────────────────────────────────
export default function WelcomeTransition({ username, onComplete, isNewUser = false }) {
  const [welcomeText, setWelcomeText] = useState("");
  const [userText, setUserText] = useState("");
  const [showGears, setShowGears] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Guarantee single clean username handle without spaces or email domains
  const cleanUsername =
    String(username || "Kalcerian")
      .trim()
      .replace(/^@/, "")
      .split(/\s+/)[0] || "Kalcerian";

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Sequential typing state machine: "Welcome," (for new registration) or "Welcome Back," (for login) -> pause -> then username on newline
  useEffect(() => {
    let isMounted = true;
    const fullWelcome = isNewUser ? "Welcome," : "Welcome Back,";
    const fullUser = cleanUsername;

    let ivWelcome = null;
    let ivUser = null;
    let tExit = null;
    let tEnd = null;

    // Step 1: Initial delay before typing begins
    const tStart = setTimeout(() => {
      if (!isMounted) return;
      let i = 0;
      ivWelcome = setInterval(() => {
        if (!isMounted) return;
        if (i <= fullWelcome.length) {
          setWelcomeText(fullWelcome.slice(0, i));
          i++;
        } else {
          clearInterval(ivWelcome);
          // Step 2: Sequential pause, then start typing username on the new line below
          setTimeout(() => {
            if (!isMounted) return;
            let j = 0;
            ivUser = setInterval(() => {
              if (!isMounted) return;
              if (j <= fullUser.length) {
                setUserText(fullUser.slice(0, j));
                j++;
              } else {
                clearInterval(ivUser);
                // Step 3: Sequential reveal of Domino chevrons and REDIRECTING
                setShowGears(true);
              }
            }, 100);
          }, 240);
        }
      }, 100);
    }, 600);

    // Smooth exit sequence
    tExit = setTimeout(() => {
      if (isMounted) setIsExiting(true);
    }, 6500);

    tEnd = setTimeout(() => {
      if (isMounted && typeof onComplete === "function") onComplete();
    }, 7500);

    return () => {
      isMounted = false;
      clearTimeout(tStart);
      if (ivWelcome) clearInterval(ivWelcome);
      if (ivUser) clearInterval(ivUser);
      if (tExit) clearTimeout(tExit);
      if (tEnd) clearTimeout(tEnd);
    };
  }, [cleanUsername, onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 1, filter: "blur(0px)" }}
      animate={{ 
        opacity: isExiting ? 0 : 1,
        filter: isExiting ? "blur(40px)" : "blur(0px)",
        scale: isExiting ? 1.1 : 1
      }}
      transition={{ duration: 1.2, ease: "easeInOut" }}
      className="fixed inset-0 bg-[#010204] z-[9999] overflow-hidden flex flex-col items-center justify-center select-none"
    >
      {!isMobile && <BackgroundBlobs />}
      <DominoChevrons active={showGears && !isExiting} isMobile={isMobile} />
      
      <div className="relative z-20 flex flex-col items-center w-full px-4 text-center">
        {/* Main Text Container - Sequential & Stacked: "Welcome Back," on top line, username below */}
        <div className="flex flex-col items-center justify-center font-sans font-black tracking-tighter w-full max-w-4xl text-center leading-tight">
          <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl bg-clip-text text-transparent bg-gradient-to-r from-[#FF4D00] via-[#FFD700] to-[#FFCC00] drop-shadow-[0_0_20px_rgba(255,140,0,0.3)] min-h-[1.25em] flex items-center justify-center">
            {welcomeText}
          </h1>
          <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl bg-clip-text text-transparent bg-gradient-to-r from-[#D946EF] to-[#EC4899] drop-shadow-[0_0_20px_rgba(217,70,239,0.3)] break-words break-all max-w-[92vw] min-h-[1.25em] mt-1.5 sm:mt-2.5 px-2 flex items-center justify-center">
            {userText}
          </h1>
        </div>
        
        {/* Redirect Status - Responsive Top Spacing so it NEVER overlaps on any device family */}
        <div className="flex flex-col items-center mt-5 sm:mt-8 h-8 justify-center w-full">
          {showGears && <RedirectText />}
        </div>
      </div>
    </motion.div>
  );
}

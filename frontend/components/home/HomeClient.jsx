"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { getImageProps } from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import IntroPreloader from "@/components/IntroPreloader";

const LandingPage = dynamic(() => import("@/components/LandingPage"), {
  loading: () => <div className="min-h-screen bg-[#050a14]" />,
});

const AuthPage = dynamic(() => import("@/components/AuthPage"), {
  loading: () => <div className="min-h-screen bg-[#050a14]" />,
});

const WelcomeTransition = dynamic(() => import("@/components/WelcomeTransition"), {
  loading: () => <div className="min-h-screen bg-[#050a14]" />,
});

function InitialIntroShell() {
  const common = { alt: "KALCERIA", quality: 75 };
  const {
    props: { srcSet: desktopSrcSet, ...desktopRest },
  } = getImageProps({
    ...common,
    width: 1874,
    height: 560,
    sizes: "280px",
    src: "/logointofadein.webp",
  });
  const {
    props: { srcSet: mobileSrcSet },
  } = getImageProps({
    ...common,
    width: 1104,
    height: 960,
    sizes: "310px",
    src: "/hp/logointro_hp.webp",
  });

  return (
    <div className="min-h-screen bg-[#050a14] relative flex items-center justify-center overflow-hidden">
      <picture className="pointer-events-none select-none opacity-[0.01]">
        <source media="(max-width: 767px)" srcSet={mobileSrcSet} sizes="310px" />
        <source media="(min-width: 768px)" srcSet={desktopSrcSet} sizes="280px" />
        <img
          {...desktopRest}
          alt="KALCERIA"
          fetchPriority="high"
          decoding="sync"
          className="w-[310px] md:w-[280px] h-auto block"
        />
      </picture>
    </div>
  );
}

export default function HomeClient() {
  const [phase, setPhase] = useState("loading"); // "intro" | "landing" | "auth" | "welcome"
  const [username, setUsername] = useState("User");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isAuthParam = urlParams.get("auth") === "true";
    const triggerAuth = sessionStorage.getItem("triggerAuth");

    if (triggerAuth === "true" || isAuthParam) {
      sessionStorage.removeItem("triggerAuth");
      sessionStorage.setItem("introPlayed", "true");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- The route's first phase is intentionally selected from URL/session state after hydration.
      setPhase("auth");
    } else {
      const hasPlayed = sessionStorage.getItem("introPlayed");
      if (hasPlayed) {
        setPhase("landing");
      } else {
        setPhase("intro");
        // Warm LandingPage chunk quietly during idle window so transition is instant when intro finishes
        const warmTimer = setTimeout(() => {
          import("@/components/LandingPage").catch(() => {});
        }, 4800);
        return () => clearTimeout(warmTimer);
      }
    }
  }, []);

  const handleIntroComplete = () => {
    sessionStorage.setItem("introPlayed", "true");
    setPhase("landing");
  };

  if (phase === "loading") {
    return <InitialIntroShell />;
  }

  return (
    <div style={{ background: "#050a14", minHeight: "100vh", position: "relative", overflowX: "hidden" }}>
      <AnimatePresence mode="wait">
        {phase === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
            className="absolute inset-0 z-50"
          >
            <IntroPreloader onComplete={handleIntroComplete} />
          </motion.div>
        )}

        {phase === "landing" && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="w-full"
          >
            <LandingPage onNavigateAuth={() => setPhase("auth")} />
          </motion.div>
        )}

        {phase === "auth" && (
          <motion.div
            key="auth"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="w-full"
          >
            <AuthPage
              onAuthSuccess={(data) => {
                setUsername(data?.username || data?.user?.username || "Commander");
                setPhase("welcome");
              }}
              onBack={() => setPhase("landing")}
            />
          </motion.div>
        )}

        {phase === "welcome" && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full"
          >
            <WelcomeTransition
              username={username}
              onComplete={() => setPhase("landing")}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


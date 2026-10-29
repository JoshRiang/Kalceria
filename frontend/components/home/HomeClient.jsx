"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import IntroPreloader from "@/components/IntroPreloader";
import LandingPage from "@/components/LandingPage";

const AuthPage = dynamic(() => import("@/components/AuthPage"), { ssr: false });
const WelcomeTransition = dynamic(() => import("@/components/WelcomeTransition"), { ssr: false });

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
      }
    }
  }, []);

  const handleIntroComplete = () => {
    sessionStorage.setItem("introPlayed", "true");
    setPhase("landing");
  };

  if (phase === "loading") {
    return <div style={{ background: "#000", minHeight: "100vh" }} />;
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

"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import IntroPreloader from "@/components/IntroPreloader";
import AuthPage from "@/components/AuthPage";
import WelcomeTransition from "@/components/WelcomeTransition";
import LandingPage from "@/components/LandingPage";

export default function Home() {
  const [phase, setPhase] = useState("loading"); // "intro" | "landing" | "auth" | "welcome"
  const [username, setUsername] = useState("User");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasPlayed = sessionStorage.getItem("introPlayed");
      if (hasPlayed) {
        setPhase("landing");
      } else {
        setPhase("intro");
      }
    } else {
      setPhase("intro");
    }
  }, []);

  const handleIntroComplete = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("introPlayed", "true");
    }
    // Transition to the Landing Page first after the epilepsy laser grid
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
                console.log("[Auth] success", data);
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

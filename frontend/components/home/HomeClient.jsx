"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import IntroPreloader from "@/components/IntroPreloader";
import LandingPage from "@/components/LandingPage";
import AuthPage from "@/components/AuthPage";
import WelcomeTransition from "@/components/WelcomeTransition";

export default function HomeClient() {
  const [phase, setPhase] = useState(() => {
    if (typeof window === "undefined") return "landing";
    const urlParams = new URLSearchParams(window.location.search);
    const hasResetToken = Boolean(urlParams.get("token") || urlParams.get("reset_token"));
    if (urlParams.get("auth") === "true" || hasResetToken || sessionStorage.getItem("triggerAuth") === "true") {
      return "auth";
    }
    const navEntry = window.performance?.getEntriesByType?.("navigation")?.[0];
    const isReload = navEntry?.type === "reload";
    if (isReload) {
      sessionStorage.removeItem("introPlayed");
      return "intro";
    }
    if (sessionStorage.getItem("introPlayed") === "true") {
      return "landing";
    }
    return "intro";
  });
  const [username, setUsername] = useState("User");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isAuthParam = urlParams.get("auth") === "true";
    const hasResetToken = Boolean(urlParams.get("token") || urlParams.get("reset_token"));
    const triggerAuth = sessionStorage.getItem("triggerAuth");

    if (triggerAuth === "true" || isAuthParam || hasResetToken) {
      sessionStorage.removeItem("triggerAuth");
      setPhase("auth");
    }
  }, []);

  const handleIntroComplete = () => {
    sessionStorage.setItem("introPlayed", "true");
    setPhase("landing");
  };

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
                sessionStorage.setItem("introPlayed", "true");
                sessionStorage.setItem("landingSeen", "true");
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
              onComplete={() => {
                sessionStorage.setItem("introPlayed", "true");
                sessionStorage.setItem("landingSeen", "true");
                setPhase("landing");
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

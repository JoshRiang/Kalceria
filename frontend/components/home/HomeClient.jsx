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
    if (urlParams.get("auth") === "true" || hasResetToken || urlParams.get("mode") === "forgot-password" || sessionStorage.getItem("triggerAuth") === "true") {
      return "auth";
    }
    if (urlParams.get("skip_intro") === "true") {
      sessionStorage.setItem("introPlayed", "true");
      sessionStorage.setItem("landingSeen", "true");
      return "landing";
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
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isAuthParam = urlParams.get("auth") === "true";
    const hasResetToken = Boolean(urlParams.get("token") || urlParams.get("reset_token"));
    const isForgotMode = urlParams.get("mode") === "forgot-password";
    const triggerAuth = sessionStorage.getItem("triggerAuth");

    if (triggerAuth === "true" || isAuthParam || hasResetToken || isForgotMode) {
      sessionStorage.removeItem("triggerAuth");
      setPhase("auth");
    } else if (urlParams.get("skip_intro") === "true") {
      sessionStorage.setItem("introPlayed", "true");
      sessionStorage.setItem("landingSeen", "true");
      setPhase("landing");
      if (typeof window !== "undefined") {
        if (window.history.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="w-full min-h-screen"
          >
            <AuthPage
              onAuthSuccess={(data) => {
                sessionStorage.setItem("introPlayed", "true");
                sessionStorage.setItem("landingSeen", "true");
                const userObj = data?.user || data;
                const cleanUser =
                  userObj?.nickname ||
                  data?.username ||
                  (userObj?.email ? userObj.email.split("@")[0] : "Kalcerian");
                setUsername(cleanUser);
                setIsNewUser(Boolean(data?.isRegister || data?.isNewUser));
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
              isNewUser={isNewUser}
              onComplete={() => {
                sessionStorage.setItem("introPlayed", "true");
                sessionStorage.setItem("landingSeen", "true");
                sessionStorage.removeItem("triggerAuth");
                if (typeof window !== "undefined" && window.history.replaceState) {
                  window.history.replaceState({}, document.title, window.location.pathname);
                }
                const returnUrl = typeof window !== "undefined" ? localStorage.getItem("kalceria_auth_return") : null;
                if (returnUrl === "/map") {
                  try {
                    localStorage.removeItem("kalceria_auth_return");
                  } catch {}
                  window.location.href = "/map";
                  return;
                }
                setPhase("landing");
                if (typeof window !== "undefined") {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

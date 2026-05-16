"use client";
import { useState, useEffect } from "react";
import IntroPreloader from "@/components/IntroPreloader";
import AuthPage from "@/components/AuthPage";
import WelcomeTransition from "@/components/WelcomeTransition";

import LandingPage from "@/components/LandingPage";

export default function Home() {
  const [phase, setPhase] = useState("loading"); // "intro" | "landing" | "auth" | "welcome" | "app"
  const [username, setUsername] = useState("User");

  useEffect(() => {
    // Check if intro was already seen in this session
    const hasSeenIntro = sessionStorage.getItem("introSeen");
    if (hasSeenIntro) {
      setPhase("landing");
    } else {
      setPhase("intro");
    }
  }, []);

  const handleIntroComplete = () => {
    sessionStorage.setItem("introSeen", "true");
    setPhase("landing");
  };

  if (phase === "loading") {
    return <div style={{ background: "#000", minHeight: "100vh" }} />;
  }

  if (phase === "intro") {
    return <IntroPreloader onComplete={handleIntroComplete} />;
  }

  if (phase === "landing") {
    return <LandingPage onNavigateAuth={() => setPhase("auth")} />;
  }

  if (phase === "auth") {
    return (
      <AuthPage 
        onAuthSuccess={(data) => {
          console.log("[Auth] success", data);
          setUsername(data?.username || data?.user?.username || "Commander");
          setPhase("welcome");
        }} 
        onBack={() => setPhase("landing")}
      />
    );
  }

  if (phase === "welcome") {
    return (
      <WelcomeTransition 
        username={username} 
        onComplete={() => setPhase("landing")} 
      />
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#000", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <h1 style={{ fontSize: "2.5rem", fontWeight: 700 }}>Welcome to Kalceria</h1>
    </main>
  );
}

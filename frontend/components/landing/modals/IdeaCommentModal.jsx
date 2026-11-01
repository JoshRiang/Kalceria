"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import api from "@/lib/api";
import { establishSession, hasUserSession } from "@/lib/session";

export function IdeaCommentModal({ onClose }) {
  const [step, setStep] = useState(0); // 0=Choice, 1=Identity, 2=Category, 3=Content, 4=done
  const [mainType, setMainType] = useState(null);
  const [identity, setIdentity] = useState("Anonymous");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userFound, setUserFound] = useState(false);
  const [error, setError] = useState("");
  const [ideaType, setIdeaType] = useState(null);
  const [adviceText, setAdviceText] = useState("");
  const [submissionStatus, setSubmissionStatus] = useState("submitting"); // submitting | submitted

  // Pre-fill active signed-in user's name if already authenticated
  useEffect(() => {
    if (!hasUserSession()) return;
    let active = true;
    api.get("/users/me")
      .then((res) => {
        if (!active) return;
        const me = res.data?.user;
        if (me?.nickname || me?.name) {
          setUsername((prev) => prev || me.nickname || me.name);
          setUserFound(true);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  // Success close managed in handleSubmit

  const checkUser = async () => {
    setError("");
    const trimmed = username.trim();
    if (!trimmed) return;
    setIsVerifying(true);
    try {
      const res = await api.get(`/auth/check-username/${encodeURIComponent(trimmed)}`);
      if (res.data?.exists) {
        setUserFound(true);
        if (hasUserSession()) {
          setStep(2);
        }
      } else {
        setUserFound(false);
        setError("Account not found. Check your username or email.");
      }
    } catch {
      setUserFound(false);
      setError("Account not found. Check your username or email.");
    } finally {
      setIsVerifying(false);
    }
  };

  const verifyPassword = async () => {
    setError("");
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    setIsVerifying(true);
    try {
      const trimmed = username.trim();
      const loginPayload = trimmed.includes("@")
        ? { email: trimmed, password }
        : { username: trimmed, password };
      const loginRes = await api.post("/auth/login", loginPayload);
      if (loginRes.data?.userId) {
        establishSession(loginRes.data);
        setStep(2);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Invalid password.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setError("");
    setIsSubmitting(true);
    setStep(4);
    setSubmissionStatus("submitting");
    try {
      const submitPromise = api.post("/comments", {
        content: adviceText,
        category: ideaType,
        type: mainType.toUpperCase(),
        username: identity === "User" ? username.trim() : identity,
        identity,
      });
      const minDelay = new Promise(resolve => setTimeout(resolve, 1200));
      await Promise.all([submitPromise, minDelay]);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit. Please try again.");
      setStep(3);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = adviceText.trim().length >= 5 && !isSubmitting;

  // Retained locally to preserve the existing animation restart behavior on modal state changes.
  const Blobs = () => (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none rounded-3xl">
      <motion.div
        animate={{ x: [-20, 40, -20], y: [-20, 20, -20], scale: [1, 1.3, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-16 -left-16 w-64 h-64 bg-[#00FFFF] rounded-full blur-[80px] opacity-25"
      />
      <motion.div
        animate={{ x: [20, -50, 20], y: [20, -20, 20], scale: [1.2, 1, 1.2] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        className="absolute top-1/2 -right-16 w-72 h-72 bg-[#D946EF] rounded-full blur-[90px] opacity-20"
      />
      <motion.div
        animate={{ x: [0, 30, 0], y: [30, -30, 30], scale: [1, 1.15, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute -bottom-16 left-1/4 w-56 h-56 bg-[#06B6D4] rounded-full blur-[70px] opacity-20"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={step < 4 ? onClose : undefined}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Full-screen processing blur overlay matching LOGGING OUT */}
      <AnimatePresence>
        {step === 4 && (
          <motion.div
            key="blur-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center select-none"
          >
            <div className="relative z-10 flex flex-col items-center justify-center px-4">
              {/* BIG Responsive Arc Spinner matching LOGGING OUT */}
              <div className="relative w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 mb-6 sm:mb-8">
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-full h-full animate-spin" viewBox="0 0 100 100">
                    <circle 
                      cx="50" cy="50" r="45" 
                      fill="none" 
                      stroke="white" 
                      strokeWidth="4" 
                      strokeDasharray="70 200" 
                      strokeLinecap="round"
                      className="opacity-90 shadow-[0_0_20px_rgba(255,255,255,0.6)]"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-white font-sans font-black uppercase tracking-[0.4em] text-lg sm:text-2xl md:text-3xl opacity-90 drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                SUBMITTING COMMENT
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Card */}
      <AnimatePresence mode="wait">
        {step < 4 && (
          <motion.div
            key={`step-${step}`}
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, filter: "blur(8px)" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[480px] z-[1001]"
          >
            <div className="relative bg-[#060d1f]/90 backdrop-blur-3xl border border-cyan-500/20 rounded-3xl p-8 md:p-10 overflow-hidden shadow-[0_0_60px_rgba(0,255,255,0.1),0_0_120px_rgba(217,70,239,0.08),0_30px_80px_rgba(0,0,0,0.6)]">
              {/* Preserve the existing animation restart behavior across modal state renders. */}
              {/* eslint-disable-next-line react-hooks/static-components -- A stable component changes its current animation timing. */}
              <Blobs />

              {/* Glow border top */}
              <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent rounded-t-3xl" />

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all text-sm"
              >
                ✕
              </button>

              {/* Phase Indicator - 4 Steps */}
              <div className="relative z-10 flex items-center gap-2 mb-10 justify-center">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black font-mono transition-all duration-500 border ${
                      step > i
                        ? "bg-white border-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                        : step === i
                          ? "bg-white/10 border-white/40 text-white"
                          : "bg-white/5 backdrop-blur-md border-white/5 text-white/20"
                    }`}>
                      {i + 1}
                    </div>
                    {i < 3 && (
                      <div className={`h-[1px] w-6 md:w-10 rounded-full transition-all duration-700 ${
                        step > i ? "bg-white" : "bg-white/5 backdrop-blur-sm"
                      }`} />
                    )}
                  </div>
                ))}
              </div>

              {/* ── Step 0: Advice or Idea ── */}
              {step === 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="relative z-10 flex flex-col gap-6"
                >
                  <div>
                    <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
                      What&apos;s The Type?
                    </h3>
                    <p className="text-white/40 text-sm font-sans mt-1">What would you like to share?</p>
                  </div>

                  <div className="flex flex-col gap-3">
                    {["Advice", "Idea"].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setMainType(opt)}
                        className={`w-full py-4 px-5 rounded-xl border text-left font-sans font-black text-sm uppercase tracking-widest transition-all duration-300 ${
                          mainType === opt
                            ? "bg-white/15 border-white/30 text-white"
                            : "bg-white/5 border-white/10 text-white/50 hover:bg-white/8 hover:border-white/20 hover:text-white/70"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  <motion.button
                    whileHover={mainType ? { scale: 1.02 } : {}}
                    whileTap={mainType ? { scale: 0.98 } : {}}
                    onClick={() => mainType && setStep(1)}
                    disabled={!mainType}
                    className={`w-full py-4 rounded-xl font-sans font-black text-sm uppercase tracking-widest transition-all ${
                      mainType
                        ? "text-white bg-white/10 border border-white/20 hover:bg-white/15 hover:border-white/30"
                        : "text-white/20 bg-white/5 border border-white/5 cursor-not-allowed"
                    }`}
                  >
                    Continue
                  </motion.button>
                </motion.div>
              )}

              {/* ── Step 1: Identity ── */}
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="relative z-10 flex flex-col gap-6"
                >
                  <div>
                    <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
                      Share As...
                    </h3>
                    <p className="text-white/40 text-sm font-sans mt-1">Who are you sharing as?</p>
                  </div>

                  <div className="flex flex-col gap-3">
                    {["Anonymous", "User"].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => { setIdentity(opt); setError(""); }}
                        className={`w-full py-3.5 px-5 rounded-xl border text-left font-sans font-bold text-sm uppercase tracking-wider transition-all duration-300 ${
                          identity === opt
                            ? "bg-white/15 border-white/30 text-white"
                            : "bg-white/5 border-white/10 text-white/50 hover:bg-white/8 hover:border-white/20 hover:text-white/70"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  <AnimatePresence>
                    {identity === "User" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden flex flex-col gap-3"
                      >
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Enter username or email"
                            value={username}
                            onChange={(e) => {
                              setUsername(e.target.value);
                              setError("");
                              setUserFound(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                if (!userFound) checkUser();
                                else if (hasUserSession()) setStep(2);
                              }
                            }}
                            className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white font-sans text-sm focus:outline-none transition-all ${
                              error ? "border-red-500/50 focus:border-red-500" : "border-white/20 focus:border-white/40"
                            }`}
                          />
                          {userFound && !error && (
                            <p className="text-[10px] text-emerald-400 font-sans mt-1 ml-1">
                              {hasUserSession() ? "Account verified from active session." : "Account found. Enter password to continue."}
                            </p>
                          )}
                          {error && (
                            <div className="p-2.5 bg-red-500/15 border border-red-500/30 rounded-md flex items-center gap-2 mt-2">
                              <span className="text-red-400 text-xs font-mono select-none">✕</span>
                              <span className="font-sans text-xs text-red-200 font-normal">{error}</span>
                            </div>
                          )}
                        </div>

                        {userFound && !hasUserSession() && (
                          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                            <input
                              type="password"
                              placeholder="Password"
                              value={password}
                              onChange={(e) => {
                                setPassword(e.target.value);
                                setError("");
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  verifyPassword();
                                }
                              }}
                              className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white font-sans text-sm focus:outline-none focus:border-white/40 transition-all"
                            />
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep(0)}
                      className="flex-1 py-4 rounded-xl font-sans font-black text-sm uppercase tracking-widest text-white/40 bg-white/5 border border-white/10 hover:bg-white/8 hover:border-white/20 hover:text-white/60 transition-all"
                    >
                      Back
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (identity === "Anonymous") setStep(2);
                        else if (!userFound) checkUser();
                        else if (!hasUserSession()) verifyPassword();
                        else setStep(2);
                      }}
                      disabled={isVerifying || (identity === "User" && !username.trim())}
                      className={`flex-[2] py-4 rounded-xl font-sans font-black text-sm uppercase tracking-widest transition-all ${
                        isVerifying || (identity === "User" && !username.trim())
                          ? "text-white/20 bg-white/5 border border-white/5 cursor-not-allowed"
                          : "text-white bg-white/10 border border-white/20 hover:bg-white/15 hover:border-white/30"
                      }`}
                    >
                      {isVerifying ? "..." : (identity === "User" && !userFound) ? "Check" : "Continue"}
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 2: Category ── */}
              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="relative z-10 flex flex-col gap-6"
                >
                  <div>
                    <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
                      What is it?
                    </h3>
                    <p className="text-white/40 text-sm font-sans mt-1">
                      {mainType === "Idea" ? "What type of idea is this?" : "What category does this advice fall into?"}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    {[
                      { key: "Event", desc: "Community events, meetups, gatherings" },
                      { key: "Web Development", desc: "Features, UI/UX, tech improvements" },
                      { key: "Other", desc: "Anything else on your mind" },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => setIdeaType(opt.key)}
                        className={`w-full py-3.5 px-5 rounded-xl border text-left transition-all duration-300 ${
                          ideaType === opt.key
                            ? "bg-white/15 border-white/30"
                            : "bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20"
                        }`}
                      >
                        <span className={`font-sans font-bold text-sm uppercase tracking-wider block ${
                          ideaType === opt.key ? "text-white" : "text-white/50"
                        }`}>
                          {opt.key}
                        </span>
                        <span className="font-sans text-xs text-white/30 mt-0.5 block">{opt.desc}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep(1)}
                      className="flex-1 py-4 rounded-xl font-sans font-black text-sm uppercase tracking-widest text-white/40 bg-white/5 border border-white/10 hover:bg-white/8 hover:border-white/20 hover:text-white/60 transition-all"
                    >
                      Back
                    </button>
                    <motion.button
                      whileHover={ideaType ? { scale: 1.02 } : {}}
                      whileTap={ideaType ? { scale: 0.98 } : {}}
                      onClick={() => ideaType && setStep(3)}
                      className={`flex-[2] py-4 rounded-xl font-sans font-black text-sm uppercase tracking-widest transition-all ${
                        ideaType
                          ? "text-white bg-white/10 border border-white/20 hover:bg-white/15 hover:border-white/30"
                          : "text-white/20 bg-white/5 border border-white/5 cursor-not-allowed"
                      }`}
                    >
                      Continue
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 3: Content ── */}
              {step === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="relative z-10 flex flex-col gap-6"
                >
                  <div>
                    <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
                      Let us hear your thoughts!
                    </h3>
                    <p className="text-white/40 text-sm font-sans mt-1">
                      {mainType === "Idea" ? "Describe your idea below" : "Share your advice with us"}
                    </p>
                  </div>

                  <div className="relative">
                    <textarea
                      value={adviceText}
                      onChange={(e) => setAdviceText(e.target.value.slice(0, 200))}
                      placeholder={
                        ideaType === "Event"
                          ? "Describe your event idea..."
                          : ideaType === "Web Development"
                          ? "Describe your web development idea..."
                          : "Share your thoughts with us..."
                      }
                      rows={5}
                      maxLength={200}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 pb-8 text-white text-sm font-sans resize-none focus:outline-none focus:border-white/25 focus:bg-white/8 placeholder-white/20 transition-all"
                      style={{ backdropFilter: "blur(10px)" }}
                    />
                    <div className="absolute bottom-3 right-4 text-xs font-mono">
                      <span className={adviceText.trim().length < 5 ? "text-white/25" : "text-white/40"}>
                        {adviceText.length}
                      </span>
                      <span className="text-white/20">/200</span>
                    </div>
                    {error && (
                      <div className="p-2.5 bg-red-500/15 border border-red-500/30 rounded-md flex items-center gap-2 mt-2">
                        <span className="text-red-400 text-xs font-mono select-none">✕</span>
                        <span className="font-sans text-xs text-red-200 font-normal">{error}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep(2)}
                      className="flex-1 py-4 rounded-xl font-sans font-black text-sm uppercase tracking-widest text-white/40 bg-white/5 border border-white/10 hover:bg-white/8 hover:border-white/20 hover:text-white/60 transition-all"
                    >
                      Back
                    </button>
                    <motion.button
                      whileHover={canSubmit ? { scale: 1.02 } : {}}
                      whileTap={canSubmit ? { scale: 0.98 } : {}}
                      onClick={canSubmit ? handleSubmit : undefined}
                      disabled={!canSubmit}
                      className={`flex-[2] py-4 rounded-xl font-sans font-black text-sm uppercase tracking-widest transition-all duration-500 ${
                        canSubmit
                          ? "text-white bg-white/15 border border-white/30 hover:bg-white/20 hover:border-white/40"
                          : "text-white/20 bg-white/5 border border-white/5 cursor-not-allowed"
                      }`}
                    >
                      {isSubmitting ? "Submitting..." : "Submit"}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";

export default function ChooseUsernameStep({
  initialUsername = "",
  onDone,
  isProcessing = false,
}) {
  const [username, setUsername] = useState(initialUsername);
  const [isAvailable, setIsAvailable] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const debounceRef = useRef(null);

  // Sync initial suggested username
  useEffect(() => {
    if (initialUsername) {
      setUsername(initialUsername);
      checkAvailability(initialUsername);
    }
  }, [initialUsername]);

  async function checkAvailability(val) {
    const clean = (val || "").trim();
    if (!clean) {
      setIsAvailable(false);
      setErrorMsg("Username cannot be empty");
      setIsChecking(false);
      return;
    }
    if (clean.length < 2) {
      setIsAvailable(false);
      setErrorMsg("Username must be at least 2 characters");
      setIsChecking(false);
      return;
    }
    if (clean.length > 40) {
      setIsAvailable(false);
      setErrorMsg("Username cannot exceed 40 characters");
      setIsChecking(false);
      return;
    }

    setIsChecking(true);
    setErrorMsg("");
    try {
      const res = await api.get(`/auth/check-username/${encodeURIComponent(clean)}`);
      const exists = Boolean(res.data?.exists);
      if (exists) {
        setIsAvailable(false);
        setErrorMsg("Username is already taken");
      } else {
        setIsAvailable(true);
        setErrorMsg("");
      }
    } catch {
      // In case endpoint has an issue, assume available if clean
      setIsAvailable(true);
      setErrorMsg("");
    } finally {
      setIsChecking(false);
    }
  }

  const handleInputChange = (e) => {
    const nextVal = e.target.value;
    setUsername(nextVal);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      checkAvailability(nextVal);
    }, 350);
  };

  const handleDoneClick = () => {
    const clean = username.trim();
    if (!clean || !isAvailable || isChecking || isProcessing) return;
    onDone(clean);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && isAvailable && !isChecking && !isProcessing) {
      e.preventDefault();
      handleDoneClick();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-4 px-2 select-none">
      {/* ── Title: Firm White (Font style like Picture 5) ── */}
      <h2 className="font-sans text-2xl sm:text-3xl font-extrabold text-white tracking-tight text-center mb-2">
        Choose Username
      </h2>
      <p className="font-mono text-xs text-slate-400 text-center mb-6 max-w-xs">
        Set your unique identity for the Kalceria community.
      </p>

      <div className="w-full max-w-sm flex flex-col items-center">
        {/* ── Status Text Above Box: Green if available, Orange if not ── */}
        <div className="min-h-[22px] flex items-center justify-center mb-2">
          {isChecking ? (
            <span className="font-mono text-xs text-slate-400 animate-pulse">
              Checking availability…
            </span>
          ) : isAvailable ? (
            <span className="font-sans text-xs font-semibold text-emerald-400 tracking-wide text-center">
              Username available, check the grammar ya
            </span>
          ) : (
            <span className="font-sans text-xs font-semibold text-amber-400 tracking-wide text-center">
              {errorMsg || "Username is not available"}
            </span>
          )}
        </div>

        {/* ── Username Input Box ── */}
        <div
          className={`w-full flex items-center bg-[#0c1528] border rounded-lg px-4 py-3 transition-all ${
            isAvailable && username.trim()
              ? "border-emerald-400 ring-1 ring-emerald-400/40 shadow-[0_0_15px_rgba(52,211,153,0.25)]"
              : !isAvailable && username.trim()
              ? "border-amber-400 ring-1 ring-amber-400/30"
              : "border-slate-700"
          }`}
        >
          <input
            type="text"
            value={username}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isProcessing}
            placeholder="e.g. Reyhan Batara"
            autoFocus
            maxLength={40}
            className="w-full bg-transparent text-center font-sans text-lg sm:text-xl font-extrabold text-white outline-none placeholder:text-slate-600"
          />
        </div>

        {/* ── Done Button: WhatsApp Photo Crop Modal Style & Behaviour ── */}
        <div className="mt-8 flex justify-center w-full">
          <button
            type="button"
            onClick={handleDoneClick}
            disabled={!isAvailable || isChecking || isProcessing || !username.trim()}
            className="text-emerald-400 hover:text-emerald-300 active:text-emerald-500 font-bold text-base sm:text-lg tracking-wider cursor-pointer transition-opacity bg-transparent border-none p-3 outline-none disabled:opacity-30 disabled:cursor-not-allowed uppercase"
          >
            {isProcessing ? "Saving…" : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import api from "@/lib/api";
import { establishSession } from "@/lib/session";
import { persistProfileIdentityCache } from "@/lib/profileIdentity";
import {
  generateUsernameCandidates,
  findFirstAvailableUsername,
} from "./usernameAlgorithm";

export function useUsernameSetup({
  otp,
  otpEmail,
  setError,
  setSuccess,
  setIsBuffering,
  setMode,
  setCroppedAvatar,
  onAuthSuccess,
}) {
  const registeredCredsRef = useRef({
    email: "",
    password: "",
    name: "",
    dob: "",
    profilePicture: null,
  });
  const [suggestedUsername, setSuggestedUsername] = useState("");
  const activeSessionRef = useRef(null);

  // ── Verify OTP -> Screen Blur + Loading Buffer -> Choose Username ──
  async function handleVerifyOtp() {
    const code = otp.join("");
    if (code.length < 6) {
      setError("Masukkan 6 digit kode OTP.");
      return;
    }
    setError("");
    setSuccess("");

    // Start background process with loading buffer & blur
    setIsBuffering(true);
    try {
      // 1. Verify OTP with backend (marks pending registration as verified)
      await api.post("/auth/otp/verify", { email: otpEmail, otp: code });

      // 2. Run Username Suggestion Algorithm based on name + email
      const creds = registeredCredsRef.current;
      const candidates = generateUsernameCandidates(creds.name, creds.email, creds.dob);
      const chosen = await findFirstAvailableUsername(candidates, async (cand) => {
        const checkRes = await api.get(`/auth/check-username/${encodeURIComponent(cand)}`);
        return !checkRes.data?.exists;
      });

      setSuggestedUsername(chosen);

      // Brief transition before showing Choose Username modal
      setTimeout(() => {
        setIsBuffering(false);
        setMode("choose-username");
      }, 700);
    } catch (err) {
      setIsBuffering(false);
      setError(err.response?.data?.error || err.message || "OTP salah atau kedaluwarsa.");
    }
  }

  // ── Post-Username Submission -> Loading Buffer -> Welcome Back -> Landing ──
  async function handleUsernameDone(chosenUsername) {
    setIsBuffering(true);
    setError("");
    try {
      const creds = registeredCredsRef.current;
      // Atomically commit user (including confirmed cropped profile photo) to database and issue authenticated session
      const res = await api.post("/auth/register/complete", {
        email: creds.email || otpEmail,
        username: chosenUsername,
        profilePicture: creds.profilePicture || undefined,
      });

      if (res.data?.user) {
        const confirmedAvatar = res.data.user.profilePicture || creds.profilePicture || null;
        const hydratedUser = confirmedAvatar
          ? { ...res.data.user, profilePicture: confirmedAvatar }
          : res.data.user;
        if (confirmedAvatar) {
          persistProfileIdentityCache(hydratedUser, { profilePicture: confirmedAvatar });
          persistProfileIdentityCache({ nickname: chosenUsername }, { profilePicture: confirmedAvatar });
        }
        establishSession(hydratedUser);
        activeSessionRef.current = { ...res.data, user: hydratedUser };
      }
      setCroppedAvatar(null);

      // Transition directly to Welcome greeting while buffer stays rock-solid in dead center
      setTimeout(() => {
        onAuthSuccess?.({
          ...res.data,
          isRegister: true,
          isNewUser: true,
          username: chosenUsername,
        });
        setTimeout(() => {
          setIsBuffering(false);
        }, 350);
      }, 700);
    } catch (err) {
      setIsBuffering(false);
      setError(err.response?.data?.error || "Gagal menyimpan username. Coba lagi.");
    }
  }

  return {
    registeredCredsRef,
    suggestedUsername,
    setSuggestedUsername,
    activeSessionRef,
    handleVerifyOtp,
    handleUsernameDone,
  };
}

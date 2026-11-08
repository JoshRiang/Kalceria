"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import api from "@/lib/api";
import { establishSession } from "@/lib/session";

export function useGoogleOAuth({
  setError,
  setSuccess,
  onAuthSuccess,
  setForm,
  setMode,
  setCroppedAvatar,
  modeRef,
}) {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isGooglePrefill, setIsGooglePrefill] = useState(false);
  const [verifiedCitiesMap, setVerifiedCitiesMap] = useState({});
  const [extraCitiesList, setExtraCitiesList] = useState([]);

  const citySearchTimeoutRef = useRef(null);
  const popupRef = useRef(null);
  const handleCityInput = useCallback((query) => {
    if (citySearchTimeoutRef.current) clearTimeout(citySearchTimeoutRef.current);
    const q = String(query || "").trim();
    if (q.length < 2) return;
    citySearchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/location/cities?q=${encodeURIComponent(q)}`);
        const found = res.data?.cities || [];
        if (found.length > 0) {
          setVerifiedCitiesMap((prev) => {
            const next = { ...prev };
            found.forEach((c) => {
              const k1 = String(c.name || "").toLowerCase().trim();
              const k2 = String(c.label || "").toLowerCase().trim();
              if (k1) next[k1] = c;
              if (k2) next[k2] = c;
            });
            return next;
          });
          setExtraCitiesList((prev) => {
            const set = new Set([...prev, ...found.map((c) => c.label || c.name)]);
            return Array.from(set).slice(0, 30);
          });
        }
      } catch {}
    }, 220);
  }, []);

  const applyGoogleOAuthResult = useCallback((result) => {
    setGoogleLoading(false);
    if (popupRef.current && !popupRef.current.closed) {
      try {
        popupRef.current.close();
      } catch {}
    }
    if (!result) return;
    if (!result.ok) {
      setError(result.error || "Google Sign-In failed.");
      return;
    }

    const payload = result.payload || {};
    if (payload.status === "EXISTING_USER") {
      if (payload.csrfToken) sessionStorage.setItem("kalceriaCsrfToken", payload.csrfToken);
      establishSession(payload.user || payload);
      setSuccess("Authentication successful.");
      setTimeout(() => {
        onAuthSuccess?.({ ...payload, isNewUser: false, isRegister: false });
      }, 600);
      return;
    }

    if (payload.status === "NEW_USER") {
      const gp = payload.googleProfile || {};
      setIsGooglePrefill(true);

      if (gp.city) {
        const cityKey = String(gp.city).toLowerCase().trim();
        const cityObj = {
          name: gp.city,
          label: gp.cityLabel || gp.city,
          lat: gp.domicileLat,
          lng: gp.domicileLng,
          cityToken: gp.cityToken,
        };
        setVerifiedCitiesMap((prev) => ({ ...prev, [cityKey]: cityObj }));
        setExtraCitiesList((prev) => Array.from(new Set([gp.cityLabel || gp.city, ...prev])));
      }

      if (modeRef) modeRef.current = "register";
      setForm({
        name: gp.name || "",
        email: gp.email || "",
        dob: gp.birthYear ? String(gp.birthYear) : "",
        domicile: gp.city || "",
        domicileLat: gp.domicileLat ?? undefined,
        domicileLng: gp.domicileLng ?? undefined,
        cityToken: gp.cityToken || undefined,
        password: "",
        confirmPassword: "",
      });

      setCroppedAvatar(null);
      setError("");
      setSuccess("");
      setMode("register");
    }
  }, [onAuthSuccess, setError, setSuccess, setForm, setMode, setCroppedAvatar, modeRef]);

  // Google OAuth Listener & Handoff Consumer
  useEffect(() => {
    try {
      const handoffRaw = localStorage.getItem("kalceria_google_oauth_handoff");
      if (handoffRaw) {
        localStorage.removeItem("kalceria_google_oauth_handoff");
        const handoff = JSON.parse(handoffRaw);
        if (Date.now() - (handoff.ts || 0) < 60_000) {
          applyGoogleOAuthResult(handoff);
        }
      }
    } catch {}

    let bc;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        bc = new BroadcastChannel("kalceria_google_oauth");
        bc.onmessage = (event) => {
          if (event.data?.type === "KALCERIA_GOOGLE_OAUTH_RESULT") {
            applyGoogleOAuthResult(event.data);
          }
        };
      }
    } catch {}

    const handlePostMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "KALCERIA_GOOGLE_OAUTH_RESULT") {
        applyGoogleOAuthResult(event.data);
      }
    };
    window.addEventListener("message", handlePostMessage);

    return () => {
      if (bc) bc.close();
      window.removeEventListener("message", handlePostMessage);
    };
  }, [applyGoogleOAuthResult]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError("");
    setSuccess("");

    try {
      const redirectUri = `${window.location.origin}/auth/google/callback`;
      const res = await api.get(`/auth/google/start?redirectUri=${encodeURIComponent(redirectUri)}&mode=popup`);
      const { authUrl } = res.data || {};

      if (!authUrl) {
        throw new Error("Unable to obtain Google sign-in URL.");
      }

      const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth <= 640;
      if (isMobileDevice) {
        window.location.href = authUrl;
        return;
      }

      const width = 500;
      const height = 620;
      const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
      const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);
      const popup = window.open(
        authUrl,
        "kalceria_google_oauth",
        `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
      );
      popupRef.current = popup;

      if (!popup || popup.closed || typeof popup.closed === "undefined") {
        window.location.href = authUrl;
        return;
      }

      const checkTimer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkTimer);
          setGoogleLoading(false);
        }
      }, 1000);
    } catch (err) {
      setGoogleLoading(false);
      const msg = err.response?.data?.error || err.message || "Failed to start Google sign-in.";
      setError(msg);
    }
  };

  return {
    googleLoading,
    setGoogleLoading,
    isGooglePrefill,
    setIsGooglePrefill,
    verifiedCitiesMap,
    setVerifiedCitiesMap,
    extraCitiesList,
    setExtraCitiesList,
    handleCityInput,
    handleGoogleSignIn,
    applyGoogleOAuthResult,
  };
}

"use client";

import api from "@/lib/api";
import { EMAIL_AUTH_ENABLED, PUBLIC_SIGNUP_ENABLED } from "@/lib/authConfig";
import { establishSession } from "@/lib/session";
import { persistProfileIdentityCache } from "@/lib/profileIdentity";
import { isKnownCity } from "@/lib/indonesianCities";
import {
  PASSWORD_CHECK_REGEX,
  checkBornYear,
  optimizeAvatarForBackend,
} from "./authHelpers";

export function useAuthSubmit({
  form,
  mode,
  modeRef,
  verifiedCitiesMap,
  croppedAvatar,
  setCroppedAvatar,
  registeredCredsRef,
  setLoading,
  setError,
  setSuccess,
  setMode,
  setOtpEmail,
  setOtp,
  setResendCooldown,
  setIsOtpExpired,
  setForm,
  onAuthSuccess,
}) {
  // ── Live validation flags ──
  const nameValid = Boolean(form.name && form.name.trim().length >= 2);

  const yearCheck = checkBornYear(form.dob);
  const isDobValid = yearCheck.valid;
  const isDobError = !yearCheck.valid && !yearCheck.empty;

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,12}$/;
  const isEmailValid = emailRegex.test(form.email || "");
  const isEmailError = Boolean(form.email && !isEmailValid);

  const cityValid = isKnownCity(form.domicile, verifiedCitiesMap);
  const isCityError = Boolean(form.domicile && form.domicile.trim().length >= 3 && !cityValid);

  const passwordValid = PASSWORD_CHECK_REGEX.test(form.password || "");
  const isPasswordError = Boolean(form.password && form.password.length > 0 && !passwordValid);

  const isConfirmValid = Boolean(
    form.confirmPassword &&
      form.confirmPassword === form.password &&
      passwordValid
  );
  const isConfirmError = Boolean(
    form.confirmPassword &&
      form.confirmPassword !== form.password
  );
  const confirmMessage = isConfirmError
    ? "Passwords do not match"
    : isConfirmValid
    ? "Matches"
    : "";

  // ── Form Submit: Login or Register ──
  async function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    if (mode !== "login" && mode !== "register") return;
    setError("");
    setSuccess("");
    let matchedCoord = null;
    let matchedToken = null;

    if (mode === "login") {
      if (!form.email?.trim() || !form.password) {
        setError("Please enter your email and password.");
        return;
      }
      // If this is a normal login (not preceded by password reset done), ensure zero stale return flags linger
      if (typeof window !== "undefined" && sessionStorage.getItem("kalceria_is_password_reset_login") !== "true") {
        try {
          localStorage.removeItem("kalceria_auth_return");
          localStorage.removeItem("kalceria_password_reset_from_map");
          sessionStorage.removeItem("kalceria_auth_return");
          sessionStorage.removeItem("kalceria_password_reset_from_map");
        } catch {}
      }
    } else if (mode === "register") {
      if (!PUBLIC_SIGNUP_ENABLED) {
        setError("Public registration is currently disabled.");
        return;
      }

      // 1. Born year validation (18+ years old)
      const yearResult = checkBornYear(form.dob);
      if (!yearResult.valid) {
        setError(yearResult.message || "You must be at least 18 years old to register.");
        return;
      }

      // 2. City validation: must be in the known cities list (Indonesia priority + dynamic worldwide)
      let currentCityValid = isKnownCity(form.domicile, verifiedCitiesMap);

      if (!currentCityValid && form.domicile && form.domicile.trim().length >= 2) {
        try {
          const res = await api.get(`/location/cities?q=${encodeURIComponent(form.domicile.trim())}`);
          const found = res.data?.cities || [];
          const matched = found.find((c) => {
            const cName = String(c.name || "").toLowerCase().trim();
            const cLabel = String(c.label || "").toLowerCase().trim();
            const q = form.domicile.trim().toLowerCase();
            return cName === q || cLabel === q || (q.length >= 4 && cName.startsWith(q));
          });
          if (matched) {
            currentCityValid = true;
            matchedCoord = [matched.lat, matched.lng];
            matchedToken = matched.cityToken;
          }
        } catch {}
      }

      if (!currentCityValid) {
        setError("City is not in the list.");
        return;
      }

      // 3. Password validation: 4 strict criteria
      if (!PASSWORD_CHECK_REGEX.test(form.password)) {
        setError("Password must meet all 4 requirements below.");
        return;
      }

      // 4. Confirm Password validation
      if (form.password !== form.confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const res = await api.post("/auth/login", {
          email: form.email.trim(),
          password: form.password,
        });
        establishSession(res.data);
        setSuccess("Authentication successful.");
        setTimeout(() => onAuthSuccess?.(res.data), 800);
      } else {
        const registeredEmail = form.email.trim();
        const registeredPassword = form.password;
        const registeredName = form.name.trim();
        const profilePicture = await optimizeAvatarForBackend(croppedAvatar);
        const birthDateIso = `${String(form.dob).trim()}-01-01`;

        // Store credentials & cropped profile photo in ref until registration completes at Choose Username Done
        if (registeredCredsRef) {
          registeredCredsRef.current = {
            email: registeredEmail,
            password: registeredPassword,
            name: registeredName,
            dob: String(form.dob).trim(),
            profilePicture: profilePicture || null,
          };
        }

        const domicileLatToSend = matchedCoord ? matchedCoord[0] : form.domicileLat;
        const domicileLngToSend = matchedCoord ? matchedCoord[1] : form.domicileLng;
        const cityTokenToSend = matchedToken || form.cityToken;

        const regRes = await api.post("/auth/register", {
          name: registeredName,
          dob: birthDateIso,
          email: registeredEmail,
          domicile: form.domicile?.trim() || undefined,
          domicileLat: domicileLatToSend,
          domicileLng: domicileLngToSend,
          cityToken: cityTokenToSend,
          gender: "OTHER",
          password: registeredPassword,
          profilePicture,
        });

        if (EMAIL_AUTH_ENABLED && regRes.data?.emailVerificationRequired) {
          if (modeRef) modeRef.current = "verify";
          setOtpEmail(registeredEmail);
          setOtp(["", "", "", "", "", ""]);
          setResendCooldown(60); // 1 minute max OTP
          setIsOtpExpired(false);
          setMode("verify");
          setForm({});
          setSuccess("Kode OTP telah dikirim ke email kamu.");
        } else {
          // Direct login if OTP disabled
          try {
            const loginRes = await api.post("/auth/login", {
              email: registeredEmail,
              password: registeredPassword,
            });
            if (profilePicture && loginRes.data?.userId) {
              persistProfileIdentityCache(
                { id: loginRes.data.userId, nickname: loginRes.data.username },
                { profilePicture }
              );
            }
            setCroppedAvatar(null);
            establishSession(loginRes.data);
            setSuccess("Account created! Signing you in...");
            setTimeout(() => onAuthSuccess?.(loginRes.data), 800);
          } catch {
            if (modeRef) modeRef.current = "login";
            setCroppedAvatar(null);
            setMode("login");
            setForm({ email: registeredEmail, password: "", confirmPassword: "" });
            setSuccess("Registration successful! Please sign in.");
          }
        }
      }
    } catch (err) {
      let msg = err.response?.data?.error || err.message || "An error occurred.";
      if (msg.includes("prisma")) {
        if (msg.includes("dob") || msg.includes("Invalid Date")) {
          msg = "Format tahun lahir tidak valid.";
        } else if (msg.includes("Unique constraint failed")) {
          msg = "Email sudah terdaftar.";
        } else {
          msg = "Terjadi kesalahan pada sistem registrasi. Coba lagi.";
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return {
    nameValid,
    yearCheck,
    isDobValid,
    isDobError,
    isEmailValid,
    isEmailError,
    cityValid,
    isCityError,
    passwordValid,
    isPasswordError,
    isConfirmValid,
    isConfirmError,
    confirmMessage,
    handleSubmit,
  };
}

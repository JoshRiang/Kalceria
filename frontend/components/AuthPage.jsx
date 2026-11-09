"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PUBLIC_SIGNUP_ENABLED } from "@/lib/authConfig";
import { PhotoCropEditorModal } from "@/components/map/modals/PhotoCropEditorModal";

// Modular Subcomponents & Hooks
import VerifyOtpStep from "@/components/auth/VerifyOtpStep";
import ChooseUsernameStep from "@/components/auth/ChooseUsernameStep";
import ForgotPasswordStep from "@/components/auth/ForgotPasswordStep";
import ChooseNewPasswordStep from "@/components/auth/ChooseNewPasswordStep";
import AuthBufferOverlay from "@/components/auth/AuthBufferOverlay";
import { AuthPageHeader } from "@/components/auth/AuthPageHeader";
import { AuthPageFooter } from "@/components/auth/AuthPageFooter";
import { AuthFormBody } from "@/components/auth/AuthFormBody";
import { useGoogleOAuth } from "@/components/auth/useGoogleOAuth";
import { useOtpVerification } from "@/components/auth/useOtpVerification";
import { usePhotoCropHandler } from "@/components/auth/usePhotoCropHandler";
import { usePasswordResetFlow } from "@/components/auth/usePasswordResetFlow";
import { useUsernameSetup } from "@/components/auth/useUsernameSetup";
import { useAuthSubmit } from "@/components/auth/useAuthSubmit";

// ── Main Component ────────────────────────────────────────────────────────────
export default function AuthPage({ onAuthSuccess, onBack }) {
  // Modes: "login" | "register" | "verify" | "choose-username" | "choose-new-password" | "forgot-password"
  const [mode, setMode] = useState(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get("token") || urlParams.get("reset_token");
      if (token) return "choose-new-password";
      const urlMode = urlParams.get("mode");
      if (urlMode === "forgot-password") return "forgot-password";
      if (urlParams.get("reset_success") === "true") return "login";
    }
    return "login";
  });
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mounted, setMounted] = useState(false);

  // Buffer Overlay (inherit from logging out buffer with no words)
  const [isBuffering, setIsBuffering] = useState(false);

  const modeRef = useRef(mode);
  modeRef.current = mode;

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  const [mobileVideo, setMobileVideo] = useState("/hp/vid_login_hp.mp4");

  // Profile Photo state hook
  const {
    rawImageForCrop,
    setRawImageForCrop,
    showCropModal,
    setShowCropModal,
    croppedAvatar,
    setCroppedAvatar,
    photoError,
    setPhotoError,
    handlePhotoSelect,
    handleCropComplete,
  } = usePhotoCropHandler();

  // Google OAuth Hook
  const {
    googleLoading,
    isGooglePrefill,
    verifiedCitiesMap,
    extraCitiesList,
    handleCityInput,
    handleGoogleSignIn,
  } = useGoogleOAuth({
    setError,
    setSuccess,
    onAuthSuccess,
    setForm,
    setMode,
    setCroppedAvatar,
    modeRef,
  });

  // OTP Hook
  const {
    otpEmail,
    setOtpEmail,
    otp,
    setOtp,
    resendCooldown,
    setResendCooldown,
    isOtpExpired,
    setIsOtpExpired,
    handleOtpInput,
    handleOtpKeyDown,
    handleOtpPaste,
    handleResendOtp,
  } = useOtpVerification({
    mode,
    setError,
    setSuccess,
    setLoading,
  });

  // Password Reset Flow Hook
  const {
    forgotEmail,
    setForgotEmail,
    resetToken,
    handleForgotPasswordSubmit,
    handleResetPasswordDone,
    handleCrossTabResetSuccess,
  } = usePasswordResetFlow({
    setMode,
    setIsBuffering,
    setError,
    setSuccess,
    setForm,
    setResendCooldown,
  });

  // Username Setup Hook
  const {
    registeredCredsRef,
    suggestedUsername,
    handleVerifyOtp,
    handleUsernameDone,
  } = useUsernameSetup({
    otp,
    otpEmail,
    setError,
    setSuccess,
    setIsBuffering,
    setMode,
    setCroppedAvatar,
    onAuthSuccess,
  });

  // Form Submit & Validation Hook
  const {
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
  } = useAuthSubmit({
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
  });

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const isResetSuccess = urlParams.get("reset_success") === "true";
      const hasToken = Boolean(urlParams.get("token") || urlParams.get("reset_token"));
      const isForgot = urlParams.get("mode") === "forgot-password";
      if (!isResetSuccess && !hasToken && !isForgot) {
        try {
          localStorage.removeItem("kalceria_auth_return");
          localStorage.removeItem("kalceria_password_reset_from_map");
          sessionStorage.removeItem("kalceria_auth_return");
          sessionStorage.removeItem("kalceria_password_reset_from_map");
          sessionStorage.removeItem("kalceria_is_password_reset_login");
        } catch {}
      }
    }
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        const randNum = Math.floor(Math.random() * 6) + 1;
        setMobileVideo(`/hp/vid_login_hp${randNum}.mp4`);
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const setLoginField = useCallback((key, val) => {
    if (modeRef.current !== "login") return;
    setForm((prev) => ({ ...prev, [key]: val }));
    setError("");
  }, []);

  const setRegisterField = useCallback((key, val) => {
    if (modeRef.current !== "register") return;
    setForm((prev) => ({ ...prev, [key]: val }));
    setError("");
  }, []);

  const switchMode = (newMode) => {
    if (newMode === modeRef.current) return;
    modeRef.current = newMode;
    setError("");
    setSuccess("");
    // Always flush password & confirmPassword on form switch so passwords never leak across forms
    setForm((prev) => ({
      ...prev,
      password: "",
      confirmPassword: "",
    }));
    setMode(newMode);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: mounted ? 1 : 0 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="fixed inset-0 z-[100] overflow-hidden"
      >
        {/* ── Video Background ── */}
        <video
          key={isMobile ? mobileVideo : "/videologin_regris.mp4"}
          autoPlay
          loop
          muted
          playsInline
          className={`absolute inset-0 w-full h-full object-cover -z-10 ${
            isMobile ? "filter grayscale contrast-125 brightness-75" : ""
          }`}
        >
          <source src={isMobile ? mobileVideo : "/videologin_regris.mp4"} type="video/mp4" />
        </video>

        {/* ── Background overlay (blurred during choose-username and choose-new-password) ── */}
        <div
          className={`absolute inset-0 z-0 transition-all duration-500 ${
            mode === "choose-username" || mode === "choose-new-password"
              ? "backdrop-blur-xl bg-black/75"
              : "bg-black/60"
          }`}
        />

        {/* ── Centering wrapper ── */}
        <div className="relative z-10 flex items-center justify-center min-h-screen p-4 md:p-8">
          {mode === "choose-username" || mode === "choose-new-password" ? (
            /* Minimal centered view without any outer box, no logo, no magenta gold glow */
            <motion.div
              key={mode}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-sm flex flex-col items-center justify-center"
            >
              {mode === "choose-username" ? (
                <ChooseUsernameStep
                  initialUsername={suggestedUsername}
                  onDone={handleUsernameDone}
                  isProcessing={isBuffering}
                />
              ) : (
                <ChooseNewPasswordStep
                  onDone={handleResetPasswordDone}
                  isProcessing={isBuffering}
                  error={error}
                  onErrorClear={() => setError("")}
                  resetToken={resetToken}
                />
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: -60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative w-full max-w-lg"
            >
              {/* ── Floating Auth Card ── */}
              <motion.div
                animate={{ y: [-8, 8, -8] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="relative w-full shadow-2xl rounded-xl flex flex-col"
                style={{ maxHeight: "88vh" }}
              >
                {/* Dynamic Gold + Magenta Border Glow */}
                <div
                  className="absolute -inset-[1px] rounded-xl z-0 overflow-hidden"
                  style={{ opacity: 0.7 }}
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%]"
                    style={{
                      background:
                        "conic-gradient(from 0deg, transparent 0%, rgba(218,165,32,0.8) 25%, transparent 50%, rgba(220,0,180,0.8) 75%, transparent 100%)",
                      filter: "blur(4px)",
                    }}
                  />
                </div>

                {/* Inner Content Box */}
                <div className="relative z-10 w-full bg-[#070d1a]/40 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden flex flex-col max-h-[88vh]">
                  <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar px-8 py-10 md:px-10">
                    <AuthPageHeader
                      mode={mode}
                      onBack={onBack}
                      switchMode={switchMode}
                    />

                    {/* Form Body */}
                    {mode === "login" || mode === "register" ? (
                      <AuthFormBody
                        mode={mode}
                        handleSubmit={handleSubmit}
                        loading={loading}
                        form={form}
                        setLoginField={setLoginField}
                        setRegisterField={setRegisterField}
                        isEmailValid={isEmailValid}
                        isGooglePrefill={isGooglePrefill}
                        PUBLIC_SIGNUP_ENABLED={PUBLIC_SIGNUP_ENABLED}
                        nameValid={nameValid}
                        isDobValid={isDobValid}
                        isDobError={isDobError}
                        dobMessage={yearCheck.message}
                        cityValid={cityValid}
                        isCityError={isCityError}
                        isEmailError={isEmailError}
                        passwordValid={passwordValid}
                        isPasswordError={isPasswordError}
                        isConfirmValid={isConfirmValid}
                        isConfirmError={isConfirmError}
                        confirmMessage={confirmMessage}
                        croppedAvatar={croppedAvatar}
                        setCroppedAvatar={setCroppedAvatar}
                        photoError={photoError}
                        setPhotoError={setPhotoError}
                        handlePhotoSelect={handlePhotoSelect}
                        extraCitiesList={extraCitiesList}
                        handleCityInput={handleCityInput}
                        error={error}
                        success={success}
                        handleGoogleSignIn={handleGoogleSignIn}
                        googleLoading={googleLoading}
                      />
                    ) : mode === "verify" ? (
                      <AnimatePresence mode="wait">
                        <motion.div
                          key="verify"
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          transition={{ duration: 0.2 }}
                        >
                          <VerifyOtpStep
                            otpEmail={otpEmail}
                            otp={otp}
                            setOtp={setOtp}
                            handleOtpInput={handleOtpInput}
                            handleOtpKeyDown={handleOtpKeyDown}
                            handleOtpPaste={handleOtpPaste}
                            handleVerifyOtp={handleVerifyOtp}
                            handleResendOtp={handleResendOtp}
                            loading={loading}
                            resendCooldown={resendCooldown}
                            isExpired={isOtpExpired}
                            error={error}
                          />
                        </motion.div>
                      </AnimatePresence>
                    ) : mode === "forgot-password" ? (
                      <AnimatePresence mode="wait">
                        <motion.div
                          key="forgot-password"
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ForgotPasswordStep
                            email={forgotEmail}
                            setEmail={setForgotEmail}
                            onSubmit={(e) => handleForgotPasswordSubmit(e, setLoading)}
                            onSuccessComplete={handleCrossTabResetSuccess}
                            onBackToLogin={() => {
                              modeRef.current = "login";
                              setError("");
                              setSuccess("");
                              setForm((prev) => ({ ...prev, password: "", confirmPassword: "" }));
                              setMode("login");
                            }}
                            loading={loading}
                            error={error}
                            success={success}
                          />
                        </motion.div>
                      </AnimatePresence>
                    ) : null}

                    {/* ── Footer ── */}
                    <AuthPageFooter
                      mode={mode}
                      switchMode={switchMode}
                      setMode={setMode}
                      setError={setError}
                      setSuccess={setSuccess}
                    />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* ── Screen Blur + Loading Buffer Overlay (No Words) ── */}
      <AnimatePresence>
        {isBuffering && <AuthBufferOverlay />}
      </AnimatePresence>

      {/* ── Camera-Consistent Interactive Photo Cropper Modal ── */}
      <PhotoCropEditorModal
        show={showCropModal}
        isOpen={showCropModal}
        rawImage={rawImageForCrop}
        imageSrc={rawImageForCrop}
        onCancel={() => {
          setShowCropModal(false);
          setRawImageForCrop(null);
        }}
        onDone={handleCropComplete}
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(148, 163, 184, 0.25) transparent;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.25);
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.45);
        }
        .custom-scrollbar::-webkit-scrollbar-button {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus {
          -webkit-text-fill-color: #ffffff !important;
          -webkit-box-shadow: 0 0 0px 1000px #0c1528 inset !important;
          transition: background-color 5000s ease-in-out 0s !important;
        }
      `,
        }}
      />
    </>
  );
}

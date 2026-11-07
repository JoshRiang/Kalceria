"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { PUBLIC_SIGNUP_ENABLED } from "@/lib/authConfig";

export function AuthPageHeader({
  mode,
  onBack,
  switchMode,
}) {
  return (
    <>
      {/* Logo & Back */}
      <div className="text-center mb-8 relative flex items-center justify-center">
        {(onBack || mode === "forgot-password") && (
          <button
            type="button"
            onClick={mode === "forgot-password" ? () => switchMode("login") : onBack}
            className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors flex items-center gap-1.5 z-10 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <Image
          src="/logologin.webp"
          alt="Kalceria"
          width={1874}
          height={560}
          unoptimized
          loading="eager"
          className="h-10 w-auto object-contain inline-block"
          draggable={false}
        />
      </div>

      {/* Mode toggle (hidden in verify and forgot-password) */}
      {mode !== "verify" && mode !== "forgot-password" && (
        <div className="flex mb-8 bg-[#040810]/80 rounded-lg border border-slate-800/60 p-1 relative">
          <motion.div
            className="absolute inset-y-1 bg-[#1e293b]/80 rounded-md shadow-sm"
            initial={false}
            animate={{
              left: mode === "login" ? "4px" : "calc(50% + 2px)",
              width: "calc(50% - 6px)",
            }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors z-10 cursor-pointer ${
              mode === "login" ? "text-white" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => switchMode("register")}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors z-10 cursor-pointer ${
              mode === "register" ? "text-white" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Register
          </button>
        </div>
      )}

      {/* Section heading (hidden in verify and forgot-password) */}
      {mode !== "verify" && mode !== "forgot-password" && (
        <div className="mb-6">
          <h1 className="font-sans text-2xl font-extrabold text-white tracking-tight">
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="font-mono text-xs sm:text-sm text-slate-400 mt-1">
            {mode === "login"
              ? "Enter your credentials to access the portal."
              : !PUBLIC_SIGNUP_ENABLED
              ? "Registration is currently disabled."
              : "Complete all fields to register."}
          </p>
        </div>
      )}
    </>
  );
}

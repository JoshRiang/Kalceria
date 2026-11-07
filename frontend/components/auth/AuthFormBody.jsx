"use client";

import { motion, AnimatePresence } from "framer-motion";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

export function AuthFormBody({
  mode,
  handleSubmit,
  loading,
  form,
  setLoginField,
  setRegisterField,
  isEmailValid,
  isGooglePrefill,
  PUBLIC_SIGNUP_ENABLED,
  nameValid,
  isDobValid,
  isDobError,
  dobMessage,
  cityValid,
  isCityError,
  isEmailError,
  passwordValid,
  isPasswordError,
  isConfirmValid,
  isConfirmError,
  confirmMessage,
  croppedAvatar,
  setCroppedAvatar,
  photoError,
  setPhotoError,
  handlePhotoSelect,
  extraCitiesList,
  handleCityInput,
  error,
  success,
  handleGoogleSignIn,
  googleLoading,
}) {
  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, x: mode === "login" ? -10 : 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: mode === "login" ? 10 : -10 }}
          transition={{ duration: 0.2 }}
        >
          {mode === "login" ? (
            <LoginForm
              form={form}
              setField={setLoginField}
              loading={loading}
              isEmailValid={isEmailValid}
            />
          ) : (
            <RegisterForm
              form={form}
              setField={setRegisterField}
              isActive={mode === "register"}
              isGooglePrefill={isGooglePrefill}
              PUBLIC_SIGNUP_ENABLED={PUBLIC_SIGNUP_ENABLED}
              nameValid={nameValid}
              isDobValid={isDobValid}
              isDobError={isDobError}
              dobMessage={dobMessage}
              cityValid={cityValid}
              isCityError={isCityError}
              isEmailValid={isEmailValid}
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
              extraCities={extraCitiesList}
              onCityInput={handleCityInput}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Error / Success Display (Consolas font, no outer box) */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-3"
          >
            <div
              style={{ fontFamily: "Consolas, 'Courier New', monospace" }}
              className="text-red-500 text-[14px] sm:text-[15px] font-normal tracking-tight py-1 select-none text-left"
            >
              {error}
            </div>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-3"
          >
            <div
              style={{ fontFamily: "Consolas, 'Courier New', monospace" }}
              className="text-emerald-400 text-[14px] sm:text-[15px] font-normal tracking-tight py-1 select-none text-left"
            >
              {success}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || (mode === "register" && !PUBLIC_SIGNUP_ENABLED)}
        className="mt-2 w-full py-3.5 bg-white hover:bg-slate-200 text-black font-extrabold text-[13px] tracking-wider uppercase rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        {loading
          ? "Processing…"
          : mode === "register" && !PUBLIC_SIGNUP_ENABLED
          ? "Not Ready Yet"
          : mode === "login"
          ? "Sign In"
          : "Register Account"}
      </button>

      {/* Sign in with Google (Balanced Gap) */}
      {mode === "login" && (
        <div className="mt-5 mb-0 sm:mt-6 sm:mb-0 flex items-center justify-center">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading}
            className="inline-flex items-center justify-center gap-2 cursor-pointer group disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/Google_Loginn.png"
              alt="Google"
              width={16}
              height={16}
              className="w-[15px] h-[15px] sm:w-4 sm:h-4 object-contain shrink-0 select-none"
              draggable={false}
            />
            <span className="font-sans font-bold text-xs text-white group-hover:text-slate-300 transition-colors underline decoration-slate-600 underline-offset-4">
              {googleLoading ? "Connecting to Google…" : "Sign in with Google"}
            </span>
          </button>
        </div>
      )}
    </form>
  );
}

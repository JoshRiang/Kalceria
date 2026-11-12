"use client";

import { motion } from "framer-motion";
import { CLIP } from "./constants";
import { Field } from "./FormControls";
import { LocationAutocomplete } from "./LocationAutocomplete";
import { FormErrorBox } from "./FormErrorBox";

export function ServiceDetailsStep({
  form,
  setForm,
  setField,
  handleSubmit,
  mode = "guest",
  setMode,
  handleModeSelect,
  isLoggedIn = false,
  isLocationVerified,
  setIsLocationVerified,
  setError,
  setStep,
  currentMonthYear,
  currentWeekNumber,
  weekOffset,
  setWeekOffset,
  mounted,
  renderGrid,
  hoursA,
  hoursB,
  error,
  loading,
  isFormValid,
  isEditMode = false,
  canUpdate = false,
  isWindowExpired = false,
}) {
  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex flex-col gap-4 items-center origin-top w-full"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full items-center">
        <div className="flex flex-col xl:flex-row gap-6 items-center xl:items-start justify-center w-full">
          {/* Column 1: Intel Hub */}
          <div
            className="w-full max-w-[384px] bg-black/50 backdrop-blur-xl border border-white/15 p-6 md:p-8 shadow-2xl relative overflow-hidden"
            style={CLIP}
          >
            <div className="relative z-10 space-y-1">
              <div className="flex bg-black/60 p-1 rounded-lg border border-white/10 backdrop-blur-md shadow-inner mb-3">
                {[
                  { id: "user", label: "As User" },
                  { id: "guest", label: "As Guest" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => (handleModeSelect ? handleModeSelect(m.id) : setMode?.(m.id))}
                    className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${
                      mode === m.id
                        ? "bg-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                        : "text-slate-500 hover:text-white"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <Field
                id="serviceName"
                label="Request Title"
                type="text"
                placeholder="Project name/ID"
                val={form.serviceName}
                onChange={setField}
                required
              />
              <Field
                id="contactPerson"
                label="Operator Name"
                type="text"
                placeholder="Full name"
                val={form.contactPerson}
                onChange={setField}
                required
              />
              <Field
                id="whatsapp"
                label="Comms Channel"
                type="tel"
                placeholder="812-3456-7890"
                val={form.whatsapp}
                onChange={setField}
                required
              />
              <Field
                id="email"
                label="Email Address"
                type="email"
                placeholder="name@domain.com"
                val={form.email}
                onChange={setField}
                required
              />
              <LocationAutocomplete
                value={form.location}
                onChange={(loc, item) => {
                  setForm((p) => ({
                    ...p,
                    location: loc,
                    selectionToken: item?.selectionToken || p.selectionToken,
                    lat: item?.lat ?? p.lat,
                    lon: item?.lon ?? p.lon,
                  }));
                  setError("");
                }}
                isVerified={isLocationVerified}
                setIsVerified={setIsLocationVerified}
                required
              />
              <Field
                id="additionalNotes"
                label="Technical Brief"
                type="textarea"
                placeholder="Specific requirements..."
                val={form.additionalNotes}
                onChange={setField}
                maxLength={50}
              />
            </div>
          </div>

          {/* Temporal Matrix Section */}
          <div className="flex flex-col gap-3 sm:gap-4 md:gap-5 w-full max-w-[736px] items-center">
            {/* Month Year centered in the space between the upper form and calendar grids */}
            <div className="w-full flex items-center justify-center -mb-1 sm:mb-0 select-none">
              <span className="text-white/80 font-sans font-medium normal-case tracking-normal text-xs sm:text-sm whitespace-nowrap">
                {currentMonthYear}
              </span>
            </div>

            <div className="flex flex-row gap-2 sm:gap-4 w-full justify-center items-start">
              {/* Shift 1 (Boxless) */}
              <div className="w-[165px] xs:w-[220px] sm:w-[360px] p-2 sm:p-4 relative h-fit overflow-hidden">
                <div className="relative z-10">
                  <p className="font-sans text-white text-[10px] sm:text-[13px] font-bold mb-2 sm:mb-4 tracking-widest uppercase">
                    09.00 - 16.00 WIB
                  </p>
                  <div className="overflow-y-auto max-h-[180px] sm:max-h-[320px] pr-1 sm:pr-2 custom-scrollbar">
                    {mounted ? renderGrid(hoursA) : null}
                  </div>
                </div>
              </div>

              {/* Shift 2 (Boxless) */}
              <div className="w-[165px] xs:w-[220px] sm:w-[360px] p-2 sm:p-4 relative h-fit overflow-hidden">
                <div className="relative z-10">
                  <p className="font-sans text-white text-[10px] sm:text-[13px] font-bold mb-2 sm:mb-4 tracking-widest uppercase">
                    17.00 - 00.00 WIB
                  </p>
                  <div className="overflow-y-auto max-h-[180px] sm:max-h-[320px] pr-1 sm:pr-2 custom-scrollbar">
                    {mounted ? renderGrid(hoursB) : null}
                  </div>
                </div>
              </div>
            </div>

            {/* Extended Legend & Counter (Boxless Pill): Ready, Busy, Lock + Week Navigation */}
            <div className="flex flex-row items-center justify-between gap-2 sm:gap-5 px-2 sm:px-4 py-2 sm:py-3 w-full mt-2 sm:mt-4 bg-transparent border-none shadow-none">
              <div className="flex flex-row items-center gap-2.5 sm:gap-6 flex-wrap">
                <div
                  className="flex items-center gap-1 sm:gap-2 text-white text-[10px] sm:text-[12px]"
                  style={{ fontFamily: "Arial, sans-serif", fontWeight: "normal", textTransform: "none" }}
                >
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-emerald-500 border border-emerald-400 rounded-[2px] sm:rounded-[4px]" />
                  Ready
                </div>
                <div
                  className="flex items-center gap-1 sm:gap-2 text-white text-[10px] sm:text-[12px]"
                  style={{ fontFamily: "Arial, sans-serif", fontWeight: "normal", textTransform: "none" }}
                >
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 border border-red-400 rounded-[2px] sm:rounded-[4px]" />
                  Busy
                </div>
                <div
                  className="flex items-center gap-1 sm:gap-2 text-white text-[10px] sm:text-[12px]"
                  style={{ fontFamily: "Arial, sans-serif", fontWeight: "normal", textTransform: "none" }}
                >
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-[#FF00FF] border border-[#FF00FF] shadow-[0_0_15px_#FF00FF] rounded-[2px] sm:rounded-[4px]" />
                  Lock
                </div>
              </div>

              <div className="flex flex-row items-center gap-2 sm:gap-3">
                <span className="text-white/80 font-sans font-medium normal-case tracking-normal text-[10px] sm:text-[12px] whitespace-nowrap">
                  Week {currentWeekNumber}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
                    className="p-1 sm:p-1.5 flex items-center justify-center bg-transparent border-none text-white/70 hover:text-white transition-all hover:scale-110 active:scale-95 cursor-pointer outline-none select-none"
                    aria-label="Previous Week"
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeekOffset(weekOffset + 1)}
                    className="p-1 sm:p-1.5 flex items-center justify-center bg-transparent border-none text-white/70 hover:text-white transition-all hover:scale-110 active:scale-95 cursor-pointer outline-none select-none"
                    aria-label="Next Week"
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Inline Form Error Box (Matching Login Form style) */}
        <div className="w-full max-w-[900px] mx-auto">
          <FormErrorBox error={error} />
        </div>

        {/* Horizontal Footer Navigation (Boxless Back and Next OR Centered Update) */}
        {isEditMode ? (
          <div className="flex justify-center items-center max-w-[900px] mx-auto w-full mt-2">
            <button
              type="submit"
              disabled={loading || !canUpdate || isWindowExpired}
              className={`py-3.5 sm:py-6 font-sans font-black uppercase tracking-tight text-base sm:text-lg transition-all flex items-center justify-center gap-2 bg-transparent border-none shadow-none outline-none select-none ${
                canUpdate && !isWindowExpired
                  ? "text-white hover:text-white/80 hover:scale-105 active:scale-95 cursor-pointer"
                  : "text-white/40 cursor-not-allowed opacity-40 pointer-events-none"
              }`}
            >
              {loading ? "VALIDATING..." : isWindowExpired ? "UPDATE (EXPIRED)" : "UPDATE"}
            </button>
          </div>
        ) : (
          <div className="flex gap-4 sm:gap-6 max-w-[900px] mx-auto w-full mt-2">
            <button
              type="button"
              onClick={() => {
                setError("");
                setStep(0);
              }}
              className="flex-1 py-3.5 sm:py-6 font-sans font-black uppercase tracking-tight text-base sm:text-lg transition-colors flex items-center justify-center gap-2 bg-transparent text-white hover:text-white/70 border-none shadow-none cursor-pointer"
            >
              BACK
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 py-3.5 sm:py-6 font-sans font-black uppercase tracking-tight text-base sm:text-lg transition-colors flex items-center justify-center gap-2 bg-transparent border-none shadow-none cursor-pointer ${
                isFormValid ? "text-white hover:text-white/80" : "text-white/40 cursor-not-allowed"
              }`}
            >
              {loading ? "VALIDATING..." : "NEXT"}
            </button>
          </div>
        )}
      </form>
    </motion.div>
  );
}

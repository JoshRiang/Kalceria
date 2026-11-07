"use client";

import { motion } from "framer-motion";
import { SERVICE_TYPES } from "./constants";
import { FormErrorBox } from "./FormErrorBox";

export function ServiceTypeStep({
  form,
  setField,
  handleNext,
  error,
}) {
  return (
    <motion.div
      key="step0"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-[380px] flex flex-col"
    >
      <p className="text-white font-medium text-xs sm:text-sm mb-6 leading-relaxed font-sans max-w-[440px]">
        Select the operational tier for your project. Our crew handles everything from creative shoots to full-scale event infrastructure.
      </p>

      <div className="grid grid-cols-1 gap-3.5 mb-auto">
        {SERVICE_TYPES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setField("serviceType", form.serviceType === s.id ? "" : s.id)}
            className={`group relative text-left py-4 px-2 sm:px-3 border-none bg-transparent shadow-none ring-0 transition-all duration-300 overflow-hidden cursor-pointer ${
              form.serviceType === s.id ? "opacity-100" : "opacity-80 hover:opacity-100"
            }`}
          >
            <div className="relative flex items-center justify-between gap-6">
              <div className="flex-1">
                <p className="font-sans font-bold text-sm sm:text-base uppercase tracking-wider text-white">
                  {s.label}
                </p>
                <p className="font-sans text-xs text-white/85 font-medium mt-1 leading-snug">
                  {s.desc}
                </p>
              </div>
              <div
                className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
                  form.serviceType === s.id
                    ? "bg-white border-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                    : "border-white/30 group-hover:border-white/60"
                }`}
              >
                {form.serviceType === s.id ? (
                  <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7" />
                  </svg>
                ) : null}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 w-full">
        <FormErrorBox error={error} />
      </div>

      <button
        type="button"
        onClick={handleNext}
        disabled={!form.serviceType}
        className="w-full py-4 bg-transparent border-none shadow-none ring-0 font-sans font-black uppercase tracking-tight text-base sm:text-lg text-white hover:text-white/80 disabled:opacity-30 cursor-pointer flex items-center justify-center gap-2 transition-colors mt-4"
      >
        NEXT
      </button>
    </motion.div>
  );
}

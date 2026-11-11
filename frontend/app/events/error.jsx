"use client";

import { useEffect } from "react";

export default function EventsError({ error, reset }) {
  useEffect(() => {
    console.error("[Events Page Error Caught]:", error);
  }, [error]);

  return (
    <div className="min-h-screen w-full bg-black flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-12 h-12 rounded-full border border-red-500/30 bg-red-500/10 flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight mb-2">
        Events Grid Offline
      </h2>
      <p className="text-xs sm:text-sm text-slate-400 max-w-[420px] mb-6 leading-relaxed">
        Could not initialize events feed. Please verify your connection or reload to synchronize with the operational grid.
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="px-5 py-2 rounded-lg bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-slate-200 transition-colors cursor-pointer"
        >
          Reload
        </button>
        <button
          type="button"
          onClick={() => { if (typeof window !== "undefined") window.location.href = "/"; }}
          className="px-5 py-2 rounded-lg bg-black text-white/80 border border-white/20 font-medium text-xs hover:text-white transition-colors cursor-pointer"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}


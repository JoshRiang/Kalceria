"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import api from "@/lib/api";

export function LocationAutocomplete({ 
  value, 
  onChange, 
  isVerified, 
  setIsVerified, 
  required = true,
  onDetectStart,
  onDetectEnd 
}) {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectError, setDetectError] = useState("");
  const containerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Synchronize incoming value changes (e.g., from GPS auto-detection)
  useEffect(() => {
    if (value !== query) {
      setQuery(value || "");
    }
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const fetchSuggestions = useCallback(async (q) => {
    if (!q || q.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get("/location/search", { params: { q: q.trim() } });
      const results = res.data?.results || [];
      setSuggestions(results);
      setIsOpen(results.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e) => {
    const nextVal = e.target.value;
    setQuery(nextVal);
    onChange(nextVal);
    setIsVerified(false); // Must re-select from list to verify
    setDetectError("");

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(nextVal);
    }, 220);
  };

  const handleSelectSuggestion = (item) => {
    const formatted = item.formatted;
    setQuery(formatted);
    onChange(formatted);
    setIsVerified(true);
    setSuggestions([]);
    setIsOpen(false);
    setDetectError("");
  };

  const handleDetectCurrentLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setDetectError("Geolocation is not supported by your browser.");
      return;
    }
    setIsDetecting(true);
    setDetectError("");
    onDetectStart?.();

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await api.get("/location/reverse", {
            params: { lat: latitude, lng: longitude },
          });
          const formatted = res.data?.formatted || "Kota Depok, Jawa Barat";
          setQuery(formatted);
          onChange(formatted);
          setIsVerified(true);
          setIsOpen(false);
        } catch {
          setDetectError("Unable to reverse-geocode your location.");
        } finally {
          setIsDetecting(false);
          onDetectEnd?.();
        }
      },
      (err) => {
        setIsDetecting(false);
        onDetectEnd?.();
        if (err.code === 1) {
          setDetectError("Location access was denied. Please select from the list.");
        } else {
          setDetectError("Location lookup timed out. Please select from the list.");
        }
      },
      { timeout: 9000, enableHighAccuracy: true }
    );
  };

  return (
    <div ref={containerRef} className="flex flex-col mb-4 relative z-30">
      <div className="flex items-center justify-between mb-1.5">
        <label className="font-sans text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
          <span>Deployment Area</span>
          {isVerified ? (
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
              Verified
            </span>
          ) : (
            <span className="text-[10px] text-red-400 font-normal">
              (Must pick from list)
            </span>
          )}
        </label>

        {/* GPS Detect Button */}
        <button
          type="button"
          onClick={handleDetectCurrentLocation}
          disabled={isDetecting}
          className="text-[10px] text-white/60 hover:text-white transition-colors flex items-center gap-1 cursor-pointer bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-md border border-white/10"
          title="Detect Current Indonesian Location via GPS"
        >
          {isDetecting ? (
            <span className="animate-pulse">Detecting...</span>
          ) : (
            <>
              <svg className="w-3 h-3 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Auto-Detect</span>
            </>
          )}
        </button>
      </div>

      {/* Input container */}
      <div className="relative w-full">
        <input
          type="text"
          placeholder="e.g. Jl. Margonda Raya, Kota Depok, Jawa Barat"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          className={`w-full bg-black/60 border rounded-xl px-4 py-3 font-sans text-xs sm:text-sm text-white font-medium outline-none transition-all duration-300 placeholder:text-white/30 pr-10 ${
            isVerified
              ? "border-emerald-500/50 focus:border-emerald-400 ring-1 ring-emerald-500/30"
              : "border-white/20 focus:border-white focus:ring-1 focus:ring-white/50"
          }`}
          required={required}
          autoComplete="off"
        />

        {/* Status Icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : isVerified ? (
            <span className="text-emerald-400 text-sm">✓</span>
          ) : query.length > 0 ? (
            <span className="text-amber-400 text-xs font-mono">!</span>
          ) : null}
        </div>
      </div>

      {/* Verification Notice / Geolocation Notice */}
      {detectError && (
        <p className="text-[10px] text-amber-400 mt-1 font-sans">{detectError}</p>
      )}
      {!isVerified && query.length >= 2 && !isOpen && (
        <p className="text-[10px] text-amber-300/80 mt-1 font-sans">
          Select from the suggestion list below to verify your deployment area.
        </p>
      )}

      {/* Autocomplete Dropdown Menu */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#0a0f1d]/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl max-h-56 overflow-y-auto z-[9999] custom-scrollbar divide-y divide-white/5">
          <div className="px-3 py-1.5 text-[9px] text-white/40 uppercase tracking-wider font-sans border-b border-white/10 bg-black/30">
            Verified Indonesian Locations (Leaflet / Nominatim Verified)
          </div>
          {suggestions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectSuggestion(item)}
              className="w-full text-left px-3.5 py-2.5 hover:bg-white/10 transition-colors flex items-start gap-2.5 cursor-pointer group"
            >
              <span className="text-cyan-400 text-sm mt-0.5 shrink-0 select-none">📍</span>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-white text-xs font-medium truncate group-hover:text-cyan-200">
                  {item.road || item.formatted}
                </span>
                <span className="text-[10px] text-white/50 truncate">
                  {[item.city, item.province].filter(Boolean).join(", ")}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
    onChange(formatted, item);
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
          const formatted = res.data?.formatted;
          if (formatted) {
            setQuery(formatted);
            onChange(formatted, res.data);
            setIsVerified(true);
            setIsOpen(false);
          } else {
            setDetectError("Unable to reverse-geocode your location.");
          }
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
        <label className="font-sans text-xs font-bold text-white tracking-wide">
          Deployment Area
        </label>

        {/* GPS Detect Button: Borderless, No Emoji, Scales slightly on hover/active */}
        <button
          type="button"
          onClick={handleDetectCurrentLocation}
          disabled={isDetecting}
          className="text-xs font-sans font-medium text-white/70 hover:text-white bg-transparent border-none p-0 cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95 focus:outline-none select-none"
          title="Detect Current Indonesian Location via GPS"
        >
          {isDetecting ? (
            <span className="animate-pulse">Detecting...</span>
          ) : (
            <span>Auto-Detect</span>
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
              : query.trim().length > 0
              ? "border-[#c2850c] focus:border-[#d99b1a]"
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
          ) : null}
        </div>
      </div>

      {/* Verification Notice / Geolocation Notice */}
      {detectError && (
        <p className="text-[10px] text-[#c2850c] mt-1 font-sans">{detectError}</p>
      )}
      {!isVerified && query.trim().length >= 2 && !isOpen && (
        <p className="text-[10px] text-[#c2850c] mt-1 font-sans">
          Select from the suggestion list below to verify your deployment area.
        </p>
      )}

      {/* Autocomplete Dropdown Menu */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-neutral-300 rounded-xl shadow-2xl max-h-56 overflow-y-auto z-[9999] custom-scrollbar divide-y divide-neutral-200">
          <div className="px-3.5 py-2 font-sans font-bold text-xs text-neutral-800 border-b border-neutral-200 bg-white">
            Verified List
          </div>
          {suggestions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectSuggestion(item)}
              className="w-full text-left px-3.5 py-2.5 bg-white hover:bg-neutral-100 transition-colors flex items-start cursor-pointer group"
            >
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-black font-sans font-normal text-xs sm:text-sm truncate">
                  {item.headline || item.road || item.formatted}
                </span>
                {item.subtitle ? (
                  <span className="text-black/70 font-sans font-normal text-[10px] sm:text-[11px] truncate mt-0.5">
                    {item.subtitle}
                  </span>
                ) : (
                  <span className="text-black/70 font-sans font-normal text-[10px] sm:text-[11px] truncate mt-0.5">
                    {[item.city, item.province].filter(Boolean).join(", ")}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


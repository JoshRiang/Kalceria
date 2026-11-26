"use client";

import ContentImage from "@/components/ui/ContentImage";
import {
  BLEND_TRANSPORT_MODES,
  formatBlendDistance,
  formatBlendEta,
} from "./gpsCurator";

function TrafficBadge({ trafficLevel, trafficDelaySeconds }) {
  const delayMin = Math.round(Number(trafficDelaySeconds || 0) / 60);
  if (trafficLevel === "JAM") {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-500/20 text-red-400 border border-red-500/40">
        Macet {delayMin > 0 ? `+${delayMin} mnt` : ""}
      </span>
    );
  }
  if (trafficLevel === "SLOW" || trafficLevel === "MODERATE") {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/40">
        {trafficLevel === "SLOW" ? "Lambat" : "Padat"} {delayMin > 0 ? `+${delayMin} mnt` : ""}
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
      Lancar
    </span>
  );
}

export function BlendFocusHud({
  blend,
  isMapDark,
  isFocusMode,
  focusedParticipant,
  focusedIndex,
  myMode,
  isUpdatingMode,
  onToggleFocusMode,
  onCycleFocus,
  onChangeTransportMode,
  onLeaveBlend,
}) {
  if (!blend?.isJoined) return null;

  const participants = Array.isArray(blend.participants) ? blend.participants : [];
  const selfParticipant = participants.find((p) => p.isSelf) || participants[0] || null;
  const active = isFocusMode ? focusedParticipant || selfParticipant : selfParticipant;
  const route = active?.route || null;
  const etaLabel = route?.eta?.label || formatBlendEta(route?.durationSeconds);
  const distLabel = route?.distanceMeters ? formatBlendDistance(route.distanceMeters) : "";
  const speedKmh = active && !active.isStationary ? Math.round((Number(active.speed) || 0) * 3.6) : 0;

  if (!isFocusMode) {
    return (
      <div className="fixed z-[960] top-[72px] sm:top-[76px] left-1/2 -translate-x-1/2 w-[min(94vw,410px)] pointer-events-auto select-none">
        <div
          className={`rounded-2xl border px-3 py-2 shadow-xl backdrop-blur-xl flex flex-col gap-2 ${
            isMapDark
              ? "bg-[#0a0e27]/92 border-white/15 text-white"
              : "bg-white/94 border-black/15 text-[#0f172a]"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-extrabold tracking-tight truncate">
                Blend · {blend.destination?.title || "Event"} ({participants.length})
              </p>
              <div className="flex items-center gap-1.5 text-[10.5px] opacity-80 mt-0.5">
                <span className="font-bold">{etaLabel}</span>
                {distLabel && <span>· {distLabel}</span>}
                {route?.trafficLevel && route.trafficLevel !== "FREE" && (
                  <TrafficBadge
                    trafficLevel={route.trafficLevel}
                    trafficDelaySeconds={route.trafficDelaySeconds}
                  />
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onToggleFocusMode(true)}
                className="px-3 py-1.5 rounded-full bg-gradient-to-r from-[#2563eb] to-[#ec4899] text-white text-[11px] font-extrabold tracking-wide shadow-md cursor-pointer transition-transform hover:scale-105 active:scale-95"
              >
                FOKUS
              </button>
              <button
                type="button"
                onClick={onLeaveBlend}
                title="Leave Location Blend"
                className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold cursor-pointer ${
                  isMapDark ? "border-white/20 hover:bg-white/10" : "border-black/20 hover:bg-black/5"
                }`}
              >
                ×
              </button>
            </div>
          </div>

          {/* 5 Transport Modes (Default: Foot) */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {BLEND_TRANSPORT_MODES.map((m) => {
              const selected = myMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={isUpdatingMode}
                  onClick={() => onChangeTransportMode?.(m.id)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer shrink-0 ${
                    selected
                      ? isMapDark
                        ? "bg-white text-black border-white"
                        : "bg-black text-white border-black"
                      : isMapDark
                      ? "bg-white/5 text-white/75 border-white/15 hover:border-white/40"
                      : "bg-black/5 text-black/75 border-black/15 hover:border-black/40"
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // GOOGLE MAPS-STYLE FOCUS MODE HUD (With Left/Right Participant Camera Rotation Arrows & Live Traffic)
  return (
    <div className="fixed z-[1040] top-[72px] sm:top-[78px] left-1/2 -translate-x-1/2 w-[min(95vw,420px)] pointer-events-auto select-none">
      <div
        className={`rounded-2xl border p-3 shadow-2xl backdrop-blur-xl flex flex-col gap-2.5 ${
          isMapDark
            ? "bg-[#0a0e27]/95 border-[#2563eb]/50 text-white"
            : "bg-white/96 border-[#2563eb]/45 text-[#0f172a]"
        }`}
      >
        {/* Top Row: Left Arrow ← | Focused Participant Live Telemetry | → Right Arrow */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={participants.length <= 1}
            onClick={() => onCycleFocus(-1)}
            aria-label="Lihat kawan sebelumnya"
            title="Putar kamera ke kawan sebelumnya"
            className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 cursor-pointer transition-transform active:scale-90 disabled:opacity-30 ${
              isMapDark
                ? "border-white/25 bg-white/10 hover:bg-white/20"
                : "border-black/20 bg-black/5 hover:bg-black/10"
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div className="flex items-center gap-2.5 min-w-0 flex-1 justify-center">
            {active && (
              <div
                className="w-9 h-9 rounded-full overflow-hidden border-2 shrink-0"
                style={{ borderColor: active.color || "#2563eb" }}
              >
                <ContentImage
                  src={
                    active.profilePicture ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(active.displayName || "k")}`
                  }
                  alt={active.displayName || "Kalcerian"}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-extrabold truncate">
                  {active?.isSelf ? "Kamu (Fokus)" : active?.displayName || "Kawan"}
                </p>
                <span className="text-[10px] opacity-60 font-bold shrink-0">
                  {focusedIndex + 1}/{participants.length}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className={`text-[11px] font-black ${isMapDark ? "text-[#60a5fa]" : "text-[#2563eb]"}`}>
                  {etaLabel}
                </span>
                {distLabel && <span className="text-[10.5px] opacity-75">· {distLabel}</span>}
                <span
                  className={`text-[9.5px] px-1.5 py-0.5 rounded-full font-bold ${
                    active?.isStationary
                      ? isMapDark
                        ? "bg-white/10 text-white/75"
                        : "bg-black/10 text-black/70"
                      : "bg-emerald-500/20 text-emerald-500"
                  }`}
                >
                  {active?.isStationary ? "Diam" : `${Math.max(1, speedKmh)} km/j`}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={participants.length <= 1}
            onClick={() => onCycleFocus(1)}
            aria-label="Lihat kawan berikutnya"
            title="Putar kamera ke kawan berikutnya"
            className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 cursor-pointer transition-transform active:scale-90 disabled:opacity-30 ${
              isMapDark
                ? "border-white/25 bg-white/10 hover:bg-white/20"
                : "border-black/20 bg-black/5 hover:bg-black/10"
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        {/* Traffic Congestion + Transit Route Summary Row */}
        <div className="flex items-center justify-between gap-2 text-[10.5px]">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <TrafficBadge
              trafficLevel={route?.trafficLevel || "FREE"}
              trafficDelaySeconds={route?.trafficDelaySeconds || 0}
            />
            <span className="truncate opacity-75">
              {route?.summary || `Menuju ${blend.destination?.title || "Event"}`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onToggleFocusMode(false)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 cursor-pointer ${
              isMapDark
                ? "border-white/25 text-white hover:bg-white/10"
                : "border-black/25 text-black hover:bg-black/5"
            }`}
          >
            Keluar Fokus
          </button>
        </div>

        {/* 5 Transport Mode Selector (Your Route: Foot / Motor / Car / Bus / Train) */}
        <div className="flex items-center justify-between gap-1 pt-1 border-t border-current/10">
          {BLEND_TRANSPORT_MODES.map((m) => {
            const selected = myMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                disabled={isUpdatingMode}
                onClick={() => onChangeTransportMode?.(m.id)}
                className={`flex-1 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                  selected
                    ? "bg-gradient-to-r from-[#2563eb] to-[#ec4899] text-white border-transparent shadow-sm"
                    : isMapDark
                    ? "bg-white/5 text-white/75 border-white/15 hover:border-white/40"
                    : "bg-black/5 text-black/75 border-black/15 hover:border-black/40"
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Traffic Color & Dotted Walk Legend */}
        <div className="flex items-center justify-center gap-3 text-[9.5px] opacity-75">
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-[#10b981] inline-block" />Lancar</span>
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-[#eab308] inline-block" />Padat</span>
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-[#ef4444] inline-block" />Macet</span>
          <span className="flex items-center gap-1"><span className="font-bold">┄</span>Jalan Kaki</span>
        </div>
      </div>
    </div>
  );
}

"use client";

export function formatTrimTime(totalSec) {
  const validSec = Number.isFinite(totalSec) && totalSec >= 0 ? Math.floor(totalSec) : 0;
  const m = Math.floor(validSec / 60);
  const s = Math.floor(validSec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function CameraTrimmerBar({
  trimmerTrackRef,
  getActiveVideoDur,
  activeTrimHandle,
  setActiveTrimHandle,
  trimStart,
  setTrimStart,
  trimEnd,
  setTrimEnd,
  previewVideoRef,
  handleTrimmerPointerDown: externalHandleTrimmerPointerDown,
}) {
  const handleTrimmerPointerDown =
    externalHandleTrimmerPointerDown ||
    ((e, handleType) => {
      e.stopPropagation();
      e.preventDefault();
      if (!trimmerTrackRef?.current) return;
      setActiveTrimHandle?.(handleType);
      const trackRect = trimmerTrackRef.current.getBoundingClientRect();
      const dur = getActiveVideoDur();

      const onPointerMove = (ev) => {
        const clientX = ev.clientX;
        const ratio = Math.max(0, Math.min(1, (clientX - trackRect.left) / trackRect.width));
        if (handleType === "start") {
          setTrimStart?.(() => {
            const nextStart = Math.max(0, Math.min(ratio, trimEnd - 0.05));
            if (previewVideoRef?.current && Number.isFinite(nextStart * dur)) {
              previewVideoRef.current.currentTime = nextStart * dur;
            }
            return nextStart;
          });
        } else {
          setTrimEnd?.(() => {
            const nextEnd = Math.min(1, Math.max(ratio, trimStart + 0.05));
            if (previewVideoRef?.current && Number.isFinite(nextEnd * dur)) {
              previewVideoRef.current.currentTime = nextEnd * dur;
            }
            return nextEnd;
          });
        }
      };

      const onPointerUp = () => {
        setActiveTrimHandle?.(null);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    });

  return (
    <div className="absolute bottom-2 inset-x-3 z-25 flex flex-col gap-1 select-none pointer-events-auto">
      {/* Trimmer Track Container */}
      <div
        ref={trimmerTrackRef}
        className="relative w-full h-5 flex items-center cursor-pointer select-none touch-none"
      >
        {/* White Outer Box Time Mark Badge */}
        {(() => {
          const dur = getActiveVideoDur();
          const showStartBadge = activeTrimHandle === "start" || (!activeTrimHandle && trimStart > 0.005);
          const badgeRatio = showStartBadge ? trimStart : trimEnd;
          const badgeSeconds = badgeRatio * dur;
          const clampedPercent = Math.min(92, Math.max(8, badgeRatio * 100));
          return (
            <div
              style={{
                left: `${clampedPercent}%`,
                transform: "translateX(-50%)",
              }}
              className="absolute -top-6 px-2 py-0.5 rounded-md bg-white border border-black text-black font-sans font-medium text-[10px] leading-none shadow-sm select-none pointer-events-none whitespace-nowrap z-30"
            >
              {formatTrimTime(badgeSeconds)}
            </div>
          );
        })()}

        {/* Base Full Track Bar */}
        <div className="relative w-full h-[2.5px] rounded-full overflow-hidden bg-black/50 backdrop-blur-sm">
          {/* Dimmed Left Segment (Outside boundary) */}
          <div
            style={{ width: `${trimStart * 100}%` }}
            className="absolute left-0 top-0 h-full bg-white/25"
          />

          {/* Active Selected Segment */}
          <div
            style={{
              left: `${trimStart * 100}%`,
              width: `${(trimEnd - trimStart) * 100}%`,
            }}
            className="absolute top-0 h-full bg-white shadow-xs"
          />

          {/* Dimmed Right Segment (Outside boundary) */}
          <div
            style={{
              left: `${trimEnd * 100}%`,
              width: `${(1 - trimEnd) * 100}%`,
            }}
            className="absolute top-0 h-full bg-white/25"
          />
        </div>

        {/* Left Drag Handle: Start Boundary Pin */}
        <div
          onPointerDown={(e) => handleTrimmerPointerDown(e, "start")}
          style={{
            left: `${trimStart * 100}%`,
            transform: "translateX(-50%)",
          }}
          className="absolute w-4 h-5 flex items-center justify-center cursor-ew-resize z-20 touch-none group"
        >
          <div
            className={`w-[4.5px] h-3.5 rounded-full transition-transform ${
              activeTrimHandle === "start" ? "scale-125 bg-white shadow-md" : "bg-white group-hover:scale-110 shadow-xs"
            }`}
          />
        </div>

        {/* Right Drag Handle: End Boundary Pin */}
        <div
          onPointerDown={(e) => handleTrimmerPointerDown(e, "end")}
          style={{
            left: `${trimEnd * 100}%`,
            transform: "translateX(-50%)",
          }}
          className="absolute w-4 h-5 flex items-center justify-center cursor-ew-resize z-20 touch-none group"
        >
          <div
            className={`w-[4.5px] h-3.5 rounded-full transition-transform ${
              activeTrimHandle === "end" ? "scale-125 bg-white shadow-md" : "bg-white group-hover:scale-110 shadow-xs"
            }`}
          />
        </div>
      </div>
    </div>
  );
}

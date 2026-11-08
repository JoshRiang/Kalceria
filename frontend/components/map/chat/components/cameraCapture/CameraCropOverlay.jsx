"use client";

export function CameraCropOverlay({
  cropRect,
  setCropRect,
  previewViewportRef,
  handleCropPointerDown: externalHandleCropPointerDown,
  isMapDark,
}) {
  const handleCropPointerDown =
    externalHandleCropPointerDown ||
    ((e, mode) => {
      e.stopPropagation();
      e.preventDefault();
      if (!previewViewportRef?.current) return;
      const rect = previewViewportRef.current.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const initial = { ...cropRect };
      const minSize = 0.18;

      const onPointerMove = (ev) => {
        const dx = (ev.clientX - startX) / rect.width;
        const dy = (ev.clientY - startY) / rect.height;

        setCropRect?.(() => {
          let { left, top, right, bottom } = initial;
          if (mode === "move") {
            const w = right - left;
            const h = bottom - top;
            left = Math.max(0, Math.min(1 - w, left + dx));
            top = Math.max(0, Math.min(1 - h, top + dy));
            right = left + w;
            bottom = top + h;
          } else {
            if (mode.includes("w")) {
              left = Math.max(0, Math.min(right - minSize, left + dx));
            }
            if (mode.includes("e")) {
              right = Math.min(1, Math.max(left + minSize, right + dx));
            }
            if (mode.includes("n")) {
              top = Math.max(0, Math.min(bottom - minSize, top + dy));
            }
            if (mode.includes("s")) {
              bottom = Math.min(1, Math.max(top + minSize, bottom + dy));
            }
          }
          return { left, top, right, bottom };
        });
      };

      const onPointerUp = () => {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    });

  return (
    <div className="absolute inset-0 z-15 pointer-events-none select-none touch-none">
      {/* Dimmed Surrounding Mask */}
      <div
        style={{
          top: 0,
          left: 0,
          right: 0,
          height: `${cropRect.top * 100}%`,
        }}
        className="absolute bg-black/55 pointer-events-none"
      />
      <div
        style={{
          bottom: 0,
          left: 0,
          right: 0,
          height: `${(1 - cropRect.bottom) * 100}%`,
        }}
        className="absolute bg-black/55 pointer-events-none"
      />
      <div
        style={{
          top: `${cropRect.top * 100}%`,
          height: `${(cropRect.bottom - cropRect.top) * 100}%`,
          left: 0,
          width: `${cropRect.left * 100}%`,
        }}
        className="absolute bg-black/55 pointer-events-none"
      />
      <div
        style={{
          top: `${cropRect.top * 100}%`,
          height: `${(cropRect.bottom - cropRect.top) * 100}%`,
          right: 0,
          width: `${(1 - cropRect.right) * 100}%`,
        }}
        className="absolute bg-black/55 pointer-events-none"
      />

      {/* Interactive Crop Box */}
      <div
        onPointerDown={(e) => handleCropPointerDown(e, "move")}
        style={{
          left: `${cropRect.left * 100}%`,
          top: `${cropRect.top * 100}%`,
          width: `${(cropRect.right - cropRect.left) * 100}%`,
          height: `${(cropRect.bottom - cropRect.top) * 100}%`,
        }}
        className="absolute pointer-events-auto cursor-move touch-none"
      >
        {/* 3x3 Grid Lines */}
        <div className="w-full h-full border border-white/45 grid grid-cols-3 grid-rows-3 pointer-events-none">
          <div className="border-r border-b border-white/30" />
          <div className="border-r border-b border-white/30" />
          <div className="border-b border-white/30" />
          <div className="border-r border-b border-white/30" />
          <div className="border-r border-b border-white/30" />
          <div className="border-b border-white/30" />
          <div className="border-r border-b border-white/30" />
          <div className="border-r border-b border-white/30" />
          <div />
        </div>

        {/* Edge Drag Handles (N, S, W, E) */}
        <div
          onPointerDown={(e) => handleCropPointerDown(e, "n")}
          className="absolute -top-2 left-6 right-6 h-4 cursor-ns-resize z-20"
        />
        <div
          onPointerDown={(e) => handleCropPointerDown(e, "s")}
          className="absolute -bottom-2 left-6 right-6 h-4 cursor-ns-resize z-20"
        />
        <div
          onPointerDown={(e) => handleCropPointerDown(e, "w")}
          className="absolute top-6 bottom-6 -left-2 w-4 cursor-ew-resize z-20"
        />
        <div
          onPointerDown={(e) => handleCropPointerDown(e, "e")}
          className="absolute top-6 bottom-6 -right-2 w-4 cursor-ew-resize z-20"
        />

        {/* Top-Left Corner Bracket & Drag Handle: Round Bevel */}
        <div
          onPointerDown={(e) => handleCropPointerDown(e, "nw")}
          className={`absolute top-0 left-0 w-7 h-7 border-t-[4px] border-l-[4px] cursor-nwse-resize z-30 ${
            cropRect.top < 0.02 && cropRect.left < 0.02 ? "rounded-tl-2xl" : "rounded-tl-md"
          } ${isMapDark ? "border-white" : "border-black"}`}
        />
        {/* Top-Right Corner Bracket & Drag Handle: Round Bevel */}
        <div
          onPointerDown={(e) => handleCropPointerDown(e, "ne")}
          className={`absolute top-0 right-0 w-7 h-7 border-t-[4px] border-r-[4px] cursor-nesw-resize z-30 ${
            cropRect.top < 0.02 && cropRect.right > 0.98 ? "rounded-tr-2xl" : "rounded-tr-md"
          } ${isMapDark ? "border-white" : "border-black"}`}
        />
        {/* Bottom-Left Corner Bracket & Drag Handle: Round Bevel */}
        <div
          onPointerDown={(e) => handleCropPointerDown(e, "sw")}
          className={`absolute bottom-0 left-0 w-7 h-7 border-b-[4px] border-l-[4px] cursor-nesw-resize z-30 ${
            cropRect.bottom > 0.98 && cropRect.left < 0.02 ? "rounded-bl-2xl" : "rounded-bl-md"
          } ${isMapDark ? "border-white" : "border-black"}`}
        />
        {/* Bottom-Right Corner Bracket & Drag Handle: Round Bevel */}
        <div
          onPointerDown={(e) => handleCropPointerDown(e, "se")}
          className={`absolute bottom-0 right-0 w-7 h-7 border-b-[4px] border-r-[4px] cursor-nwse-resize z-30 ${
            cropRect.bottom > 0.98 && cropRect.right > 0.98 ? "rounded-br-2xl" : "rounded-br-md"
          } ${isMapDark ? "border-white" : "border-black"}`}
        />
      </div>
    </div>
  );
}

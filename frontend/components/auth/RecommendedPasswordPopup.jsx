"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";

/**
 * Firm pitch-black rectangle popup for natural strong password recommendation.
 * Positioned to the right of the eye icon, slightly above the password input box,
 * and responsively clamped on narrower tablet/mobile viewports without clipping.
 */
export default function RecommendedPasswordPopup({
  open,
  anchorRef,
  recommendedPassword,
  onAccept,
  onDismiss,
}) {
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 248, ready: false });

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    if (typeof window === "undefined" || !anchorRef?.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const popupWidth = Math.min(252, vw - 24);
    const estimatedHeight = 118;
    const rightSpace = vw - rect.right;

    let left;
    let top;

    if (rightSpace >= popupWidth + 16) {
      // Desktop / iPad / wide tablet: directly to the right of the eye icon, slightly above the input box
      left = rect.right + 12;
      top = Math.max(12, Math.min(rect.top - 20, vh - estimatedHeight - 12));
    } else {
      // Narrower tablet / mobile HP: anchored to the right edge (above the eye icon) slightly above the input box
      left = Math.max(12, Math.min(rect.right - popupWidth, vw - popupWidth - 12));
      top = rect.top - estimatedHeight - 8;
      if (top < 12) {
        top = Math.min(vh - estimatedHeight - 12, rect.bottom + 8);
      }
    }

    setCoords({
      top: Math.round(top),
      left: Math.round(left),
      width: Math.round(popupWidth),
      ready: true,
    });
  }, [anchorRef]);

  useEffect(() => {
    if (!open || !mounted) return;
    updatePosition();

    const handleScrollOrResize = () => updatePosition();
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
    };
  }, [open, mounted, updatePosition]);

  if (!mounted || !open || !recommendedPassword) return null;

  const popupNode = (
    <div
      role="dialog"
      aria-label="Recommended Password"
      onMouseDown={(e) => {
        // Prevent input blur before button click handlers execute
        e.preventDefault();
      }}
      style={{
        position: "fixed",
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        width: `${coords.width}px`,
        backgroundColor: "#000000",
        border: "none",
        borderRadius: "2px",
        padding: "14px 16px",
        zIndex: 10050,
        boxShadow: "0 14px 32px rgba(0, 0, 0, 0.85)",
        opacity: coords.ready ? 1 : 0,
        transition: "opacity 0.14s ease-out",
        userSelect: "none",
      }}
    >
      {/* Subheader / Title: Arial Bold White, No Glow, slightly larger than footer */}
      <div
        style={{
          fontFamily: "Arial, Helvetica, sans-serif",
          fontWeight: 700,
          fontSize: "16.5px",
          lineHeight: 1.25,
          color: "#ffffff",
          textShadow: "none",
          marginBottom: "6px",
        }}
      >
        Recommended Password
      </div>

      {/* Description inside: Tiny Arial Non-Bold (+25% scaled for crisp UI/UX), White, No Glow */}
      <div
        style={{
          fontFamily: "Arial, Helvetica, sans-serif",
          fontWeight: 400,
          fontSize: "13px",
          lineHeight: 1.45,
          color: "#ffffff",
          textShadow: "none",
          marginBottom: "14px",
          wordBreak: "break-word",
        }}
      >
        Use your password for your security.
      </div>

      {/* Sub-footer: Yes <space between> Choose your own (Arial Bold White, No Glow, +25% subtitle size) */}
      <div
        style={{
          display: "flex",
           alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <button
          type="button"
          onClick={() => onAccept?.(recommendedPassword)}
          style={{
            fontFamily: "Arial, Helvetica, sans-serif",
            fontWeight: 700,
            fontSize: "15px",
            lineHeight: 1.2,
            color: "#ffffff",
            textShadow: "none",
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
          }}
          className="hover:opacity-80 active:opacity-60 transition-opacity"
        >
          Yes
        </button>

        <button
          type="button"
          onClick={() => onDismiss?.()}
          style={{
            fontFamily: "Arial, Helvetica, sans-serif",
            fontWeight: 700,
            fontSize: "15px",
            lineHeight: 1.2,
            color: "#ffffff",
            textShadow: "none",
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
          }}
          className="hover:opacity-80 active:opacity-60 transition-opacity"
        >
          Choose your own
        </button>
      </div>
    </div>
  );

  return createPortal(popupNode, document.body);
}


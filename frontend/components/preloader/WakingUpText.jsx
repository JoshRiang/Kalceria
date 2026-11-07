"use client";

import { useEffect, useState } from "react";

export function WakingUpText() {
  const [text, setText] = useState("");
  const fullText = "WAKING UP SERVER";
  const [showDots, setShowDots] = useState(false);
  const [dots, setDots] = useState("");

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i <= fullText.length) {
        setText(fullText.slice(0, i));
        i++;
      } else {
        clearInterval(interval);
        setShowDots(true);
      }
    }, 80);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!showDots) return;
    let dotCount = 1;
    const dotInterval = setInterval(() => {
      setDots(".".repeat(dotCount));
      dotCount = (dotCount % 3) + 1;
    }, 400);

    return () => clearInterval(dotInterval);
  }, [showDots]);

  return (
    <div
      className="mt-0 flex relative w-fit"
      style={{
        color: "rgba(255,255,255,0.7)",
        fontFamily: "'Inter', sans-serif",
        fontSize: "9px",
        letterSpacing: "0.8em",
        textTransform: "uppercase",
        fontWeight: 300,
      }}
    >
      <span>{text}</span>
      <span style={{ position: "absolute", left: "100%", whiteSpace: "pre" }}>
        {showDots ? dots : ""}
      </span>
    </div>
  );
}

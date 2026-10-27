"use client";
import { useState, useEffect } from "react";

export const Typewriter = ({ text, speed = 50, delay = 0 }) => {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    let interval;
    const timeout = setTimeout(() => {
      let i = 0;
      interval = setInterval(() => {
        if (i <= text.length) {
          setDisplayed(text.slice(0, i));
          i++;
        } else {
          clearInterval(interval);
        }
      }, speed);
    }, delay);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [text, speed, delay]);
  return <span>{displayed}</span>;
};

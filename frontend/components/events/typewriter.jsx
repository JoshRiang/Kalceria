"use client";
import { useState, useEffect, useRef } from "react";

export const Typewriter = ({ text, speed = 50, delay = 0 }) => {
  const [displayed, setDisplayed] = useState("");
  const intervals = useRef(new Set());

  useEffect(() => () => {
    intervals.current.forEach(clearInterval);
    intervals.current.clear();
  }, []);

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
          intervals.current.delete(interval);
        }
      }, speed);
      intervals.current.add(interval);
    }, delay);
    return () => {
      clearTimeout(timeout);
    };
  }, [text, speed, delay]);
  return <span>{displayed}</span>;
};

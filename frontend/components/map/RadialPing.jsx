'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * RadialPing Component
 * A tactical radial animation with outgoing lines and a central pulse.
 * Converted from raw HTML/CSS to a high-performance Framer Motion component.
 * 
 * @param {string} color - Primary color for the animation (Default: #6082C5)
 * @param {string} className - Additional CSS classes for the container
 */
/**
 * RadialPing Component
 * @param {string} color - Primary color
 * @param {string} mode - 'out' (explode) or 'in' (implode) or 'none'
 * @param {string} className - Additional CSS classes
 */
const RadialPing = ({ color = "#6082C5", mode = "none", className = "" }) => {
  const lineVariants = {
    initial: { 
      x: 0, 
      y: 0, 
      opacity: 0,
      scale: 1
    },
    out: (direction) => ({
      x: [0, direction.dx],
      y: [0, direction.dy],
      opacity: [1, 0],
      transition: {
        duration: 0.8,
        ease: "easeOut",
        delay: direction.delay
      }
    }),
    in: (direction) => ({
      x: [direction.dx * 0.5, 0],
      y: [direction.dy * 0.5, 0],
      opacity: [0, 1],
      transition: {
        duration: 1.2,
        ease: "anticipate",
        delay: direction.delay
      }
    }),
    none: {
      opacity: 0.2,
      x: 0,
      y: 0
    }
  };

  return (
    <svg 
      viewBox="0 0 400 400" 
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    >
      <defs>
        <filter id="glow-radial" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Central Circle */}
      <motion.circle 
        cx="200" 
        cy="200" 
        r="60" 
        fill={color}
        filter="url(#glow-radial)"
        initial={{ opacity: 0.15, scale: 1 }}
        animate={{ opacity: mode === 'none' ? 0.05 : 0.2 }}
      />
      
      {/* Directional Lines */}
      {[
        { id: 'a', x1: 155, y1: 155, x2: 120, y2: 120, dx: -100, dy: -100, delay: 0.3 },
        { id: 'b', x1: 245, y1: 155, x2: 280, y2: 120, dx: 100, dy: -100, delay: 0.2 },
        { id: 'c', x1: 245, y1: 245, x2: 280, y2: 280, dx: 100, dy: 100, delay: 0.1 },
        { id: 'd', x1: 155, y1: 245, x2: 120, y2: 280, dx: -100, dy: 100, delay: 0.0 },
      ].map((line) => (
        <motion.line 
          key={line.id}
          x1={line.x1} 
          y1={line.y1} 
          x2={line.x2} 
          y2={line.y2}
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          filter="url(#glow-radial)"
          initial="initial"
          animate={mode}
          custom={line}
          variants={lineVariants}
        />
      ))}
    </svg>
  );
};

export default RadialPing;

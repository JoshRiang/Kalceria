"use client";

export function ActionArcSpinner({
  className = "w-4 h-4",
  strokeWidth = 2.8,
  label = "Loading",
}) {
  return (
    <span
      role="status"
      aria-label={label}
      className="inline-flex items-center justify-center"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`${className} animate-spin`}
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray="34 60"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}


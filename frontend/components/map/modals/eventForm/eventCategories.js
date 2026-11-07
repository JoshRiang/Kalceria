export const EVENT_CATEGORIES_GRID = [
  {
    id: "cafe",
    label: "Cafe Meeting",
    renderIcon: (isSelected, isModalDark) => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <path d="M10 2c-.8 1.5.8 2.6 0 4.2" stroke={isSelected ? (isModalDark ? "#ffffff" : "#000000") : (isModalDark ? "#8b949e" : "#57606a")} strokeWidth="1.4" strokeLinecap="round" />
        <path d="M13.5 1.5c-.9 1.6.9 2.8 0 4.5" stroke={isSelected ? (isModalDark ? "#ffffff" : "#000000") : (isModalDark ? "#8b949e" : "#57606a")} strokeWidth="1.4" strokeLinecap="round" />
        <path d="M4 9.5h13c0 5-3 7.8-6.5 7.8S4 14.5 4 9.5z" fill={isModalDark ? "#ffffff" : "#000000"} stroke={isModalDark ? "#000000" : "#ffffff"} strokeWidth="0.75" />
        <ellipse cx="10.5" cy="9.5" rx="6" ry="1.6" fill={isModalDark ? "#000000" : "#ffffff"} stroke={isModalDark ? "#ffffff" : "#000000"} strokeWidth="0.6" />
        <path d="M5.5 11c-.2 1.8 1.2 4 2.8 4.8" stroke={isModalDark ? "#000000" : "#ffffff"} strokeWidth="1.3" strokeLinecap="round" />
        <path d="M17 10.5c2 0 3.5 1.2 3.5 2.8s-1.5 2.8-3.5 2.8" stroke={isSelected ? (isModalDark ? "#ffffff" : "#000000") : (isModalDark ? "#8b949e" : "#57606a")} strokeWidth="1.8" strokeLinecap="round" />
        <ellipse cx="10.5" cy="19.2" rx="8.5" ry="1.7" fill={isModalDark ? "#ffffff" : "#000000"} stroke={isModalDark ? "#000000" : "#ffffff"} strokeWidth="0.6" />
        <ellipse cx="10.5" cy="18.8" rx="6" ry="1" fill={isModalDark ? "#000000" : "#ffffff"} />
      </svg>
    ),
  },
  {
    id: "eat",
    label: "Eat Together",
    renderIcon: (isSelected, isModalDark) => (
      <svg viewBox="0 0 24 24" className="w-5 h-5 overflow-visible" fill="none">
        <path
          d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-7v8h2.5V22H21V2c-2.76 0-5 2.24-5 5z"
          fill={isSelected ? (isModalDark ? "#ffffff" : "#000000") : (isModalDark ? "#8b949e" : "#57606a")}
          stroke={isModalDark ? "#000000" : "#ffffff"}
          strokeWidth="1.4"
          strokeLinejoin="round"
          style={{ paintOrder: "stroke fill" }}
        />
      </svg>
    ),
  },
  {
    id: "special",
    label: "Something Special",
    renderIcon: (isSelected, isModalDark) => (
      <svg viewBox="0 0 24 24" className="w-5 h-5 overflow-visible" fill="none">
        <path
          d="M9.8 2.5h4.4l-.9 12h-2.6L9.8 2.5zM12 16.3a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4z"
          fill={isSelected ? (isModalDark ? "#ffffff" : "#000000") : (isModalDark ? "#8b949e" : "#57606a")}
          stroke={isModalDark ? "#000000" : "#ffffff"}
          strokeWidth="1.4"
          strokeLinejoin="round"
          style={{ paintOrder: "stroke fill" }}
        />
      </svg>
    ),
  },
  {
    id: "discuss",
    label: "Discuss More",
    renderIcon: (isSelected, isModalDark) => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <path d="M9 2.5h6c1.8 0 3.2 1.2 3.2 2.8s-1.4 2.8-3.2 2.8h-1.5l-2.5 2.5v-2.5H9c-1.8 0-3.2-1.2-3.2-2.8S7.2 2.5 9 2.5z" fill={isModalDark ? "#ffffff" : "#000000"} stroke={isModalDark ? "#000000" : "#ffffff"} strokeWidth="0.8" />
        <circle cx="10.5" cy="5.3" r="0.7" fill={isModalDark ? "#000000" : "#ffffff"} />
        <circle cx="12" cy="5.3" r="0.7" fill={isModalDark ? "#000000" : "#ffffff"} />
        <circle cx="13.5" cy="5.3" r="0.7" fill={isModalDark ? "#000000" : "#ffffff"} />
        <circle cx="7.5" cy="13" r="2.5" fill={isModalDark ? "#ffffff" : "#000000"} stroke={isModalDark ? "#000000" : "#ffffff"} strokeWidth="1" />
        <path d="M3 21c0-2.6 2-4.8 4.5-4.8s4.5 2.2 4.5 4.8" fill={isModalDark ? "#ffffff" : "#000000"} stroke={isModalDark ? "#000000" : "#ffffff"} strokeWidth="1" />
        <circle cx="16.5" cy="13" r="2.5" fill={isModalDark ? "#000000" : "#ffffff"} stroke={isModalDark ? "#ffffff" : "#000000"} strokeWidth="1.2" />
        <path d="M12 21c0-2.6 2-4.8 4.5-4.8s4.5 2.2 4.5 4.8" fill={isModalDark ? "#000000" : "#ffffff"} stroke={isModalDark ? "#ffffff" : "#000000"} strokeWidth="1.2" />
      </svg>
    ),
  },
];

"use client";

import { useTheme } from "./ThemeContext";

interface MapCompassProps {
  bearing: number;
  onResetNorth: () => void;
}

export default function MapCompass({ bearing, onResetNorth }: MapCompassProps) {
  const theme = useTheme();
  const isDark = theme === "dark";

  const rotation = -bearing;

  return (
    <button
      onClick={onResetNorth}
      className={`fixed top-24 right-5 z-[1000] flex h-14 w-14 items-center justify-center rounded-full border backdrop-blur-md transition-colors sm:right-6 ${
        isDark
          ? "border-neutral-700 bg-[#0f0f0f]/80 hover:bg-[#1a1a1a]"
          : "border-neutral-300 bg-white/80 hover:bg-white"
      }`}
      style={{
        boxShadow: isDark
          ? "0 2px 12px rgba(0,0,0,0.4)"
          : "0 2px 12px rgba(0,0,0,0.1)",
      }}
      title="Reset to north"
    >
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: "transform 0.15s ease-out",
        }}
      >
        {/* North half (red) */}
        <polygon
          points="12,2 15.5,12 8.5,12"
          fill={isDark ? "#ef4444" : "#dc2626"}
        />
        {/* South half */}
        <polygon
          points="12,22 8.5,12 15.5,12"
          fill={isDark ? "#a3a3a3" : "#737373"}
        />
        {/* "N" label */}
        <text
          x="12"
          y="9.5"
          textAnchor="middle"
          fill="white"
          fontSize="5"
          fontWeight="bold"
          fontFamily="system-ui, sans-serif"
        >
          N
        </text>
      </svg>
    </button>
  );
}

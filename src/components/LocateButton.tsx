"use client";

import { FaLocationArrow } from "react-icons/fa";
import { useTheme } from "./ThemeContext";
import type { LocationStatus } from "./UserLocationTracker";

interface LocateButtonProps {
  onClick: () => void;
  status: LocationStatus;
}

export default function LocateButton({ onClick, status }: LocateButtonProps) {
  const theme = useTheme();
  const isDark = theme === "dark";

  const isRequesting = status === "requesting";
  const isActive = status === "active";
  const isError = status === "denied" || status === "unavailable" || status === "error";

  let title = "Find my location";
  if (isRequesting) title = "Getting location...";
  if (isActive) title = "Go to my location";
  if (status === "denied") title = "Location access denied — tap to retry";
  if (status === "unavailable") title = "Location unavailable — tap to retry";
  if (status === "error") title = "Location error — tap to retry";

  return (
    <button
      onClick={onClick}
      className={`fixed bottom-5 left-5 z-[1000] flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md transition-all sm:bottom-6 sm:left-6 ${
        isDark
          ? "border-neutral-700 bg-[#0f0f0f]/80 hover:bg-[#1a1a1a]"
          : "border-neutral-300 bg-white/80 hover:bg-white"
      } ${
        isActive
          ? isDark
            ? "text-[#f5c542] border-[#f5c542]/40"
            : "text-[#b8860b] border-[#b8860b]/40"
          : isError
            ? "text-red-400 border-red-400/40"
            : isDark
              ? "text-neutral-400"
              : "text-neutral-500"
      }`}
      style={{
        boxShadow: isDark
          ? "0 2px 12px rgba(0,0,0,0.4)"
          : "0 2px 12px rgba(0,0,0,0.1)",
      }}
      title={title}
    >
      {isRequesting ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="animate-spin"
        >
          <circle
            cx="8"
            cy="8"
            r="6.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="32"
            strokeDashoffset="10"
          />
        </svg>
      ) : (
        <FaLocationArrow size={15} />
      )}

      {isError && (
        <span
          className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 border border-black/20"
        />
      )}
    </button>
  );
}

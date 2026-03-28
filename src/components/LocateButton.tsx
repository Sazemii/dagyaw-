"use client";

import { FaLocationArrow } from "react-icons/fa";
import { useTheme } from "./ThemeContext";

interface LocateButtonProps {
  onClick: () => void;
}

export default function LocateButton({ onClick }: LocateButtonProps) {
  const theme = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={onClick}
      className={`fixed bottom-6 left-6 z-[1000] flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md transition-all ${
        isDark
          ? "border-neutral-700 bg-[#0f0f0f]/80 text-[#f5c542] hover:bg-[#1a1a1a]"
          : "border-neutral-300 bg-white/80 text-[#b8860b] hover:bg-white"
      }`}
      style={{
        boxShadow: isDark
          ? "0 2px 12px rgba(0,0,0,0.4)"
          : "0 2px 12px rgba(0,0,0,0.1)",
      }}
      title="Find my location"
    >
      <FaLocationArrow size={15} />
    </button>
  );
}

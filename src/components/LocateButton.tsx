/**
 * ==================================================================================
 * Team Smart Dito sa Globe (SDG)
 * BLUE HACKS 2026: GENERATIVE AI DISCLOSURE
 * * This code was created with the assistance of AI tools such as:
 * - Claude 4.6 Opus (Anthropic)
 * - GPT 5.3 - Codex (OpenAI)
 * - Claude Gemini 3.1 Pro (Google)
 * * Purpose: This AI was utilized for code generation (logic and functions),
 * brainstorming, code refinement (debugging), and performance optimization.
 * ==================================================================================
 */

"use client";

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
  const isError =
    status === "denied" || status === "unavailable" || status === "error";

  let title = "Find my location";
  if (isRequesting) title = "Getting location...";
  if (isActive) title = "Go to my location";
  if (status === "denied") title = "Location access denied — tap to retry";
  if (status === "unavailable") title = "Location unavailable — tap to retry";
  if (status === "error") title = "Location error — tap to retry";

  return (
    <button
      onClick={onClick}
      className={`fixed bottom-[84px] right-5 z-[1000] flex h-14 w-14 items-center justify-center rounded-full border backdrop-blur-md transition-all sm:bottom-[92px] sm:right-6 ${
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
          width="20"
          height="20"
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
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
          <line
            x1="12"
            y1="3"
            x2="12"
            y2="1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="12"
            y1="23"
            x2="12"
            y2="21"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="3"
            y1="12"
            x2="1"
            y2="12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="23"
            y1="12"
            x2="21"
            y2="12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>
      )}

      {isError && (
        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 border border-black/20" />
      )}
    </button>
  );
}

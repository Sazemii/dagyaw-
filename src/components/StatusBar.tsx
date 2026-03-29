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

import type { Pin } from "./MapView";
import { useTheme } from "./ThemeContext";

interface StatusBarProps {
  pins: Pin[];
}

export default function StatusBar({ pins }: StatusBarProps) {
  const theme = useTheme();
  const isDark = theme === "dark";

  const activeCount = pins.filter((p) => p.status === "active").length;
  const resolvedCount = pins.filter((p) => p.status === "resolved").length;

  return (
    <div className="fixed left-1/2 top-4 z-[1000] -translate-x-1/2">
      <div
        className={`flex items-center gap-1 rounded-full border px-4 py-2 backdrop-blur-md ${
          isDark
            ? "border-neutral-800 bg-[#0f0f0f]/90"
            : "border-neutral-300 bg-white/85"
        }`}
      >
        <span
          className={`mr-3 text-sm font-bold tracking-wide ${
            isDark ? "text-[#f5c542]" : "text-[#b8860b]"
          }`}
        >
          BAYANIHAN
        </span>

        <div
          className={`mr-2 h-4 w-px ${isDark ? "bg-neutral-700" : "bg-neutral-300"}`}
        />

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className={isDark ? "text-neutral-400" : "text-neutral-500"}>
              Active
            </span>
            <span
              className={`font-semibold ${isDark ? "text-white" : "text-neutral-900"}`}
            >
              {activeCount}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className={isDark ? "text-neutral-400" : "text-neutral-500"}>
              Resolved
            </span>
            <span
              className={`font-semibold ${isDark ? "text-white" : "text-neutral-900"}`}
            >
              {resolvedCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

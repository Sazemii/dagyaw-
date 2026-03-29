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

import { FaPlus } from "react-icons/fa";
import { useTheme } from "./ThemeContext";

interface ReportButtonProps {
  isActive: boolean;
  onClick: () => void;
}

export default function ReportButton({ isActive, onClick }: ReportButtonProps) {
  const theme = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={onClick}
      className={`fixed bottom-5 right-5 z-[1000] flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 sm:bottom-6 sm:right-6 ${
        isActive
          ? isDark
            ? "rotate-45 bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
            : "rotate-45 bg-neutral-200 text-neutral-600 hover:bg-neutral-300"
          : isDark
            ? "bg-[#f5c542] text-black hover:bg-[#e6b635]"
            : "bg-[#b8860b] text-white hover:bg-[#a0750a]"
      }`}
      style={{
        boxShadow: isActive
          ? isDark
            ? "0 4px 15px rgba(0,0,0,0.4)"
            : "0 4px 15px rgba(0,0,0,0.15)"
          : isDark
            ? "0 4px 20px rgba(245,197,66,0.35)"
            : "0 4px 20px rgba(184,134,11,0.35)",
      }}
    >
      <FaPlus size={20} className="transition-transform duration-300" />
    </button>
  );
}

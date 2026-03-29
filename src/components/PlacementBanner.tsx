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

import CategoryIcon from "./CategoryIcon";
import type { Category } from "./categories";
import { FaTimes } from "react-icons/fa";
import { useTheme } from "./ThemeContext";

interface PlacementBannerProps {
  category: Category;
  onCancel: () => void;
}

export default function PlacementBanner({
  category,
  onCancel,
}: PlacementBannerProps) {
  const theme = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="fixed bottom-24 left-1/2 z-[1000] -translate-x-1/2">
      <div
        className="flex items-center gap-3 rounded-full border px-4 py-2.5 backdrop-blur-md"
        style={{
          borderColor: `${category.color}44`,
          background: isDark ? "rgba(15,15,15,0.92)" : "rgba(255,255,255,0.92)",
          boxShadow: isDark
            ? `0 4px 20px rgba(0,0,0,0.4), 0 0 15px ${category.color}22`
            : `0 4px 20px rgba(0,0,0,0.08), 0 0 15px ${category.color}18`,
        }}
      >
        <CategoryIcon
          iconName={category.icon}
          color={category.color}
          size={16}
        />
        <span
          className={`text-sm ${isDark ? "text-neutral-200" : "text-neutral-700"}`}
        >
          Tap the map to place a{" "}
          <span style={{ color: category.color }} className="font-medium">
            {category.label}
          </span>{" "}
          pin
        </span>
        <button
          onClick={onCancel}
          className={`ml-1 flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
            isDark
              ? "bg-neutral-800 text-neutral-500 hover:bg-neutral-700 hover:text-white"
              : "bg-neutral-200 text-neutral-400 hover:bg-neutral-300 hover:text-neutral-700"
          }`}
        >
          <FaTimes size={10} />
        </button>
      </div>
    </div>
  );
}

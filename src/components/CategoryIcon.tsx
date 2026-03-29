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

import {
  FaTrash,
  FaRecycle,
  FaFire,
  FaTint,
  FaLightbulb,
  FaTrafficLight,
  FaRoad,
  FaWater,
  FaTree,
  FaExclamationTriangle,
  FaVolumeUp,
  FaDog,
  FaSmog,
  FaEllipsisH,
} from "react-icons/fa";
import type { IconType } from "react-icons";

const ICON_MAP: Record<string, IconType> = {
  FaTrash,
  FaRecycle,
  FaFire,
  FaTint,
  FaLightbulb,
  FaTrafficLight,
  FaRoad,
  FaWater,
  FaTree,
  FaExclamationTriangle,
  FaVolumeUp,
  FaDog,
  FaSmog,
  FaEllipsisH,
};

interface CategoryIconProps {
  iconName: string;
  color: string;
  size?: number;
  className?: string;
}

export default function CategoryIcon({
  iconName,
  color,
  size = 18,
  className = "",
}: CategoryIconProps) {
  const Icon = ICON_MAP[iconName];
  if (!Icon) return null;
  return <Icon size={size} color={color} className={className} />;
}

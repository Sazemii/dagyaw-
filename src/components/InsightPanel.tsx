"use client";

import {
  FaTimes,
  FaExclamationTriangle,
  FaInfoCircle,
  FaShieldAlt,
  FaWater,
  FaSmog,
} from "react-icons/fa";
import type { Insight } from "../lib/insights/types";
import { useTheme } from "./ThemeContext";

interface InsightPanelProps {
  insight: Insight;
  onClose: () => void;
}

const SEVERITY_CONFIG = {
  info: {
    accentDark: "rgba(245, 197, 66, 0.5)",
    accentLight: "rgba(184, 134, 11, 0.5)",
    badgeDark: "bg-[#f5c542]/10 text-[#f5c542]",
    badgeLight: "bg-[#b8860b]/10 text-[#8a6d08]",
    icon: FaInfoCircle,
    iconColorDark: "#f5c542",
    iconColorLight: "#b8860b",
    label: "Info",
  },
  warning: {
    accentDark: "rgba(245, 197, 66, 0.7)",
    accentLight: "rgba(184, 134, 11, 0.7)",
    badgeDark: "bg-[#f5c542]/15 text-[#f5c542]",
    badgeLight: "bg-[#b8860b]/12 text-[#8a6d08]",
    icon: FaExclamationTriangle,
    iconColorDark: "#f5c542",
    iconColorLight: "#b8860b",
    label: "Warning",
  },
  critical: {
    accentDark: "rgba(239, 68, 68, 0.8)",
    accentLight: "rgba(220, 38, 38, 0.7)",
    badgeDark: "bg-red-500/12 text-red-400",
    badgeLight: "bg-red-500/10 text-red-600",
    icon: FaShieldAlt,
    iconColorDark: "#ef4444",
    iconColorLight: "#dc2626",
    label: "Critical",
  },
};

export default function InsightPanel({ insight, onClose }: InsightPanelProps) {
  const theme = useTheme();
  const isDark = theme === "dark";
  const config = SEVERITY_CONFIG[insight.severity];
  const SeverityIcon = config.icon;
  const TypeIcon = insight.type === "waste_flood" ? FaWater : FaSmog;
  const iconColor = isDark ? config.iconColorDark : config.iconColorLight;
  const accentColor = isDark ? config.accentDark : config.accentLight;

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        className={`relative z-10 mx-4 mb-4 w-full max-w-md overflow-hidden rounded-2xl border sm:mb-0 ${
          isDark
            ? "border-white/[0.08] bg-[#141414] text-white"
            : "border-black/[0.06] bg-white text-neutral-900"
        }`}
        style={{
          boxShadow: isDark
            ? "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)"
            : "0 24px 80px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.02)",
        }}
      >
        {/* Severity accent strip */}
        <div
          className="h-1 w-full"
          style={{ background: accentColor }}
        />

        {/* Header */}
        <div className="flex items-start justify-between p-4 pb-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                isDark ? "bg-white/[0.06]" : "bg-black/[0.04]"
              }`}
            >
              <TypeIcon size={18} color={iconColor} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${isDark ? config.badgeDark : config.badgeLight}`}>
                  <SeverityIcon size={8} className="mr-1 inline" />
                  {config.label}
                </span>
                <span className={`text-[10px] ${isDark ? "text-neutral-500" : "text-neutral-400"}`}>
                  Priority: {insight.priorityScore}/100
                </span>
              </div>
              <h3 className={`mt-1 text-sm font-bold leading-tight ${isDark ? "text-neutral-100" : "text-neutral-900"}`}>
                {insight.title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
              isDark
                ? "text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.06]"
                : "text-neutral-400 hover:text-neutral-700 hover:bg-black/[0.05]"
            }`}
          >
            <FaTimes size={12} />
          </button>
        </div>

        {/* Body */}
        <div className={`px-4 pb-3 ${isDark ? "text-neutral-400" : "text-neutral-600"}`}>
          <p className="text-xs leading-relaxed">{insight.body}</p>
        </div>

        {/* Risk factors */}
        {insight.riskFactors.length > 0 && (
          <div className="px-4 pb-3">
            <p className={`mb-1.5 text-[10px] font-semibold uppercase tracking-wider ${isDark ? "text-neutral-500" : "text-neutral-400"}`}>
              Risk Factors
            </p>
            <div className="flex flex-wrap gap-1.5">
              {insight.riskFactors.map((factor, i) => (
                <span
                  key={i}
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    isDark
                      ? "bg-white/[0.05] text-neutral-400 border border-white/[0.06]"
                      : "bg-black/[0.03] text-neutral-500 border border-black/[0.05]"
                  }`}
                >
                  {factor}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Recommendation + Citizen Tip */}
        <div className={`mx-4 mb-4 rounded-xl border p-3 ${
          isDark
            ? "border-white/[0.06] bg-white/[0.03]"
            : "border-black/[0.05] bg-black/[0.02]"
        }`}>
          <div className="mb-2">
            <p className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? "text-[#f5c542]" : "text-[#b8860b]"}`}>
              LGU Recommendation
            </p>
            <p className={`mt-0.5 text-xs leading-relaxed ${isDark ? "text-neutral-300" : "text-neutral-600"}`}>
              {insight.recommendation}
            </p>
          </div>
          <div className={`border-t pt-2 ${isDark ? "border-white/[0.06]" : "border-black/[0.05]"}`}>
            <p className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>
              Citizen Tip
            </p>
            <p className={`mt-0.5 text-xs leading-relaxed ${isDark ? "text-neutral-300" : "text-neutral-600"}`}>
              {insight.citizenTip}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

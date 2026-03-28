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
    bg: "bg-blue-950/90",
    border: "border-blue-500/30",
    badge: "bg-blue-500/20 text-blue-300",
    icon: FaInfoCircle,
    iconColor: "#3b82f6",
    label: "Info",
  },
  warning: {
    bg: "bg-amber-950/90",
    border: "border-amber-500/30",
    badge: "bg-amber-500/20 text-amber-300",
    icon: FaExclamationTriangle,
    iconColor: "#f59e0b",
    label: "Warning",
  },
  critical: {
    bg: "bg-red-950/90",
    border: "border-red-500/30",
    badge: "bg-red-500/20 text-red-300",
    icon: FaShieldAlt,
    iconColor: "#ef4444",
    label: "Critical",
  },
};

export default function InsightPanel({ insight, onClose }: InsightPanelProps) {
  const theme = useTheme();
  const isDark = theme === "dark";
  const config = SEVERITY_CONFIG[insight.severity];
  const SeverityIcon = config.icon;
  const TypeIcon = insight.type === "waste_flood" ? FaWater : FaSmog;

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        className={`relative z-10 mx-4 mb-4 w-full max-w-md rounded-2xl border ${
          isDark
            ? `${config.bg} ${config.border} text-white`
            : "bg-white border-neutral-200 text-neutral-900"
        } shadow-2xl sm:mb-0`}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 pb-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${config.iconColor}20` }}
            >
              <TypeIcon size={18} color={config.iconColor} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${config.badge}`}>
                  <SeverityIcon size={8} className="mr-1 inline" />
                  {config.label}
                </span>
                <span className={`text-[10px] ${isDark ? "text-neutral-500" : "text-neutral-400"}`}>
                  Priority: {insight.priorityScore}/100
                </span>
              </div>
              <h3 className="mt-1 text-sm font-bold leading-tight">
                {insight.title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`flex h-7 w-7 items-center justify-center rounded-full ${
              isDark ? "text-neutral-500 hover:text-white hover:bg-white/10" : "text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100"
            }`}
          >
            <FaTimes size={12} />
          </button>
        </div>

        {/* Body */}
        <div className={`px-4 pb-3 ${isDark ? "text-neutral-300" : "text-neutral-600"}`}>
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
                    isDark ? "bg-white/5 text-neutral-400" : "bg-neutral-100 text-neutral-500"
                  }`}
                >
                  {factor}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Recommendation + Citizen Tip */}
        <div className={`mx-4 mb-4 rounded-xl p-3 ${isDark ? "bg-white/5" : "bg-neutral-50"}`}>
          <div className="mb-2">
            <p className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? "text-[#f5c542]" : "text-[#b8860b]"}`}>
              LGU Recommendation
            </p>
            <p className={`mt-0.5 text-xs leading-relaxed ${isDark ? "text-neutral-300" : "text-neutral-600"}`}>
              {insight.recommendation}
            </p>
          </div>
          <div className={`border-t pt-2 ${isDark ? "border-white/10" : "border-neutral-200"}`}>
            <p className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? "text-green-400" : "text-green-600"}`}>
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

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

import { useEffect, useState } from "react";
import { FaTimes, FaClock, FaChartBar } from "react-icons/fa";
import { getCityDetailedStats, type CityDetailedStats } from "../lib/pins";
import { getCategoryById } from "./categories";
import CategoryIcon from "./CategoryIcon";
import { useTheme } from "./ThemeContext";

interface CityStatsProps {
  municipalityName: string;
  onClose: () => void;
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/** SVG donut ring for resolution rate */
function ResolutionRing({ rate, isDark }: { rate: number; isDark: boolean }) {
  const radius = 38;
  const stroke = 6;
  const circumference = 2 * Math.PI * radius;
  const filled = (rate / 100) * circumference;
  const remaining = circumference - filled;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
        {/* Track */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={isDark ? "#262626" : "#e5e5e5"}
          strokeWidth={stroke}
        />
        {/* Resolved (green) */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#22c55e"
          strokeWidth={stroke}
          strokeDasharray={`${filled} ${remaining}`}
          strokeDashoffset={circumference * 0.25}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{ filter: "drop-shadow(0 0 4px rgba(34,197,94,0.3))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`text-xl font-bold tabular-nums leading-none ${
            isDark ? "text-white" : "text-neutral-900"
          }`}
        >
          {rate}%
        </span>
        <span
          className={`mt-0.5 text-[9px] font-medium uppercase tracking-wider ${
            isDark ? "text-neutral-500" : "text-neutral-400"
          }`}
        >
          resolved
        </span>
      </div>
    </div>
  );
}

export default function CityStats({
  municipalityName,
  onClose,
}: CityStatsProps) {
  const theme = useTheme();
  const isDark = theme === "dark";
  const [stats, setStats] = useState<CityDetailedStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCityDetailedStats(municipalityName)
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [municipalityName]);

  /* ---- Skeleton loader ---- */
  const skeletonBg = isDark ? "bg-neutral-800" : "bg-neutral-200";
  const skeletonBgDim = isDark ? "bg-neutral-800/60" : "bg-neutral-200/60";

  const content = loading ? (
    <div className="stat-reveal flex flex-col gap-4">
      <div className={`h-7 w-40 animate-pulse rounded ${skeletonBg}`} />
      <div className={`h-4 w-28 animate-pulse rounded ${skeletonBgDim}`} />
      <div className="mt-2 flex items-center gap-5">
        <div
          className={`h-[100px] w-[100px] animate-pulse rounded-full ${skeletonBgDim}`}
        />
        <div className="flex flex-col gap-3">
          <div
            className={`h-10 w-20 animate-pulse rounded-lg ${skeletonBgDim}`}
          />
          <div
            className={`h-10 w-20 animate-pulse rounded-lg ${skeletonBgDim}`}
          />
        </div>
      </div>
    </div>
  ) : !stats ? (
    <p
      className={`stat-reveal text-sm ${isDark ? "text-neutral-500" : "text-neutral-400"}`}
    >
      Failed to load stats.
    </p>
  ) : (
    <div className="flex flex-col gap-5">
      {/* ---- Header ---- */}
      <div className="stat-reveal" style={{ animationDelay: "0ms" }}>
        <p
          className={`text-[10px] font-semibold uppercase tracking-widest ${
            isDark ? "text-neutral-500" : "text-neutral-400"
          }`}
        >
          City Overview
        </p>
        <h2
          className={`mt-1 text-xl font-bold leading-tight ${
            isDark ? "text-white" : "text-neutral-900"
          }`}
        >
          {stats.municipality}
        </h2>
      </div>

      {/* ---- Hero: Ring + Active/Resolved ---- */}
      {stats.total > 0 ? (
        <div
          className="stat-reveal flex items-center gap-5"
          style={{ animationDelay: "80ms" }}
        >
          <ResolutionRing rate={stats.resolutionRate} isDark={isDark} />

          <div className="flex flex-col gap-2 flex-1 min-w-0">
            {/* Active */}
            <div
              className={`rounded-xl px-3.5 py-2.5 border ${
                isDark
                  ? "bg-red-950/30 border-red-900/30"
                  : "bg-red-50 border-red-200/60"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wide ${
                    isDark ? "text-red-400/80" : "text-red-500"
                  }`}
                >
                  Active
                </span>
                <span className="text-lg font-bold tabular-nums text-red-400">
                  {stats.active}
                </span>
              </div>
            </div>

            {/* Resolved */}
            <div
              className={`rounded-xl px-3.5 py-2.5 border ${
                isDark
                  ? "bg-green-950/30 border-green-900/30"
                  : "bg-green-50 border-green-200/60"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wide ${
                    isDark ? "text-green-400/80" : "text-green-600"
                  }`}
                >
                  Resolved
                </span>
                <span className="text-lg font-bold tabular-nums text-green-400">
                  {stats.resolved}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`stat-reveal rounded-xl border p-5 text-center ${
            isDark
              ? "border-neutral-800 bg-neutral-900/50"
              : "border-neutral-200 bg-neutral-50"
          }`}
          style={{ animationDelay: "80ms" }}
        >
          <p
            className={`text-sm ${isDark ? "text-neutral-400" : "text-neutral-500"}`}
          >
            No reports yet
          </p>
          <p
            className={`mt-0.5 text-xs ${isDark ? "text-neutral-600" : "text-neutral-400"}`}
          >
            Be the first to report an issue
          </p>
        </div>
      )}

      {/* ---- Total bar ---- */}
      {stats.total > 0 && (
        <div className="stat-reveal" style={{ animationDelay: "200ms" }}>
          <div
            className={`flex items-center justify-between rounded-lg px-3.5 py-2 ${
              isDark ? "bg-neutral-800/60" : "bg-neutral-100"
            }`}
          >
            <div className="flex items-center gap-2">
              <FaChartBar
                size={10}
                className={isDark ? "text-neutral-500" : "text-neutral-400"}
              />
              <span
                className={`text-[11px] font-medium ${
                  isDark ? "text-neutral-400" : "text-neutral-500"
                }`}
              >
                Total Reports
              </span>
            </div>
            <span
              className={`text-sm font-bold tabular-nums ${
                isDark ? "text-white" : "text-neutral-900"
              }`}
            >
              {stats.total}
            </span>
          </div>
        </div>
      )}

      {/* ---- Top categories ---- */}
      {stats.categoryBreakdown.length > 0 && (
        <div className="stat-reveal" style={{ animationDelay: "300ms" }}>
          <p
            className={`text-[10px] font-semibold uppercase tracking-widest mb-3 ${
              isDark ? "text-neutral-500" : "text-neutral-400"
            }`}
          >
            Top Issues
          </p>
          <div className="flex flex-col gap-2.5">
            {stats.categoryBreakdown.slice(0, 4).map((item, i) => {
              const cat = getCategoryById(item.categoryId);
              const pct = Math.round((item.count / stats.total) * 100);
              return (
                <div
                  key={item.categoryId}
                  className="stat-reveal"
                  style={{ animationDelay: `${370 + i * 60}ms` }}
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                      style={{
                        backgroundColor: cat
                          ? `${cat.color}${isDark ? "18" : "20"}`
                          : isDark
                            ? "#262626"
                            : "#f5f5f5",
                      }}
                    >
                      {cat && (
                        <CategoryIcon
                          iconName={cat.icon}
                          size={11}
                          color={cat.color}
                        />
                      )}
                    </div>
                    <span
                      className={`flex-1 text-xs font-medium truncate ${
                        isDark ? "text-neutral-300" : "text-neutral-700"
                      }`}
                    >
                      {cat?.label ?? item.categoryId}
                    </span>
                    <span
                      className={`text-[11px] font-semibold tabular-nums shrink-0 ${
                        isDark ? "text-neutral-400" : "text-neutral-500"
                      }`}
                    >
                      {item.count}
                    </span>
                    <span
                      className={`text-[10px] tabular-nums shrink-0 ${
                        isDark ? "text-neutral-600" : "text-neutral-400"
                      }`}
                    >
                      {pct}%
                    </span>
                  </div>
                  <div
                    className={`h-1.5 w-full overflow-hidden rounded-full ${
                      isDark ? "bg-neutral-800" : "bg-neutral-200"
                    }`}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: cat?.color ?? "#555",
                        boxShadow: cat ? `0 0 6px ${cat.color}40` : "none",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---- Most recent ---- */}
      {stats.mostRecentReport && (
        <div
          className={`stat-reveal flex items-center gap-1.5 ${
            isDark ? "text-neutral-600" : "text-neutral-400"
          }`}
          style={{
            animationDelay: `${370 + Math.min(stats.categoryBreakdown.length, 4) * 60}ms`,
          }}
        >
          <FaClock size={10} />
          <span className="text-[11px]">
            Last report {formatTimeAgo(stats.mostRecentReport)}
          </span>
        </div>
      )}
    </div>
  );

  const panelBg = isDark ? "bg-[#0f0f0f]" : "bg-white";
  const panelBorder = isDark ? "border-neutral-800" : "border-neutral-200";
  const closeBtnCls = isDark
    ? "bg-neutral-800 text-neutral-500 hover:bg-neutral-700 hover:text-neutral-300"
    : "bg-neutral-100 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-600";

  return (
    <div className="fixed inset-0 z-[1200]">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 ${isDark ? "bg-black/50" : "bg-black/20"}`}
        onClick={onClose}
      />

      {/* Desktop: right panel */}
      <div className="hidden md:flex absolute top-0 right-0 h-full w-[340px] flex-col justify-center z-10">
        <div
          className={`relative mx-4 rounded-2xl border ${panelBorder} ${panelBg} p-6`}
          style={{
            boxShadow: isDark
              ? "0 8px 40px rgba(0,0,0,0.6)"
              : "0 8px 40px rgba(0,0,0,0.12)",
          }}
        >
          <button
            onClick={onClose}
            className={`absolute top-3 right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full transition-colors ${closeBtnCls}`}
          >
            <FaTimes size={11} />
          </button>
          {content}
        </div>
      </div>

      {/* Mobile: bottom sheet */}
      <div className="md:hidden absolute bottom-0 left-0 right-0 animate-slide-up z-10">
        <div
          className={`relative rounded-t-2xl border-t ${panelBorder} ${panelBg} px-5 pb-8 pt-3`}
          style={{
            boxShadow: isDark
              ? "0 -4px 30px rgba(0,0,0,0.5)"
              : "0 -4px 30px rgba(0,0,0,0.08)",
          }}
        >
          {/* Drag handle */}
          <div
            className={`mx-auto mb-4 h-1 w-10 rounded-full ${
              isDark ? "bg-neutral-700" : "bg-neutral-300"
            }`}
          />
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 z-10 flex h-7 w-7 items-center justify-center rounded-full transition-colors ${closeBtnCls}`}
          >
            <FaTimes size={11} />
          </button>
          <div className="max-h-[65vh] overflow-y-auto">{content}</div>
        </div>
      </div>
    </div>
  );
}

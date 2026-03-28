"use client";

import { useEffect, useState } from "react";
import { FaTimes, FaClock } from "react-icons/fa";
import { getCityDetailedStats, type CityDetailedStats } from "../lib/pins";
import { getCategoryById } from "./categories";
import CategoryIcon from "./CategoryIcon";

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

export default function CityStats({ municipalityName, onClose }: CityStatsProps) {
  const [stats, setStats] = useState<CityDetailedStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCityDetailedStats(municipalityName)
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [municipalityName]);

  const content = loading ? (
    <div className="stat-reveal flex flex-col gap-3">
      <div className="h-7 w-40 animate-pulse rounded bg-neutral-800" />
      <div className="h-4 w-28 animate-pulse rounded bg-neutral-800/60" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-neutral-800/40" />
        ))}
      </div>
    </div>
  ) : !stats ? (
    <p className="stat-reveal text-neutral-500 text-sm">Failed to load stats.</p>
  ) : (
    <div className="flex flex-col gap-5">
      {/* City name */}
      <div className="stat-reveal" style={{ animationDelay: "0ms" }}>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
          City Overview
        </p>
        <h2 className="mt-1 text-2xl font-bold text-white leading-tight">
          {stats.municipality}
        </h2>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <div
          className="stat-reveal rounded-xl bg-neutral-800/80 p-3.5"
          style={{ animationDelay: "80ms" }}
        >
          <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">Total</p>
          <p className="mt-1 text-2xl font-bold text-white">{stats.total}</p>
        </div>

        <div
          className="stat-reveal rounded-xl bg-neutral-800/80 p-3.5"
          style={{ animationDelay: "150ms" }}
        >
          <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">Rate</p>
          <p className="mt-1 text-2xl font-bold text-white">
            {stats.resolutionRate}<span className="text-sm text-neutral-500">%</span>
          </p>
        </div>

        <div
          className="stat-reveal rounded-xl bg-neutral-800/80 p-3.5"
          style={{ animationDelay: "220ms" }}
        >
          <p className="text-[10px] font-medium uppercase tracking-wide text-red-400/70">Active</p>
          <p className="mt-1 text-2xl font-bold text-red-400">{stats.active}</p>
        </div>

        <div
          className="stat-reveal rounded-xl bg-neutral-800/80 p-3.5"
          style={{ animationDelay: "290ms" }}
        >
          <p className="text-[10px] font-medium uppercase tracking-wide text-green-400/70">Resolved</p>
          <p className="mt-1 text-2xl font-bold text-green-400">{stats.resolved}</p>
        </div>
      </div>

      {/* Progress bar */}
      {stats.total > 0 && (
        <div className="stat-reveal" style={{ animationDelay: "360ms" }}>
          <div className="flex justify-between text-[10px] text-neutral-500 mb-1.5">
            <span>Resolution</span>
            <span>{stats.resolutionRate}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-700"
              style={{ width: `${stats.resolutionRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Top categories */}
      {stats.categoryBreakdown.length > 0 && (
        <div className="stat-reveal" style={{ animationDelay: "430ms" }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500 mb-2.5">
            Top Issues
          </p>
          <div className="flex flex-col gap-2">
            {stats.categoryBreakdown.slice(0, 4).map((item, i) => {
              const cat = getCategoryById(item.categoryId);
              const pct = Math.round((item.count / stats.total) * 100);
              return (
                <div
                  key={item.categoryId}
                  className="stat-reveal flex items-center gap-2.5"
                  style={{ animationDelay: `${500 + i * 70}ms` }}
                >
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                    style={{
                      backgroundColor: cat ? `${cat.color}18` : "#262626",
                    }}
                  >
                    {cat && (
                      <CategoryIcon iconName={cat.icon} size={12} color={cat.color} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-300 truncate">
                        {cat?.label ?? item.categoryId}
                      </span>
                      <span className="ml-2 text-[10px] text-neutral-600 shrink-0">
                        {item.count}
                      </span>
                    </div>
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-neutral-800">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: cat?.color ?? "#555",
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Most recent */}
      {stats.mostRecentReport && (
        <div
          className="stat-reveal flex items-center gap-1.5 text-neutral-600"
          style={{ animationDelay: `${500 + Math.min(stats.categoryBreakdown.length, 4) * 70}ms` }}
        >
          <FaClock size={10} />
          <span className="text-[11px]">Last report {formatTimeAgo(stats.mostRecentReport)}</span>
        </div>
      )}

      {/* Empty */}
      {stats.total === 0 && (
        <div
          className="stat-reveal rounded-xl bg-neutral-800/60 p-5 text-center"
          style={{ animationDelay: "360ms" }}
        >
          <p className="text-sm text-neutral-400">No reports yet</p>
          <p className="mt-0.5 text-xs text-neutral-600">Be the first to report an issue</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[1200]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Desktop: right panel */}
      <div className="hidden md:flex absolute top-0 right-0 h-full w-[340px] flex-col justify-center">
        <div className="relative mx-4 rounded-2xl border border-neutral-800 bg-[#0f0f0f] p-6 shadow-2xl">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-neutral-800 text-neutral-500 transition-colors hover:bg-neutral-700 hover:text-neutral-300"
          >
            <FaTimes size={11} />
          </button>
          {content}
        </div>
      </div>

      {/* Mobile: bottom sheet */}
      <div className="md:hidden absolute bottom-0 left-0 right-0 animate-slide-up">
        <div className="rounded-t-2xl border-t border-neutral-800 bg-[#0f0f0f] px-5 pb-8 pt-3">
          {/* Drag handle */}
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-700" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-full bg-neutral-800 text-neutral-500 transition-colors hover:bg-neutral-700 hover:text-neutral-300"
          >
            <FaTimes size={11} />
          </button>
          <div className="max-h-[65vh] overflow-y-auto">{content}</div>
        </div>
      </div>
    </div>
  );
}

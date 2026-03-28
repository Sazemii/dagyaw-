"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthContext";
import { supabase } from "../../lib/supabase";
import {
  getCityDetailedStats,
  fetchPinsByMunicipality,
  type CityDetailedStats,
} from "../../lib/pins";
import type { Pin } from "../../components/MapView";
import { getCategoryById } from "../../components/categories";
import CategoryIcon from "../../components/CategoryIcon";
import {
  FaArrowLeft,
  FaSun,
  FaMoon,
  FaSearch,
  FaMapMarkerAlt,
  FaChartBar,
  FaClock,
  FaShieldAlt,
  FaCheckCircle,
  FaExclamationCircle,
  FaFileAlt,
  FaSpinner,
  FaExclamationTriangle,
  FaLightbulb,
  FaTimes,
} from "react-icons/fa";
import type { MunicipalityReport } from "../../lib/insights/types";

interface Place {
  name: string;
  displayName: string;
  lat: number;
  lng: number;
}

async function searchPlaces(query: string): Promise<Place[]> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?` +
      new URLSearchParams({
        q: query,
        countrycodes: "ph",
        format: "json",
        limit: "8",
        featuretype: "city",
        addressdetails: "1",
      }),
    { headers: { "User-Agent": "Bayanihan-App/1.0" } }
  );
  if (!res.ok) return [];

  const data = await res.json();
  return data
    .filter((item: { address?: Record<string, string> }) => {
      const addr = item.address || {};
      return addr.city || addr.municipality || addr.town;
    })
    .map(
      (item: {
        display_name: string;
        lat: string;
        lon: string;
        address?: Record<string, string>;
      }) => {
        const addr = item.address || {};
        const name =
          addr.city ||
          addr.municipality ||
          addr.town ||
          item.display_name.split(",")[0];
        return {
          name,
          displayName: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        };
      }
    );
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

function ResolutionRing({ rate }: { rate: number }) {
  const radius = 44;
  const stroke = 7;
  const circumference = 2 * Math.PI * radius;
  const filled = (rate / 100) * circumference;
  const remaining = circumference - filled;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle
          cx="55"
          cy="55"
          r={radius}
          fill="none"
          stroke="#262626"
          strokeWidth={stroke}
        />
        <circle
          cx="55"
          cy="55"
          r={radius}
          fill="none"
          stroke="#22c55e"
          strokeWidth={stroke}
          strokeDasharray={`${filled} ${remaining}`}
          strokeDashoffset={circumference * 0.25}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{ filter: "drop-shadow(0 0 6px rgba(34,197,94,0.3))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums text-white leading-none">
          {rate}%
        </span>
        <span className="mt-1 text-[9px] font-medium uppercase tracking-wider text-neutral-500">
          resolved
        </span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, isCommunityWatcher } = useAuth();

  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const isDark = theme === "dark";

  // Municipality search
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Selected municipality
  const [municipality, setMunicipality] = useState<string | null>(null);
  const [stats, setStats] = useState<CityDetailedStats | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  // Report generation
  const [report, setReport] = useState<MunicipalityReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(true);

  // Load saved municipality from user metadata
  useEffect(() => {
    if (user?.user_metadata?.dashboard_municipality) {
      const saved = user.user_metadata.dashboard_municipality as string;
      setMunicipality(saved);
      setQuery(saved);
    }
  }, [user]);

  // Load data when municipality changes
  useEffect(() => {
    if (!municipality) return;

    setStatsLoading(true);
    Promise.all([
      getCityDetailedStats(municipality),
      fetchPinsByMunicipality(municipality),
    ])
      .then(([statsData, pinsData]) => {
        setStats(statsData);
        setPins(pinsData);

        // Auto-generate report when data loads
        if (statsData.total > 0) {
          setReportLoading(true);
          setReportError(null);
          setReport(null);
          setShowReport(true);

          fetch("/api/report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ municipality }),
          })
            .then((res) => {
              if (!res.ok) throw new Error("Report generation failed");
              return res.json();
            })
            .then((data) => setReport(data.report))
            .catch((err) =>
              setReportError(
                err instanceof Error ? err.message : "Failed to generate report"
              )
            )
            .finally(() => setReportLoading(false));
        }
      })
      .catch(() => {
        setStats(null);
        setPins([]);
      })
      .finally(() => setStatsLoading(false));
  }, [municipality]);

  // Redirect if not a community watcher
  useEffect(() => {
    if (!authLoading && (!user || !isCommunityWatcher)) {
      router.replace("/");
    }
  }, [authLoading, user, isCommunityWatcher, router]);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchPlaces(value.trim());
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, []);

  const handleSelectMunicipality = useCallback(
    async (place: Place) => {
      setQuery(place.name);
      setMunicipality(place.name);
      setSuggestions([]);

      // Persist to user metadata
      await supabase.auth.updateUser({
        data: { dashboard_municipality: place.name },
      });
    },
    []
  );

  const recentPins = useMemo(() => pins.slice(0, 8), [pins]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f5c542] border-t-transparent" />
      </div>
    );
  }

  if (!user || !isCommunityWatcher) return null;

  const bgPrimary = isDark ? "bg-[#0a0a0a]" : "bg-[#f5f5f5]";
  const bgCard = isDark ? "bg-[#141414]" : "bg-white";
  const borderColor = isDark ? "border-neutral-800" : "border-neutral-200";
  const textPrimary = isDark ? "text-white" : "text-neutral-900";
  const textSecondary = isDark ? "text-neutral-400" : "text-neutral-500";
  const textMuted = isDark ? "text-neutral-600" : "text-neutral-400";

  return (
    <div className={`min-h-screen ${bgPrimary}`}>
      {/* Header */}
      <header
        className={`sticky top-0 z-50 border-b backdrop-blur-xl ${borderColor} ${
          isDark ? "bg-[#0a0a0a]/90" : "bg-[#f5f5f5]/90"
        }`}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                isDark
                  ? "bg-neutral-800 text-neutral-400 hover:text-white"
                  : "bg-neutral-100 text-neutral-500 hover:text-neutral-800"
              }`}
            >
              <FaArrowLeft size={12} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <FaShieldAlt
                  size={12}
                  className={isDark ? "text-[#f5c542]" : "text-[#b8860b]"}
                />
                <h1 className={`text-sm font-bold ${textPrimary}`}>
                  Community Watcher
                </h1>
              </div>
              <p className={`text-[10px] ${textMuted}`}>
                {user.email}
              </p>
            </div>
          </div>
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
              isDark
                ? "bg-neutral-800 text-neutral-400 hover:text-[#f5c542]"
                : "bg-neutral-100 text-neutral-500 hover:text-[#b8860b]"
            }`}
          >
            {isDark ? <FaSun size={13} /> : <FaMoon size={13} />}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {/* Municipality Selector */}
        <div className="mb-6">
          <label
            className={`mb-2 block text-[10px] font-semibold uppercase tracking-widest ${textMuted}`}
          >
            Your Jurisdiction
          </label>
          <div className="relative">
            <FaSearch
              size={13}
              className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                isDark ? "text-neutral-500" : "text-neutral-400"
              }`}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search your city or municipality..."
              className={`w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm outline-none transition-colors ${
                isDark
                  ? "border-neutral-700 bg-neutral-800 text-white placeholder-neutral-500 focus:border-[#f5c542]/50"
                  : "border-neutral-300 bg-white text-neutral-900 placeholder-neutral-400 focus:border-[#b8860b]/50"
              }`}
            />
          </div>

          {/* Search suggestions */}
          {suggestions.length > 0 && (
            <div
              className={`mt-2 overflow-hidden rounded-xl border ${borderColor} ${bgCard}`}
            >
              {suggestions.map((place, i) => (
                <button
                  key={`${place.name}-${i}`}
                  onClick={() => handleSelectMunicipality(place)}
                  className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left text-sm transition-colors ${
                    isDark
                      ? "text-neutral-300 hover:bg-neutral-800"
                      : "text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  <FaMapMarkerAlt
                    size={12}
                    className={`mt-0.5 shrink-0 ${isDark ? "text-neutral-500" : "text-neutral-400"}`}
                  />
                  <div className="min-w-0">
                    <p className={`font-medium truncate ${textPrimary}`}>
                      {place.name}
                    </p>
                    <p className={`text-xs truncate ${textMuted}`}>
                      {place.displayName}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {searching && (
            <p className={`mt-2 text-xs ${textMuted}`}>Searching...</p>
          )}
        </div>

        {/* No municipality selected */}
        {!municipality && !statsLoading && (
          <div
            className={`rounded-2xl border p-8 text-center ${borderColor} ${bgCard}`}
          >
            <FaMapMarkerAlt size={24} className={`mx-auto mb-3 ${textMuted}`} />
            <p className={`text-sm font-medium ${textPrimary}`}>
              Select your municipality
            </p>
            <p className={`mt-1 text-xs ${textMuted}`}>
              Search and select the city or municipality you want to monitor.
            </p>
          </div>
        )}

        {/* Loading */}
        {statsLoading && (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f5c542] border-t-transparent" />
          </div>
        )}

        {/* Dashboard content */}
        {municipality && stats && !statsLoading && (
          <div className="flex flex-col gap-5">
            {/* Municipality header */}
            <div
              className={`rounded-2xl border p-5 ${borderColor} ${bgCard}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <FaMapMarkerAlt
                  size={12}
                  className={isDark ? "text-[#f5c542]" : "text-[#b8860b]"}
                />
                <span
                  className={`text-[10px] font-semibold uppercase tracking-widest ${textMuted}`}
                >
                  Jurisdiction
                </span>
              </div>
              <h2 className={`text-xl font-bold ${textPrimary}`}>
                {stats.municipality}
              </h2>
            </div>

            {/* Stats overview */}
            {stats.total > 0 ? (
              <div
                className={`rounded-2xl border p-5 ${borderColor} ${bgCard}`}
              >
                <div className="flex items-center gap-6 flex-wrap">
                  <ResolutionRing rate={stats.resolutionRate} />

                  <div className="flex flex-col gap-3 flex-1 min-w-[140px]">
                    {/* Active */}
                    <div
                      className={`rounded-xl px-4 py-3 border ${
                        isDark
                          ? "bg-red-950/30 border-red-900/30"
                          : "bg-red-50 border-red-200/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FaExclamationCircle size={11} className="text-red-400" />
                          <span
                            className={`text-[11px] font-semibold uppercase tracking-wide ${
                              isDark ? "text-red-400/80" : "text-red-500"
                            }`}
                          >
                            Active
                          </span>
                        </div>
                        <span className="text-xl font-bold tabular-nums text-red-400">
                          {stats.active}
                        </span>
                      </div>
                    </div>

                    {/* Resolved */}
                    <div
                      className={`rounded-xl px-4 py-3 border ${
                        isDark
                          ? "bg-green-950/30 border-green-900/30"
                          : "bg-green-50 border-green-200/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FaCheckCircle size={11} className="text-green-400" />
                          <span
                            className={`text-[11px] font-semibold uppercase tracking-wide ${
                              isDark ? "text-green-400/80" : "text-green-600"
                            }`}
                          >
                            Resolved
                          </span>
                        </div>
                        <span className="text-xl font-bold tabular-nums text-green-400">
                          {stats.resolved}
                        </span>
                      </div>
                    </div>

                    {/* Total */}
                    <div
                      className={`flex items-center justify-between rounded-lg px-4 py-2 ${
                        isDark ? "bg-neutral-800/60" : "bg-neutral-100"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <FaChartBar size={10} className={textMuted} />
                        <span className={`text-[11px] font-medium ${textSecondary}`}>
                          Total
                        </span>
                      </div>
                      <span className={`text-sm font-bold tabular-nums ${textPrimary}`}>
                        {stats.total}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`rounded-2xl border p-6 text-center ${borderColor} ${bgCard}`}
              >
                <p className={`text-sm ${textSecondary}`}>
                  No reports yet in this area
                </p>
                <p className={`mt-0.5 text-xs ${textMuted}`}>
                  Be the first to report an issue from the map
                </p>
              </div>
            )}

            {/* Category breakdown */}
            {stats.categoryBreakdown.length > 0 && (
              <div
                className={`rounded-2xl border p-5 ${borderColor} ${bgCard}`}
              >
                <p
                  className={`text-[10px] font-semibold uppercase tracking-widest mb-4 ${textMuted}`}
                >
                  Top Issues
                </p>
                <div className="flex flex-col gap-3">
                  {stats.categoryBreakdown.slice(0, 6).map((item) => {
                    const cat = getCategoryById(item.categoryId);
                    const pct = Math.round((item.count / stats.total) * 100);
                    return (
                      <div key={item.categoryId}>
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <div
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                            style={{
                              backgroundColor: cat
                                ? `${cat.color}18`
                                : "#262626",
                            }}
                          >
                            {cat && (
                              <CategoryIcon
                                iconName={cat.icon}
                                size={12}
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
                            className={`text-[11px] font-semibold tabular-nums shrink-0 ${textSecondary}`}
                          >
                            {item.count}
                          </span>
                          <span
                            className={`text-[10px] tabular-nums shrink-0 ${textMuted}`}
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
                              boxShadow: cat
                                ? `0 0 6px ${cat.color}40`
                                : "none",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent reports */}
            {recentPins.length > 0 && (
              <div
                className={`rounded-2xl border p-5 ${borderColor} ${bgCard}`}
              >
                <p
                  className={`text-[10px] font-semibold uppercase tracking-widest mb-4 ${textMuted}`}
                >
                  Recent Reports
                </p>
                <div className="flex flex-col gap-2">
                  {recentPins.map((pin) => {
                    const cat = getCategoryById(pin.categoryId);
                    return (
                      <div
                        key={pin.id}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                          isDark ? "bg-neutral-800/40" : "bg-neutral-50"
                        }`}
                      >
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                          style={{
                            backgroundColor: cat
                              ? `${cat.color}18`
                              : "#262626",
                          }}
                        >
                          {cat && (
                            <CategoryIcon
                              iconName={cat.icon}
                              size={13}
                              color={cat.color}
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-xs font-medium truncate ${textPrimary}`}
                          >
                            {cat?.label ?? pin.categoryId}
                          </p>
                          <p className={`text-[10px] truncate ${textMuted}`}>
                            {pin.description || "No description"}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                              pin.status === "resolved"
                                ? "bg-green-500/15 text-green-400"
                                : pin.status === "pending_resolved"
                                  ? "bg-amber-500/15 text-amber-400"
                                  : "bg-red-500/15 text-red-400"
                            }`}
                          >
                            {pin.status === "resolved"
                              ? "Resolved"
                              : pin.status === "pending_resolved"
                                ? "Pending"
                                : "Active"}
                          </span>
                          <p className={`mt-0.5 text-[9px] ${textMuted}`}>
                            {formatTimeAgo(pin.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Report Panel */}
            {showReport && (
              <div
                className={`rounded-2xl border p-5 ${borderColor} ${bgCard}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FaFileAlt
                      size={12}
                      className={isDark ? "text-[#f5c542]" : "text-[#b8860b]"}
                    />
                    <p
                      className={`text-[10px] font-semibold uppercase tracking-widest ${textMuted}`}
                    >
                      AI-Generated Report
                    </p>
                  </div>
                  <button
                    onClick={() => setShowReport(false)}
                    className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
                      isDark
                        ? "text-neutral-500 hover:bg-neutral-800 hover:text-white"
                        : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800"
                    }`}
                  >
                    <FaTimes size={10} />
                  </button>
                </div>

                {reportLoading && (
                  <div className="flex flex-col items-center py-8 gap-3">
                    <FaSpinner
                      size={24}
                      className={`animate-spin ${isDark ? "text-[#f5c542]" : "text-[#b8860b]"}`}
                    />
                    <p className={`text-xs ${textSecondary}`}>
                      Analyzing {stats.total} reports for {stats.municipality}...
                    </p>
                  </div>
                )}

                {reportError && (
                  <div
                    className={`rounded-xl px-4 py-3 ${
                      isDark
                        ? "bg-red-950/30 border border-red-900/30"
                        : "bg-red-50 border border-red-200/60"
                    }`}
                  >
                    <p className="text-xs text-red-400">{reportError}</p>
                  </div>
                )}

                {report && !reportLoading && (
                  <div className="flex flex-col gap-5">
                    {/* Overall Assessment */}
                    <div>
                      <p
                        className={`text-[10px] font-semibold uppercase tracking-widest mb-2 ${textMuted}`}
                      >
                        Overall Assessment
                      </p>
                      <p
                        className={`text-xs leading-relaxed whitespace-pre-line ${
                          isDark ? "text-neutral-300" : "text-neutral-700"
                        }`}
                      >
                        {report.overallAssessment}
                      </p>
                    </div>

                    {/* Biggest Problems */}
                    {report.biggestProblems?.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-3">
                          <FaExclamationTriangle size={10} className="text-red-400" />
                          <p
                            className={`text-[10px] font-semibold uppercase tracking-widest ${textMuted}`}
                          >
                            Biggest Problems
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          {report.biggestProblems.map((problem, i) => (
                            <div
                              key={i}
                              className={`rounded-xl px-4 py-3 border ${
                                problem.severity === "critical"
                                  ? isDark
                                    ? "bg-red-950/20 border-red-900/30"
                                    : "bg-red-50 border-red-200/60"
                                  : problem.severity === "warning"
                                    ? isDark
                                      ? "bg-amber-950/20 border-amber-900/30"
                                      : "bg-amber-50 border-amber-200/60"
                                    : isDark
                                      ? "bg-neutral-800/40 border-neutral-700/50"
                                      : "bg-neutral-50 border-neutral-200"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span
                                  className={`text-xs font-semibold ${textPrimary}`}
                                >
                                  {problem.issue}
                                </span>
                                <span
                                  className={`text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                                    problem.severity === "critical"
                                      ? "bg-red-500/15 text-red-400"
                                      : problem.severity === "warning"
                                        ? "bg-amber-500/15 text-amber-400"
                                        : "bg-blue-500/15 text-blue-400"
                                  }`}
                                >
                                  {problem.severity}
                                </span>
                              </div>
                              <p className={`text-[11px] leading-relaxed ${textSecondary}`}>
                                {problem.explanation}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Location Hotspots */}
                    {report.locationHotspots?.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-3">
                          <FaMapMarkerAlt size={10} className="text-amber-400" />
                          <p
                            className={`text-[10px] font-semibold uppercase tracking-widest ${textMuted}`}
                          >
                            Location Hotspots
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          {report.locationHotspots.map((hotspot, i) => (
                            <div
                              key={i}
                              className={`rounded-xl px-4 py-3 ${
                                isDark ? "bg-neutral-800/40" : "bg-neutral-50"
                              }`}
                            >
                              <p
                                className={`text-xs font-semibold mb-0.5 ${textPrimary}`}
                              >
                                {hotspot.area}
                              </p>
                              <p className={`text-[11px] mb-1 ${textSecondary}`}>
                                {hotspot.concern}
                              </p>
                              <p
                                className={`text-[11px] italic ${
                                  isDark ? "text-[#f5c542]/70" : "text-[#b8860b]/70"
                                }`}
                              >
                                {hotspot.recommendation}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Congestion Analysis */}
                    {report.congestionAnalysis && (
                      <div>
                        <p
                          className={`text-[10px] font-semibold uppercase tracking-widest mb-2 ${textMuted}`}
                        >
                          Congestion & Pattern Analysis
                        </p>
                        <p
                          className={`text-xs leading-relaxed ${
                            isDark ? "text-neutral-300" : "text-neutral-700"
                          }`}
                        >
                          {report.congestionAnalysis}
                        </p>
                      </div>
                    )}

                    {/* Resolution Performance */}
                    {report.resolutionPerformance && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <FaCheckCircle size={10} className="text-green-400" />
                          <p
                            className={`text-[10px] font-semibold uppercase tracking-widest ${textMuted}`}
                          >
                            Resolution Performance
                          </p>
                        </div>
                        <p
                          className={`text-xs leading-relaxed ${
                            isDark ? "text-neutral-300" : "text-neutral-700"
                          }`}
                        >
                          {report.resolutionPerformance}
                        </p>
                      </div>
                    )}

                    {/* Recommendations */}
                    {report.recommendations?.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-3">
                          <FaLightbulb size={10} className={isDark ? "text-[#f5c542]" : "text-[#b8860b]"} />
                          <p
                            className={`text-[10px] font-semibold uppercase tracking-widest ${textMuted}`}
                          >
                            Recommendations
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          {report.recommendations.map((rec, i) => (
                            <div
                              key={i}
                              className={`flex gap-3 rounded-xl px-4 py-3 ${
                                isDark ? "bg-neutral-800/40" : "bg-neutral-50"
                              }`}
                            >
                              <span
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                                  isDark
                                    ? "bg-[#f5c542]/15 text-[#f5c542]"
                                    : "bg-[#b8860b]/15 text-[#b8860b]"
                                }`}
                              >
                                {rec.priority}
                              </span>
                              <div>
                                <p
                                  className={`text-xs font-semibold ${textPrimary}`}
                                >
                                  {rec.action}
                                </p>
                                <p className={`text-[11px] mt-0.5 ${textSecondary}`}>
                                  {rec.rationale}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Last activity */}
            {stats.mostRecentReport && (
              <div className={`flex items-center gap-1.5 ${textMuted}`}>
                <FaClock size={10} />
                <span className="text-[11px]">
                  Last report {formatTimeAgo(stats.mostRecentReport)}
                </span>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

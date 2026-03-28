"use client";

import Image from "next/image";
import { useRef, useEffect, useState, useCallback } from "react";
import { useTheme } from "./ThemeContext";
import { useAuth } from "./AuthContext";
import { getMunicipalityStats, type MunicipalityStats } from "../lib/pins";
import {
  FaSun,
  FaMoon,
  FaSearch,
  FaUser,
  FaSignOutAlt,
  FaTachometerAlt,
  FaTimes,
  FaMapMarkerAlt,
  FaSpinner,
  FaCheck,
  FaExclamationCircle,
} from "react-icons/fa";

/** Search Philippine cities/municipalities via Nominatim forward geocoding */
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
    { headers: { "User-Agent": "Bayanihan-App/1.0" } },
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
      },
    );
}

interface NavbarProps {
  onToggleTheme: () => void;
  showSearch: boolean;
  onToggleSearch: () => void;
  onCloseSearch: () => void;
  onOpenAuth: () => void;
  onNavigateDashboard: () => void;
  showUserMenu: boolean;
  onToggleUserMenu: () => void;
  onCloseUserMenu: () => void;
  onSelectMunicipality: (name: string, lat: number, lng: number) => void;
}

export default function Navbar({
  onToggleTheme,
  showSearch,
  onToggleSearch,
  onCloseSearch,
  onOpenAuth,
  onNavigateDashboard,
  showUserMenu,
  onToggleUserMenu,
  onCloseUserMenu,
  onSelectMunicipality,
}: NavbarProps) {
  const theme = useTheme();
  const { user, isCommunityWatcher, signOut } = useAuth();
  const isDark = theme === "dark";
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [selected, setSelected] = useState<Place | null>(null);
  const [stats, setStats] = useState<MunicipalityStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Focus input when search opens
  useEffect(() => {
    if (showSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setSuggestions([]);
      setSelected(null);
      setStats(null);
    }
  }, [showSearch]);

  // Close user menu on outside click
  useEffect(() => {
    if (!showUserMenu) return;
    const handler = (e: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        onCloseUserMenu();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showUserMenu, onCloseUserMenu]);

  // Close search on outside click
  useEffect(() => {
    if (!showSearch) return;
    const handler = (e: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(e.target as Node)
      ) {
        onCloseSearch();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSearch, onCloseSearch]);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    setSelected(null);
    setStats(null);

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

  const handleSelect = useCallback(
    async (place: Place) => {
      setQuery(place.name);
      setSelected(place);
      setSuggestions([]);
      onSelectMunicipality(place.name, place.lat, place.lng);

      setLoading(true);
      try {
        const result = await getMunicipalityStats(place.name);
        setStats(result);
      } catch {
        setStats(null);
      } finally {
        setLoading(false);
      }
    },
    [onSelectMunicipality],
  );

  const iconBtnCls = `flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
    isDark
      ? "text-neutral-400 hover:text-[#f5c542] hover:bg-white/[0.06]"
      : "text-neutral-500 hover:text-[#b8860b] hover:bg-black/[0.06]"
  }`;

  return (
    <nav
      className="fixed top-0 right-0 left-0 z-[1000] flex h-12 items-center justify-between px-5 sm:px-6"
      style={{
        background: isDark
          ? "rgba(10, 10, 10, 0.55)"
          : "rgba(255, 255, 255, 0.55)",
        backdropFilter: "blur(16px) saturate(180%)",
        WebkitBackdropFilter: "blur(16px) saturate(180%)",
        borderBottom: isDark
          ? "1px solid rgba(255, 255, 255, 0.06)"
          : "1px solid rgba(0, 0, 0, 0.08)",
      }}
    >
      {/* Left: Logo + App name */}
      <div className="flex items-center gap-2.5">
        <Image
          src="/Dagyaw-Logo.svg"
          alt="Dagyaw"
          width={30}
          height={30}
          className="rounded-lg"
        />
        <span
          className={`text-sm font-semibold tracking-tight ${
            isDark ? "text-neutral-100" : "text-neutral-800"
          }`}
        >
          Dagyaw
        </span>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-1">
        {/* Search */}
        <div className="relative" ref={searchRef}>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onToggleSearch}
              className={`${iconBtnCls} ${
                showSearch
                  ? isDark
                    ? "text-[#f5c542] bg-white/[0.08] ring-1 ring-[#f5c542]/30 shadow-[0_0_12px_-3px_rgba(245,197,66,0.3)]"
                    : "text-[#b8860b] bg-black/[0.08] ring-1 ring-[#b8860b]/30 shadow-[0_0_12px_-3px_rgba(184,134,11,0.2)]"
                  : ""
              }`}
              title="Search municipality"
            >
              {searching ? (
                <FaSpinner size={13} className="animate-spin text-[#f5c542]" />
              ) : (
                <FaSearch size={13} className={showSearch ? "animate-pulse-soft" : ""} />
              )}
            </button>

            {/* Inline search input */}
            {showSearch && (
              <div className="relative search-input-animate">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="Search city or municipality..."
                  className={`w-48 rounded-lg border py-1.5 pl-3 pr-7 text-xs outline-none transition-all sm:w-56 ${
                    isDark
                      ? "border-white/10 bg-white/5 text-white placeholder-neutral-500 focus:border-[#f5c542]/40 focus:ring-1 focus:ring-[#f5c542]/20"
                      : "border-black/10 bg-black/5 text-neutral-900 placeholder-neutral-400 focus:border-[#b8860b]/40 focus:ring-1 focus:ring-[#b8860b]/20"
                  }`}
                />
                {query ? (
                  <button
                    onClick={() => {
                      setQuery("");
                      setSuggestions([]);
                      setSelected(null);
                      setStats(null);
                      searchInputRef.current?.focus();
                    }}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 transition-colors ${
                      isDark ? "text-neutral-500 hover:text-neutral-300" : "text-neutral-400 hover:text-neutral-600"
                    }`}
                  >
                    <FaTimes size={10} />
                  </button>
                ) : null}
              </div>
            )}
          </div>

          {/* Search results dropdown */}
          {showSearch && (suggestions.length > 0 || searching || loading || selected || (query.length >= 2 && !searching && suggestions.length === 0)) && (
            <div
              className={`absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-xl border shadow-2xl dropdown-animate ${
                isDark
                  ? "border-white/10 bg-[#141414]/98 backdrop-blur-2xl"
                  : "border-black/10 bg-white/98 backdrop-blur-2xl"
              }`}
            >
              {/* Suggestions */}
              {suggestions.length > 0 && !selected && (
                <div
                  style={{ maxHeight: "280px", overflowY: "auto" }}
                  className="divide-y divide-white/5"
                >
                  {suggestions.map((place, i) => (
                    <button
                      key={`${place.name}-${i}`}
                      onClick={() => handleSelect(place)}
                      className={`group flex w-full items-start gap-3 px-4 py-3 text-left transition-all ${
                        isDark
                          ? "text-neutral-300 hover:bg-white/[0.04]"
                          : "text-neutral-700 hover:bg-black/[0.04]"
                      }`}
                    >
                      <FaMapMarkerAlt
                        size={12}
                        className={`mt-1 shrink-0 transition-transform group-hover:scale-110 ${
                          isDark ? "text-neutral-500 group-hover:text-[#f5c542]" : "text-neutral-400 group-hover:text-[#b8860b]"
                        }`}
                      />
                      <div className="min-w-0">
                        <p
                          className={`text-xs font-semibold truncate ${
                            isDark ? "text-white group-hover:text-[#f5c542]" : "text-neutral-900 group-hover:text-[#b8860b]"
                          }`}
                        >
                          {place.name}
                        </p>
                        <p
                          className={`text-[10px] truncate leading-relaxed ${
                            isDark ? "text-neutral-500" : "text-neutral-400"
                          }`}
                        >
                          {place.displayName}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Searching indicator */}
              {searching && suggestions.length === 0 && (
                <div className={`flex items-center justify-center gap-2 px-4 py-6 text-xs ${isDark ? "text-neutral-500" : "text-neutral-400"}`}>
                  <FaSpinner className="animate-spin-slow" />
                  Searching for places...
                </div>
              )}

              {/* Loading stats */}
              {loading && (
                <div className={`flex items-center justify-center gap-2 px-4 py-6 text-xs ${isDark ? "text-neutral-500" : "text-neutral-400"}`}>
                  <FaSpinner className="animate-spin-slow" />
                  Fetching municipality data...
                </div>
              )}

              {/* Stats card */}
              {stats && selected && (
                <div className="p-4 stat-reveal">
                  <div className="mb-3 flex items-center justify-between">
                    <h3
                      className={`text-[13px] font-bold tracking-tight ${
                        isDark ? "text-white" : "text-neutral-900"
                      }`}
                    >
                      {stats.municipality}
                    </h3>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                      isDark ? "bg-[#f5c542]/10 text-[#f5c542]" : "bg-[#b8860b]/10 text-[#b8860b]"
                    }`}>
                      Live Stats
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      className={`group relative overflow-hidden rounded-xl p-3 transition-all ${
                        isDark
                          ? "bg-red-500/5 border border-red-500/10 hover:border-red-500/30"
                          : "bg-red-50 border border-red-100 hover:border-red-200"
                      }`}
                    >
                      <div className="relative z-10 text-center">
                        <p className="text-xl font-black text-red-500">{stats.active}</p>
                        <p className={`text-[9px] font-bold uppercase tracking-wide ${isDark ? "text-red-400/60" : "text-red-600/70"}`}>Active</p>
                      </div>
                      <div className="absolute -right-2 -bottom-2 opacity-[0.05] transition-all group-hover:scale-125">
                        <FaExclamationCircle size={40} className="text-red-500" />
                      </div>
                    </div>
                    
                    <div
                      className={`group relative overflow-hidden rounded-xl p-3 transition-all ${
                        isDark
                          ? "bg-green-500/5 border border-green-500/10 hover:border-green-500/30"
                          : "bg-green-50 border border-green-100 hover:border-green-200"
                      }`}
                    >
                      <div className="relative z-10 text-center">
                        <p className="text-xl font-black text-green-500">{stats.resolved}</p>
                        <p className={`text-[9px] font-bold uppercase tracking-wide ${isDark ? "text-green-400/60" : "text-green-600/70"}`}>Resolved</p>
                      </div>
                      <div className="absolute -right-2 -bottom-2 opacity-[0.05] transition-all group-hover:scale-125">
                        <FaCheck size={40} className="text-green-500" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[10px] font-medium ${isDark ? "text-neutral-500" : "text-neutral-400"}`}>
                        Resolution Rate
                      </span>
                      <span className={`text-xs font-bold ${isDark ? "text-white" : "text-neutral-900"}`}>
                        {stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%
                      </span>
                    </div>
                    
                    {stats.total > 0 ? (
                      <div className={`h-2 w-full overflow-hidden rounded-full ${isDark ? "bg-neutral-800" : "bg-neutral-200 shadow-inner"}`}>
                        <div className="flex h-full transition-all duration-1000 ease-out">
                          <div className="h-full bg-gradient-to-r from-green-600 to-green-400 shadow-[0_0_8px_rgba(34,197,94,0.4)]" style={{ width: `${(stats.resolved / stats.total) * 100}%` }} />
                          <div className="h-full bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_8px_rgba(239,68,68,0.4)]" style={{ width: `${(stats.active / stats.total) * 100}%` }} />
                        </div>
                      </div>
                    ) : (
                      <div className={`flex h-8 items-center justify-center rounded-lg border border-dashed ${
                        isDark ? "border-white/5 bg-white/2" : "border-black/5 bg-black/2"
                      }`}>
                        <p className={`text-[10px] italic ${isDark ? "text-neutral-600" : "text-neutral-400"}`}>
                          No reports recorded yet
                        </p>
                      </div>
                    )}
                    
                    <div className="mt-3 flex items-center justify-center gap-1.5">
                      <div className={`h-1 w-1 rounded-full ${isDark ? "bg-neutral-700" : "bg-neutral-300"}`} />
                      <span className={`text-[9px] font-medium ${isDark ? "text-neutral-500" : "text-neutral-400"}`}>
                        Total: {stats.total} reports
                      </span>
                      <div className={`h-1 w-1 rounded-full ${isDark ? "bg-neutral-700" : "bg-neutral-300"}`} />
                    </div>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {query.length >= 2 && !searching && !loading && !selected && suggestions.length === 0 && (
                <div className={`px-4 py-8 text-center ${isDark ? "text-neutral-500" : "text-neutral-400"}`}>
                  <p className="text-xs font-medium">No results found for &ldquo;{query}&rdquo;</p>
                  <p className="mt-1 text-[10px] opacity-70">Try a different city or municipality name</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          className={iconBtnCls}
          title={isDark ? "Light mode" : "Dark mode"}
        >
          {isDark ? <FaSun size={13} /> : <FaMoon size={13} />}
        </button>

        {/* Dashboard (watchers only) */}
        {isCommunityWatcher && user && (
          <button
            onClick={onNavigateDashboard}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
              isDark
                ? "text-[#f5c542]/80 hover:text-[#f5c542] hover:bg-[#f5c542]/10"
                : "text-[#b8860b]/80 hover:text-[#b8860b] hover:bg-[#b8860b]/10"
            }`}
            title="Dashboard"
          >
            <FaTachometerAlt size={13} />
          </button>
        )}

        {/* Divider */}
        <div
          className={`mx-1 h-5 w-px ${isDark ? "bg-white/10" : "bg-black/10"}`}
        />

        {/* User */}
        <div className="relative" ref={userMenuRef}>
          {user ? (
            <>
              <button
                onClick={onToggleUserMenu}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                  isDark
                    ? "bg-[#f5c542]/15 text-[#f5c542] hover:bg-[#f5c542]/25"
                    : "bg-[#b8860b]/15 text-[#b8860b] hover:bg-[#b8860b]/25"
                }`}
                title={user.email ?? "Account"}
              >
                <span className="text-[11px] font-bold uppercase">
                  {user.email?.[0] ?? "U"}
                </span>
              </button>
              {showUserMenu && (
                <div
                  className={`absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border shadow-xl ${
                    isDark
                      ? "border-white/10 bg-[#141414]/90 backdrop-blur-xl"
                      : "border-black/10 bg-white/90 backdrop-blur-xl"
                  }`}
                >
                  <div
                    className={`truncate px-3 py-2 text-[10px] ${
                      isDark ? "text-neutral-500" : "text-neutral-400"
                    }`}
                  >
                    {user.email}
                  </div>
                  <div
                    className={`border-t ${
                      isDark ? "border-white/5" : "border-black/5"
                    }`}
                  />
                  <button
                    onClick={() => {
                      onCloseUserMenu();
                      signOut();
                    }}
                    className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs transition-colors ${
                      isDark
                        ? "text-neutral-300 hover:bg-white/5"
                        : "text-neutral-700 hover:bg-black/5"
                    }`}
                  >
                    <FaSignOutAlt size={11} className="text-red-400" />
                    Sign Out
                  </button>
                </div>
              )}
            </>
          ) : (
            <button onClick={onOpenAuth} className={iconBtnCls} title="Sign In">
              <FaUser size={13} />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

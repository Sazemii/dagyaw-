"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { FaTimes, FaSearch, FaMapMarkerAlt } from "react-icons/fa";
import { useTheme } from "./ThemeContext";
import { getMunicipalityStats, type MunicipalityStats } from "../lib/pins";

interface Place {
  name: string;
  displayName: string;
  lat: number;
  lng: number;
}

interface MunicipalitySearchProps {
  onClose: () => void;
  onSelectMunicipality: (name: string, lat: number, lng: number) => void;
}

/** Search Philippine cities/municipalities via Nominatim forward geocoding */
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
    .map((item: { display_name: string; lat: string; lon: string; address?: Record<string, string> }) => {
      const addr = item.address || {};
      const name = addr.city || addr.municipality || addr.town || item.display_name.split(",")[0];
      return {
        name,
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      };
    });
}

export default function MunicipalitySearch({
  onClose,
  onSelectMunicipality,
}: MunicipalitySearchProps) {
  const theme = useTheme();
  const isDark = theme === "dark";
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [selected, setSelected] = useState<Place | null>(null);
  const [stats, setStats] = useState<MunicipalityStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced Nominatim search
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

  // Select a place → fly to it + load stats
  const handleSelect = useCallback(
    async (place: Place) => {
      setQuery(place.name);
      setSelected(place);
      setSuggestions([]);

      // Fly to the municipality immediately
      onSelectMunicipality(place.name, place.lat, place.lng);

      // Load stats from pins
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
    [onSelectMunicipality]
  );

  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center">
      <div
        className={`fixed inset-0 ${isDark ? "bg-black/60" : "bg-black/30"}`}
        onClick={onClose}
      />

      <div
        className={`relative z-10 w-full max-w-lg rounded-t-2xl border animate-slide-up ${
          isDark
            ? "border-neutral-800 bg-[#0f0f0f]"
            : "border-neutral-200 bg-white"
        }`}
        style={{
          boxShadow: isDark
            ? "0 -4px 30px rgba(0,0,0,0.5)"
            : "0 -4px 30px rgba(0,0,0,0.1)",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        {/* Drag handle */}
        <div
          className={`mx-auto mt-3 mb-3 h-1 w-10 rounded-full ${
            isDark ? "bg-neutral-700" : "bg-neutral-300"
          }`}
        />

        <div className="px-4 pb-6">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <h2
              className={`text-base font-semibold ${
                isDark ? "text-white" : "text-neutral-900"
              }`}
            >
              Search City / Municipality
            </h2>
            <button
              onClick={onClose}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                isDark
                  ? "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white"
                  : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-800"
              }`}
            >
              <FaTimes size={14} />
            </button>
          </div>

          {/* Search input */}
          <div className="relative mb-4">
            <FaSearch
              size={13}
              className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                isDark ? "text-neutral-500" : "text-neutral-400"
              }`}
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search any city or municipality..."
              className={`w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm outline-none ${
                isDark
                  ? "border-neutral-700 bg-neutral-800 text-white placeholder-neutral-500"
                  : "border-neutral-300 bg-neutral-50 text-neutral-900 placeholder-neutral-400"
              }`}
            />
          </div>

          {/* Suggestions dropdown */}
          {suggestions.length > 0 && !selected && (
            <div
              className={`mb-4 rounded-xl border overflow-hidden ${
                isDark ? "border-neutral-800" : "border-neutral-200"
              }`}
            >
              {suggestions.map((place, i) => (
                <button
                  key={`${place.name}-${i}`}
                  onClick={() => handleSelect(place)}
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
                    <p className={`font-medium truncate ${isDark ? "text-white" : "text-neutral-900"}`}>
                      {place.name}
                    </p>
                    <p
                      className={`text-xs truncate ${
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
          {searching && (
            <p
              className={`mb-4 text-center text-xs ${
                isDark ? "text-neutral-500" : "text-neutral-400"
              }`}
            >
              Searching...
            </p>
          )}

          {/* Loading stats */}
          {loading && (
            <p
              className={`mb-4 text-center text-xs ${
                isDark ? "text-neutral-500" : "text-neutral-400"
              }`}
            >
              Loading statistics...
            </p>
          )}

          {/* Stats card */}
          {stats && selected && (
            <div
              className={`rounded-xl border p-4 ${
                isDark ? "border-neutral-800 bg-neutral-900/50" : "border-neutral-200 bg-neutral-50"
              }`}
            >
              <h3
                className={`mb-3 text-sm font-semibold ${
                  isDark ? "text-white" : "text-neutral-900"
                }`}
              >
                {stats.municipality}
              </h3>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Active */}
                <div
                  className={`rounded-lg p-3 text-center ${
                    isDark ? "bg-red-950/40 border border-red-900/30" : "bg-red-50 border border-red-100"
                  }`}
                >
                  <p className="text-2xl font-bold text-red-500">{stats.active}</p>
                  <p
                    className={`mt-0.5 text-xs ${
                      isDark ? "text-red-400/70" : "text-red-600"
                    }`}
                  >
                    Active
                  </p>
                </div>

                {/* Resolved */}
                <div
                  className={`rounded-lg p-3 text-center ${
                    isDark ? "bg-green-950/40 border border-green-900/30" : "bg-green-50 border border-green-100"
                  }`}
                >
                  <p className="text-2xl font-bold text-green-500">{stats.resolved}</p>
                  <p
                    className={`mt-0.5 text-xs ${
                      isDark ? "text-green-400/70" : "text-green-600"
                    }`}
                  >
                    Resolved
                  </p>
                </div>
              </div>

              {/* Total */}
              <div className="mt-3 flex items-center justify-between">
                <span
                  className={`text-xs ${
                    isDark ? "text-neutral-500" : "text-neutral-400"
                  }`}
                >
                  Total reports
                </span>
                <span
                  className={`text-sm font-semibold ${
                    isDark ? "text-white" : "text-neutral-900"
                  }`}
                >
                  {stats.total}
                </span>
              </div>

              {/* Progress bar */}
              {stats.total > 0 && (
                <div
                  className={`mt-2 h-2 w-full overflow-hidden rounded-full ${
                    isDark ? "bg-neutral-800" : "bg-neutral-200"
                  }`}
                >
                  <div className="flex h-full" style={{ width: "100%" }}>
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${(stats.resolved / stats.total) * 100}%` }}
                    />
                    <div
                      className="h-full bg-red-500 transition-all"
                      style={{ width: `${(stats.active / stats.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {stats.total === 0 && (
                <p
                  className={`mt-2 text-center text-xs ${
                    isDark ? "text-neutral-600" : "text-neutral-400"
                  }`}
                >
                  No reports yet in this area
                </p>
              )}
            </div>
          )}

          {/* Empty state */}
          {query.length >= 2 && !searching && !loading && !selected && suggestions.length === 0 && (
            <p
              className={`text-center text-sm ${
                isDark ? "text-neutral-500" : "text-neutral-400"
              }`}
            >
              No results for &ldquo;{query}&rdquo;
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

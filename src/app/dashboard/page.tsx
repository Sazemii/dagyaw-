"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthContext";
import { supabase } from "../../lib/supabase";
import {
  getCityDetailedStats,
  fetchPinsByMunicipality,
  resolvePin,
  type CityDetailedStats,
} from "../../lib/pins";
import type { Pin } from "../../components/MapView";
import { getCategoryById } from "../../components/categories";
import CategoryIcon from "../../components/CategoryIcon";
import PinDetailModal from "../../components/PinDetailModal";
import { FaSearch, FaBell, FaCircle, FaLanguage, FaExpand, FaTimes } from "react-icons/fa";
import { HiSparkles } from "react-icons/hi2";
import type { MunicipalityReport } from "../../lib/insights/types";
import Map, {
  Marker,
  NavigationControl,
  Source,
  Layer,
  type MapRef,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

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

/* ── Stat Card ── */
function StatCard({
  label,
  value,
  subtitle,
  color,
}: {
  label: string;
  value: string | number;
  subtitle: string;
  color: string;
}) {
  return (
    <div
      className="bg-[#141414] rounded-lg overflow-hidden pl-5 pr-5 py-4 flex flex-col gap-0.5 border border-[#2a2d30]"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[1px] text-[#a6acb3]">
        {label}
      </span>
      <span
        className="text-[20px] font-semibold leading-7"
        style={{ color, fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </span>
      <span className="text-[10px] text-[#a6acb3]/60">{subtitle}</span>
    </div>
  );
}

/* ── Category Progress Bar ── */
function CategoryBar({
  label,
  value,
  color,
  percent,
}: {
  label: string;
  value: string;
  color: string;
  percent: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between min-w-0">
        <span
          className="text-[10px] font-semibold uppercase tracking-[-0.3px] truncate"
          style={{ color }}
        >
          {label}
        </span>
        <span className="text-[10px] text-[#e0e6ed]/80 shrink-0 ml-2 tabular-nums">
          {value}
        </span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, backgroundColor: color, opacity: 0.85 }}
        />
      </div>
    </div>
  );
}

const CARTO_DARK_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

/* ── Dashboard Map ── */
function DashboardMap({
  pins,
  center,
  onPinClick,
}: {
  pins: Pin[];
  center: { lat: number; lng: number } | null;
  onPinClick?: (pin: Pin) => void;
}) {
  const mapRef = useRef<MapRef>(null);
  const boundaryFetched = useRef<string | null>(null);
  const [boundaryGeoJSON, setBoundaryGeoJSON] =
    useState<GeoJSON.Feature | null>(null);

  useEffect(() => {
    if (center && mapRef.current) {
      mapRef.current.flyTo({
        center: [center.lng, center.lat],
        zoom: 13,
        duration: 1500,
      });
    }
  }, [center]);

  // Fetch municipality boundary
  useEffect(() => {
    if (!center) return;
    const key = `${center.lat},${center.lng}`;
    if (boundaryFetched.current === key) return;
    boundaryFetched.current = key;

    (async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${center.lat}&lon=${center.lng}&format=json&polygon_geojson=1&zoom=10`,
          { headers: { "User-Agent": "Bayanihan-App/1.0" } },
        );
        const data = await res.json();
        if (data?.geojson) {
          setBoundaryGeoJSON({
            type: "Feature",
            properties: {},
            geometry: data.geojson,
          });
        }
      } catch {
        // silently fail
      }
    })();
  }, [center]);

  const handleStyleLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const style = map.getStyle();
    if (!style?.layers) return;

    for (const layer of style.layers) {
      const id = layer.id.toLowerCase();
      if (
        id.includes("road") ||
        id.includes("bridge") ||
        id.includes("tunnel") ||
        id.includes("highway") ||
        id.includes("street") ||
        id.includes("path") ||
        id.includes("link")
      ) {
        if (layer.type === "line") {
          map.setPaintProperty(layer.id, "line-color", "#999999");
          map.setPaintProperty(layer.id, "line-opacity", 0.45);
        }
      }
      if (id.includes("building") && layer.type === "fill") {
        map.setPaintProperty(layer.id, "fill-color", "#ffffff");
        map.setPaintProperty(layer.id, "fill-opacity", 0.04);
      }
      if (
        id.includes("water") &&
        !id.includes("name") &&
        layer.type === "fill"
      ) {
        map.setPaintProperty(layer.id, "fill-color", "#0c1a2e");
        map.setPaintProperty(layer.id, "fill-opacity", 0.8);
      }
      if (
        (id.includes("label") || id.includes("name") || id.includes("place")) &&
        layer.type === "symbol"
      ) {
        map.setPaintProperty(layer.id, "text-color", "#888888");
        map.setPaintProperty(layer.id, "text-halo-color", "#000000");
        map.setPaintProperty(layer.id, "text-halo-width", 1.5);
      }
      if (
        (id.includes("landuse") ||
          id.includes("park") ||
          id.includes("green")) &&
        layer.type === "fill"
      ) {
        map.setPaintProperty(layer.id, "fill-color", "#0a1a0a");
        map.setPaintProperty(layer.id, "fill-opacity", 0.5);
      }
    }
  }, []);

  return (
    <Map
      ref={mapRef}
      initialViewState={{
        longitude: center?.lng ?? 121.0437,
        latitude: center?.lat ?? 14.676,
        zoom: center ? 13 : 6,
      }}
      maxBounds={[114.0, 4.5, 127.0, 21.5]}
      style={{ width: "100%", height: "100%" }}
      mapStyle={CARTO_DARK_STYLE}
      cursor="grab"
      onLoad={handleStyleLoad}
      attributionControl={{}}
    >
      <NavigationControl position="bottom-right" showCompass={false} />

      {/* Municipality boundary — subtle fill only, no border lines */}
      {boundaryGeoJSON && (
        <Source id="dash-boundary" type="geojson" data={boundaryGeoJSON}>
          <Layer
            id="dash-boundary-fill"
            type="fill"
            paint={{ "fill-color": "#f5c542", "fill-opacity": 0.04 }}
          />
        </Source>
      )}

      {/* Pin markers — same style as main MapView */}
      {pins.map((pin) => {
        const category = getCategoryById(pin.categoryId);
        if (!category) return null;
        const isResolved = pin.status === "resolved";
        const isPending = pin.status === "pending_resolved";
        const strokeColor = isResolved
          ? "#22c55e"
          : isPending
            ? "#f59e0b"
            : category.color;
        const circleFill = isResolved
          ? "#d1fae5"
          : isPending
            ? "#1a1500"
            : "#1a1a1a";

        return (
          <Marker
            key={pin.id}
            longitude={pin.lng}
            latitude={pin.lat}
            anchor="bottom"
          >
            <div
              className="pin-marker cursor-pointer"
              style={{ opacity: isResolved ? 0.5 : 1 }}
              onClick={(e) => {
                e.stopPropagation();
                onPinClick?.(pin);
              }}
            >
              <svg
                width="40"
                height="52"
                viewBox="0 0 40 52"
                fill="none"
                className="pin-drop"
              >
                {isPending && (
                  <circle
                    cx="20"
                    cy="19"
                    r="17"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2"
                    className="pin-pending-pulse"
                  />
                )}
                <polygon points="14,34 26,34 20,50" fill={strokeColor} />
                <circle
                  cx="20"
                  cy="19"
                  r="17"
                  fill={circleFill}
                  stroke={strokeColor}
                  strokeWidth="2.5"
                />
                <foreignObject x="8" y="7" width="24" height="24">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "100%",
                      height: "100%",
                    }}
                  >
                    <CategoryIcon
                      iconName={category.icon}
                      color={
                        isResolved
                          ? "#22c55e"
                          : isPending
                            ? "#f59e0b"
                            : category.color
                      }
                      size={16}
                    />
                  </div>
                </foreignObject>
              </svg>
            </div>
          </Marker>
        );
      })}
    </Map>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, isCommunityWatcher } = useAuth();

  // Municipality search
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Selected municipality
  const [municipality, setMunicipality] = useState<string | null>(null);
  const [municipalityCoords, setMunicipalityCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [stats, setStats] = useState<CityDetailedStats | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  // Pin detail modal
  const [viewingPin, setViewingPin] = useState<Pin | null>(null);

  // Notifications panel
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Report generation
  const [report, setReport] = useState<MunicipalityReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [translatedReport, setTranslatedReport] =
    useState<MunicipalityReport | null>(null);
  const [translatingReport, setTranslatingReport] = useState(false);
  const [insightsExpanded, setInsightsExpanded] = useState(false);

  const handleTranslateReport = async () => {
    if (translatedReport) {
      setTranslatedReport(null);
      return;
    }
    if (!report) return;
    setTranslatingReport(true);
    try {
      const textToTranslate = JSON.stringify({
        overallAssessment: report.overallAssessment,
        congestionAnalysis: report.congestionAnalysis,
        resolutionPerformance: report.resolutionPerformance,
        biggestProblems: report.biggestProblems?.map((p) => ({
          issue: p.issue,
          explanation: p.explanation,
        })),
        locationHotspots: report.locationHotspots?.map((h) => ({
          area: h.area,
          concern: h.concern,
          recommendation: h.recommendation,
        })),
        recommendations: report.recommendations?.map((r) => ({
          action: r.action,
          rationale: r.rationale,
        })),
      });
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToTranslate }),
      });
      const data = await res.json();
      if (data.translated) {
        const parsed = JSON.parse(data.translated);
        setTranslatedReport({
          overallAssessment:
            parsed.overallAssessment ?? report.overallAssessment,
          congestionAnalysis:
            parsed.congestionAnalysis ?? report.congestionAnalysis,
          resolutionPerformance:
            parsed.resolutionPerformance ?? report.resolutionPerformance,
          biggestProblems: report.biggestProblems?.map((p, i) => ({
            ...p,
            issue: parsed.biggestProblems?.[i]?.issue ?? p.issue,
            explanation:
              parsed.biggestProblems?.[i]?.explanation ?? p.explanation,
          })),
          locationHotspots: report.locationHotspots?.map((h, i) => ({
            ...h,
            area: parsed.locationHotspots?.[i]?.area ?? h.area,
            concern: parsed.locationHotspots?.[i]?.concern ?? h.concern,
            recommendation:
              parsed.locationHotspots?.[i]?.recommendation ?? h.recommendation,
          })),
          recommendations: report.recommendations?.map((r, i) => ({
            ...r,
            action: parsed.recommendations?.[i]?.action ?? r.action,
            rationale: parsed.recommendations?.[i]?.rationale ?? r.rationale,
          })),
        });
      }
    } catch {
      // keep original on failure
    } finally {
      setTranslatingReport(false);
    }
  };

  // Load saved municipality from user metadata
  useEffect(() => {
    if (user?.user_metadata?.dashboard_municipality) {
      const saved = user.user_metadata.dashboard_municipality as string;
      setMunicipality(saved);
      setQuery(saved);

      // Restore saved coords or geocode the municipality
      const savedLat = user.user_metadata.dashboard_municipality_lat as
        | number
        | undefined;
      const savedLng = user.user_metadata.dashboard_municipality_lng as
        | number
        | undefined;
      if (savedLat && savedLng) {
        setMunicipalityCoords({ lat: savedLat, lng: savedLng });
      } else {
        // Geocode from name
        searchPlaces(saved).then((results) => {
          if (results.length > 0) {
            setMunicipalityCoords({ lat: results[0].lat, lng: results[0].lng });
          }
        });
      }
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

        if (statsData.total > 0) {
          setReportLoading(true);
          setReport(null);
          setReportError(null);
          setTranslatedReport(null);

          fetch("/api/report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ municipality }),
          })
            .then((res) => {
              if (!res.ok) {
                return res.json().then((d) => {
                  throw new Error(d.error || d.details || `API error ${res.status}`);
                });
              }
              return res.json();
            })
            .then((data) => {
              if (data.report) {
                setReport(data.report);
              } else {
                setReportError("No report data returned");
              }
            })
            .catch((err) => {
              console.error("Report generation failed:", err);
              setReportError(err.message || "Failed to generate report");
            })
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

  // Close notifications on outside click
  useEffect(() => {
    if (!notificationsOpen) return;
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notificationsOpen]);

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

  const handleSelectMunicipality = useCallback(async (place: Place) => {
    setQuery(place.name);
    setMunicipality(place.name);
    setMunicipalityCoords({ lat: place.lat, lng: place.lng });
    setSuggestions([]);

    await supabase.auth.updateUser({
      data: {
        dashboard_municipality: place.name,
        dashboard_municipality_lat: place.lat,
        dashboard_municipality_lng: place.lng,
      },
    });
  }, []);

  const handleResolvePin = useCallback(
    async (pinId: string, comment: string, proofPhotoDataUrl: string) => {
      try {
        const updated = await resolvePin(pinId, comment, proofPhotoDataUrl);
        setPins((prev) => prev.map((p) => (p.id === pinId ? updated : p)));
        setViewingPin(null);
      } catch (err) {
        console.error("Failed to resolve pin:", err);
      }
    },
    [],
  );

  const handlePinUpdate = useCallback((updated: Pin) => {
    setPins((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setViewingPin(updated);
  }, []);

  const handleRetryReport = useCallback(() => {
    if (!municipality) return;
    setReportLoading(true);
    setReport(null);
    setReportError(null);
    setTranslatedReport(null);

    fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ municipality }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((d) => {
            throw new Error(d.error || d.details || `API error ${res.status}`);
          });
        }
        return res.json();
      })
      .then((data) => {
        if (data.report) {
          setReport(data.report);
          setReportError(null);
        } else {
          setReportError("No report data returned");
        }
      })
      .catch((err) => {
        console.error("Report retry failed:", err);
        setReportError(err.message || "Failed to generate report");
      })
      .finally(() => setReportLoading(false));
  }, [municipality]);

  // Derived data
  const activeCount = stats?.active ?? 124;
  const resolvedCount = stats?.resolved ?? 1208;
  const totalPins = pins.length;

  const categoryBreakdown = useMemo(() => {
    if (stats?.categoryBreakdown && stats.categoryBreakdown.length > 0) {
      return stats.categoryBreakdown.slice(0, 4).map((item) => {
        const cat = getCategoryById(item.categoryId);
        return {
          label: cat?.label ?? item.categoryId,
          count: item.count,
          color: cat?.color ?? "#a6acb3",
          percent:
            stats.total > 0 ? Math.round((item.count / stats.total) * 100) : 0,
        };
      });
    }
    // Default placeholder data
    return [
      { label: "Flooding", count: 42, color: "#ee7d77", percent: 85 },
      { label: "Pothole", count: 28, color: "#fdd400", percent: 60 },
      { label: "Illegal Dumping", count: 19, color: "#b0c6ff", percent: 40 },
      { label: "Others", count: 12, color: "#a6acb3", percent: 25 },
    ];
  }, [stats]);

  // placeholder insights when no report is loaded yet
  const placeholderInsights = [
    {
      text: (
        <span>
          Current flood trajectory indicates high risk for{" "}
          <span className="font-bold">District 3</span> residential areas.
          Immediate drainage clearing recommended.
        </span>
      ),
      bordered: true,
    },
    {
      text: (
        <span>
          Report volume has increased by{" "}
          <span className="font-bold text-[#ee7d77]">12%</span> in the last 4
          hours, primarily focused on road infrastructure issues.
        </span>
      ),
      bordered: true,
    },
    {
      text: (
        <span className="text-[#a6acb3]">
          Pattern matching suggests potential illegal dumping correlation with
          construction activity near Commonwealth Avenue.
        </span>
      ),
      bordered: false,
    },
  ];

  // Most recent pin for the "Live Ops Feed"
  const latestPin = useMemo(() => {
    if (pins.length > 0) {
      const pin = pins[0];
      const cat = getCategoryById(pin.categoryId);
      return {
        category: cat?.label ?? pin.categoryId,
        location: pin.description?.slice(0, 30) || "Unknown location",
        status: pin.status === "resolved" ? "Contained" : "Uncontained",
        isActive: pin.status !== "resolved",
      };
    }
    return {
      category: "Major Flooding",
      location: "Brgy. Libis",
      status: "Uncontained",
      isActive: true,
    };
  }, [pins]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#fdd400] border-t-transparent" />
      </div>
    );
  }

  if (!user || !isCommunityWatcher) return null;

  const displayReport = translatedReport ?? report;

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <header className="shrink-0 flex items-center justify-between px-8 py-3.5 border-b border-[#1e1e1e]">
        <div className="flex items-center gap-8">
          <span
            className="text-[20px] font-black uppercase tracking-[-1px] text-[#fdd400] cursor-pointer"
            onClick={() => router.push("/")}
          >
            DAGYAW
          </span>

          {/* Search */}
          <div className="relative">
            <FaSearch
              size={10}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search operational grid..."
              className="w-[256px] bg-black border border-[#2a2d30] rounded-lg text-[12px] text-[#e0e6ed] placeholder-[#6b7280] pl-8 pr-4 py-2.5 outline-none focus:border-[#fdd400]/40 transition-colors"
            />
            {/* Search suggestions dropdown */}
            {suggestions.length > 0 && (
              <div className="absolute top-full mt-1 left-0 w-full bg-[#141414] border border-[#2a2d30] rounded-lg z-50 max-h-48 overflow-y-auto">
                {suggestions.map((place, i) => (
                  <button
                    key={`${place.name}-${i}`}
                    onClick={() => handleSelectMunicipality(place)}
                    className="w-full text-left px-3 py-2 text-[11px] text-[#a6acb3] hover:bg-[#1a1a1a] hover:text-[#e0e6ed] transition-colors"
                  >
                    <p className="font-medium text-[#e0e6ed] truncate">
                      {place.name}
                    </p>
                    <p className="text-[10px] text-[#6b7280] truncate">
                      {place.displayName}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotificationsOpen((v) => !v)}
              className="relative text-[#a6acb3] hover:text-[#e0e6ed] transition-colors"
            >
              <FaBell size={16} />
              {pins.length > 0 && (
                <span className="absolute -top-1 -right-1.5 flex items-center justify-center h-3.5 w-3.5 rounded-full bg-[#ee7d77] text-[7px] font-bold text-white">
                  {pins.length > 99 ? "99" : pins.length}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {notificationsOpen && (
              <div className="absolute top-full right-0 mt-2 w-[380px] max-h-[480px] bg-[#141414] border border-[#2a2d30] rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2d30] shrink-0">
                  <span className="text-[11px] font-bold uppercase tracking-[1px] text-[#e0e6ed]">
                    Citizen Reports
                  </span>
                  <span className="text-[10px] text-[#a6acb3]">
                    {pins.length} total
                  </span>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  {pins.length === 0 ? (
                    <div className="flex items-center justify-center py-10">
                      <span className="text-[11px] text-[#a6acb3]/60">
                        No reports yet
                      </span>
                    </div>
                  ) : (
                    pins.map((pin) => {
                      const cat = getCategoryById(pin.categoryId);
                      const statusColor =
                        pin.status === "resolved"
                          ? "#22c55e"
                          : pin.status === "pending_resolved"
                            ? "#f59e0b"
                            : "#ee7d77";
                      const statusLabel =
                        pin.status === "resolved"
                          ? "Resolved"
                          : pin.status === "pending_resolved"
                            ? "Pending"
                            : "Active";
                      return (
                        <button
                          key={pin.id}
                          onClick={() => {
                            setViewingPin(pin);
                            setNotificationsOpen(false);
                          }}
                          className="w-full flex gap-3 px-4 py-3 hover:bg-white/4 transition-colors text-left border-b border-[#2a2d30]/50 last:border-0"
                        >
                          {/* Photo thumbnail */}
                          <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-[#1a1a1a] border border-[#2a2d30]">
                            {pin.photoUrl ? (
                              <img
                                src={pin.photoUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                {cat && (
                                  <CategoryIcon
                                    iconName={cat.icon}
                                    color={cat.color}
                                    size={16}
                                  />
                                )}
                              </div>
                            )}
                          </div>
                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span
                                className="text-[10px] font-semibold uppercase truncate"
                                style={{ color: cat?.color ?? "#a6acb3" }}
                              >
                                {cat?.label ?? pin.categoryId}
                              </span>
                              <span
                                className="shrink-0 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded"
                                style={{
                                  color: statusColor,
                                  backgroundColor: `${statusColor}15`,
                                }}
                              >
                                {statusLabel}
                              </span>
                            </div>
                            <p className="text-[11px] leading-[15px] text-[#e0e6ed]/80 line-clamp-2">
                              {pin.description || "No description provided"}
                            </p>
                            <span className="text-[9px] text-[#a6acb3]/50 mt-1 block">
                              {new Date(pin.createdAt).toLocaleDateString("en-PH", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#2a2d30] overflow-hidden flex items-center justify-center">
            {user.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[11px] font-bold text-[#a6acb3]">
                {user.email?.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ── Dashboard Content ── */}
      <main className="flex-1 min-h-0 overflow-hidden p-6">
        <div className="h-full grid grid-cols-12 gap-5 grid-rows-[auto_1.3fr_minmax(0,1fr)_auto]">
          {/* Row 1: Stat Cards */}
          <div className="col-span-12 grid grid-cols-3 gap-3">
            <StatCard
              label="Active"
              value={stats ? stats.active : 124}
              subtitle="New or urgent"
              color="#ee7d77"
            />
            <StatCard
              label="Pending"
              value={
                stats
                  ? Math.max(0, stats.total - stats.active - stats.resolved)
                  : 42
              }
              subtitle="In 3-day window"
              color="#fdd400"
            />
            <StatCard
              label="Resolved"
              value={stats ? stats.resolved.toLocaleString() : "1,208"}
              subtitle="Total this month"
              color="#b0c6ff"
            />
          </div>

          {/* Row 2: Map Section */}
          <div className="col-span-12 bg-[#141414] border border-[#2a2d30] rounded-lg overflow-hidden relative">
            {/* Interactive Map */}
            <div className="absolute inset-0">
              <DashboardMap
                pins={pins}
                center={municipalityCoords}
                onPinClick={setViewingPin}
              />
            </div>

            {/* Live Ops Feed overlay */}
            <div className="absolute top-5 left-5 z-10 backdrop-blur-xl bg-black/50 border border-white/8 rounded-lg p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <FaCircle size={8} className="text-[#ee7d77] animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-[1px] text-[#ee7d77]">
                  Live Ops Feed
                </span>
              </div>
              <div className="text-[10px] leading-[16px] text-[#a6acb3]">
                <p>
                  {latestPin.category}:{" "}
                  <span className="text-[#e0e6ed]">{latestPin.location}</span>
                </p>
                <p>
                  Status:{" "}
                  <span
                    className={`font-bold ${
                      latestPin.isActive ? "text-[#ee7d77]" : "text-[#22c55e]"
                    }`}
                  >
                    {latestPin.status}
                  </span>
                </p>
              </div>
            </div>

            {/* Municipality label */}
            {municipality && (
              <div className="absolute top-5 right-5 z-10 backdrop-blur-xl bg-black/50 border border-white/8 rounded-lg px-3.5 py-2">
                <span className="text-[10px] font-bold uppercase tracking-[1px] text-[#fdd400]">
                  {municipality}
                </span>
                <span className="text-[10px] text-[#a6acb3] ml-2">
                  {totalPins} reports
                </span>
              </div>
            )}
          </div>

          {/* Row 3: Category Breakdown + AI Insights */}
          <div className="col-span-12 grid grid-cols-12 gap-4 min-h-0">
            {/* Category Breakdown */}
            <div className="col-span-5 bg-[#141414] border border-[#2a2d30] rounded-lg p-5 flex flex-col gap-4 min-h-0 overflow-hidden">
              <span className="text-[11px] font-bold uppercase tracking-[1px] text-[#e0e6ed] shrink-0">
                Category Breakdown
              </span>
              <div className="flex flex-col flex-1 min-h-0 overflow-y-auto pr-1">
                <div className="flex flex-col gap-3.5 my-auto">
                  {categoryBreakdown.map((cat) => (
                    <CategoryBar
                      key={cat.label}
                      label={cat.label}
                      value={`${cat.count} Units`}
                      color={cat.color}
                      percent={cat.percent}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* AI Insights */}
            <div className="col-span-7 bg-[#141414] border border-[#2a2d30] rounded-lg p-5 flex flex-col gap-3 min-h-0">
              <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <HiSparkles size={13} className="text-[#fdd400]" />
                  <span className="text-[11px] font-bold uppercase tracking-[1px] text-[#fdd400]">
                    AI Insights
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {report && !reportLoading && (
                    <button
                      onClick={handleTranslateReport}
                      disabled={translatingReport}
                      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                        translatedReport
                          ? "bg-[#fdd400]/20 text-[#fdd400]"
                          : "bg-white/5 text-[#a6acb3] hover:bg-white/10 hover:text-[#e0e6ed]"
                      } ${translatingReport ? "opacity-60 cursor-wait" : ""}`}
                    >
                      <FaLanguage size={12} />
                      {translatingReport
                        ? "..."
                        : translatedReport
                          ? "EN"
                          : "FIL"}
                    </button>
                  )}
                  {(report || !reportLoading) && (
                    <button
                      onClick={() => setInsightsExpanded(true)}
                      className="flex items-center justify-center w-7 h-7 rounded-full bg-white/5 text-[#a6acb3] hover:bg-white/10 hover:text-[#e0e6ed] transition-colors"
                      title="Expand insights"
                    >
                      <FaExpand size={10} />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                {reportLoading ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#fdd400] border-t-transparent" />
                    <span className="text-[10px] text-[#a6acb3]">
                      Analyzing reports...
                    </span>
                  </div>
                ) : report ? (
                  <div className="flex flex-col gap-3.5">
                    {/* Overall Assessment */}
                    <div className="border-l-2 border-[#fdd400]/40 pl-3">
                      <span className="text-[10px] font-bold uppercase tracking-[0.8px] text-[#a6acb3] block mb-1">
                        Assessment
                      </span>
                      <p className="text-[12px] leading-[18px] text-[#e0e6ed] whitespace-pre-line">
                        {displayReport?.overallAssessment}
                      </p>
                    </div>

                    {/* Biggest Problems */}
                    {displayReport &&
                      displayReport.biggestProblems.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-[0.8px] text-[#ee7d77] block mb-2">
                            Biggest Problems
                          </span>
                          <div className="flex flex-col gap-2">
                            {displayReport.biggestProblems.map((problem, i) => (
                              <div
                                key={i}
                                className={`pl-3 py-2 rounded-r border-l-2 ${
                                  problem.severity === "critical"
                                    ? "border-[#ee7d77] bg-[#ee7d77]/5"
                                    : problem.severity === "warning"
                                      ? "border-[#fdd400] bg-[#fdd400]/5"
                                      : "border-[#b0c6ff] bg-[#b0c6ff]/5"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-[11px] font-semibold text-[#e0e6ed]">
                                    {problem.issue}
                                  </span>
                                  <span
                                    className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                      problem.severity === "critical"
                                        ? "bg-[#ee7d77]/15 text-[#ee7d77]"
                                        : problem.severity === "warning"
                                          ? "bg-[#fdd400]/15 text-[#fdd400]"
                                          : "bg-[#b0c6ff]/15 text-[#b0c6ff]"
                                    }`}
                                  >
                                    {problem.severity}
                                  </span>
                                </div>
                                <p className="text-[11px] leading-[16px] text-[#a6acb3]">
                                  {problem.explanation}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Location Hotspots */}
                    {displayReport &&
                      displayReport.locationHotspots.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-[0.8px] text-[#fdd400] block mb-2">
                            Location Hotspots
                          </span>
                          <div className="flex flex-col gap-2">
                            {displayReport.locationHotspots.map(
                              (hotspot, i) => (
                                <div
                                  key={i}
                                  className="pl-3 border-l-2 border-[#fdd400]/30"
                                >
                                  <span className="text-[11px] font-semibold text-[#e0e6ed] block">
                                    {hotspot.area}
                                  </span>
                                  <p className="text-[11px] leading-[16px] text-[#a6acb3]">
                                    {hotspot.concern}
                                  </p>
                                  <p className="text-[11px] leading-[16px] text-[#fdd400]/60 italic mt-0.5">
                                    {hotspot.recommendation}
                                  </p>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                    {/* Congestion Analysis */}
                    {displayReport?.congestionAnalysis && (
                      <div className="border-l-2 border-[#a6acb3]/30 pl-3">
                        <span className="text-[10px] font-bold uppercase tracking-[0.8px] text-[#a6acb3] block mb-1">
                          Congestion & Patterns
                        </span>
                        <p className="text-[12px] leading-[18px] text-[#e0e6ed]">
                          {displayReport.congestionAnalysis}
                        </p>
                      </div>
                    )}

                    {/* Resolution Performance */}
                    {displayReport?.resolutionPerformance && (
                      <div className="border-l-2 border-[#22c55e]/40 pl-3">
                        <span className="text-[10px] font-bold uppercase tracking-[0.8px] text-[#22c55e] block mb-1">
                          Resolution Performance
                        </span>
                        <p className="text-[12px] leading-[18px] text-[#e0e6ed]">
                          {displayReport.resolutionPerformance}
                        </p>
                      </div>
                    )}

                    {/* Recommendations */}
                    {displayReport &&
                      displayReport.recommendations.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-[0.8px] text-[#fdd400] block mb-2">
                            Recommendations
                          </span>
                          <div className="flex flex-col gap-1.5">
                            {displayReport.recommendations.map((rec, i) => (
                              <div key={i} className="flex gap-2 pl-1">
                                <span className="shrink-0 flex items-center justify-center h-4 w-4 rounded-full bg-[#fdd400]/10 text-[8px] font-bold text-[#fdd400] mt-0.5">
                                  {rec.priority}
                                </span>
                                <div>
                                  <span className="text-[11px] font-semibold text-[#e0e6ed] block">
                                    {rec.action}
                                  </span>
                                  <p className="text-[11px] leading-[16px] text-[#a6acb3]">
                                    {rec.rationale}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                ) : reportError ? (
                  /* Error state with retry */
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
                    <span className="text-[11px] text-[#ee7d77] font-medium">
                      Failed to generate insights
                    </span>
                    <span className="text-[10px] text-[#a6acb3]/70 leading-[15px]">
                      {reportError}
                    </span>
                    <button
                      onClick={handleRetryReport}
                      className="mt-1 px-4 py-1.5 rounded-lg bg-[#fdd400]/10 text-[#fdd400] text-[10px] font-semibold hover:bg-[#fdd400]/20 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  /* Placeholder when no municipality selected */
                  <div className="flex flex-col gap-3">
                    {placeholderInsights.map((insight, i) => (
                      <div
                        key={i}
                        className={`pl-3 py-2 ${
                          insight.bordered
                            ? "border-l-2 border-[#fdd400]/40"
                            : "pl-3"
                        }`}
                      >
                        <p className="text-[12px] leading-[19px] text-[#e0e6ed]">
                          {insight.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Row 4: Footer */}
          <div className="col-span-12 border-t border-[#2a2d30]/30 flex items-center justify-center py-4 px-24">
            <p className="text-[10px] text-center tracking-[0.25px]">
              <span className="font-bold text-[#fdd400] uppercase">
                AI Advisory:{" "}
              </span>
              <span className="text-[#a6acb3]/50">
                The data visualizations and priority rankings above are
                generated with the assistance of AI models. Institutional
                verification is recommended for all critical emergency
                responses.
              </span>
            </p>
          </div>
        </div>
      </main>

      {/* Expanded AI Insights Modal */}
      {insightsExpanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setInsightsExpanded(false)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[85vh] bg-[#141414] border border-[#2a2d30] rounded-xl shadow-2xl flex flex-col mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2d30] shrink-0">
              <div className="flex items-center gap-2.5">
                <HiSparkles size={16} className="text-[#fdd400]" />
                <span className="text-[14px] font-bold uppercase tracking-[0.8px] text-[#fdd400]">
                  AI Insights
                </span>
                {municipality && (
                  <span className="text-[12px] text-[#a6acb3] ml-1">
                    — {municipality}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {report && !reportLoading && (
                  <button
                    onClick={handleTranslateReport}
                    disabled={translatingReport}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                      translatedReport
                        ? "bg-[#fdd400]/20 text-[#fdd400]"
                        : "bg-white/5 text-[#a6acb3] hover:bg-white/10 hover:text-[#e0e6ed]"
                    } ${translatingReport ? "opacity-60 cursor-wait" : ""}`}
                  >
                    <FaLanguage size={13} />
                    {translatingReport
                      ? "Translating..."
                      : translatedReport
                        ? "English"
                        : "Filipino"}
                  </button>
                )}
                <button
                  onClick={() => setInsightsExpanded(false)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 text-[#a6acb3] hover:bg-white/10 hover:text-[#e0e6ed] transition-colors"
                >
                  <FaTimes size={12} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
              {reportLoading ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#fdd400] border-t-transparent" />
                  <span className="text-[12px] text-[#a6acb3]">
                    Analyzing reports...
                  </span>
                </div>
              ) : report ? (
                <div className="flex flex-col gap-6">
                  {/* Overall Assessment */}
                  <div className="border-l-2 border-[#fdd400]/40 pl-4">
                    <span className="text-[11px] font-bold uppercase tracking-[1px] text-[#a6acb3] block mb-1.5">
                      Assessment
                    </span>
                    <p className="text-[14px] leading-[22px] text-[#e0e6ed] whitespace-pre-line">
                      {displayReport?.overallAssessment}
                    </p>
                  </div>

                  {/* Biggest Problems */}
                  {displayReport &&
                    displayReport.biggestProblems.length > 0 && (
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-[1px] text-[#ee7d77] block mb-3">
                          Biggest Problems
                        </span>
                        <div className="flex flex-col gap-3">
                          {displayReport.biggestProblems.map((problem, i) => (
                            <div
                              key={i}
                              className={`pl-4 py-3 rounded-r border-l-2 ${
                                problem.severity === "critical"
                                  ? "border-[#ee7d77] bg-[#ee7d77]/5"
                                  : problem.severity === "warning"
                                    ? "border-[#fdd400] bg-[#fdd400]/5"
                                    : "border-[#b0c6ff] bg-[#b0c6ff]/5"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[13px] font-semibold text-[#e0e6ed]">
                                  {problem.issue}
                                </span>
                                <span
                                  className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                                    problem.severity === "critical"
                                      ? "bg-[#ee7d77]/15 text-[#ee7d77]"
                                      : problem.severity === "warning"
                                        ? "bg-[#fdd400]/15 text-[#fdd400]"
                                        : "bg-[#b0c6ff]/15 text-[#b0c6ff]"
                                  }`}
                                >
                                  {problem.severity}
                                </span>
                              </div>
                              <p className="text-[13px] leading-[20px] text-[#a6acb3]">
                                {problem.explanation}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Location Hotspots */}
                  {displayReport &&
                    displayReport.locationHotspots.length > 0 && (
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-[1px] text-[#fdd400] block mb-3">
                          Location Hotspots
                        </span>
                        <div className="flex flex-col gap-3">
                          {displayReport.locationHotspots.map((hotspot, i) => (
                            <div
                              key={i}
                              className="pl-4 border-l-2 border-[#fdd400]/30"
                            >
                              <span className="text-[13px] font-semibold text-[#e0e6ed] block">
                                {hotspot.area}
                              </span>
                              <p className="text-[13px] leading-[20px] text-[#a6acb3]">
                                {hotspot.concern}
                              </p>
                              <p className="text-[13px] leading-[20px] text-[#fdd400]/60 italic mt-0.5">
                                {hotspot.recommendation}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Congestion Analysis */}
                  {displayReport?.congestionAnalysis && (
                    <div className="border-l-2 border-[#a6acb3]/30 pl-4">
                      <span className="text-[11px] font-bold uppercase tracking-[1px] text-[#a6acb3] block mb-1.5">
                        Congestion & Patterns
                      </span>
                      <p className="text-[14px] leading-[22px] text-[#e0e6ed]">
                        {displayReport.congestionAnalysis}
                      </p>
                    </div>
                  )}

                  {/* Resolution Performance */}
                  {displayReport?.resolutionPerformance && (
                    <div className="border-l-2 border-[#22c55e]/40 pl-4">
                      <span className="text-[11px] font-bold uppercase tracking-[1px] text-[#22c55e] block mb-1.5">
                        Resolution Performance
                      </span>
                      <p className="text-[14px] leading-[22px] text-[#e0e6ed]">
                        {displayReport.resolutionPerformance}
                      </p>
                    </div>
                  )}

                  {/* Recommendations */}
                  {displayReport &&
                    displayReport.recommendations.length > 0 && (
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-[1px] text-[#fdd400] block mb-3">
                          Recommendations
                        </span>
                        <div className="flex flex-col gap-2.5">
                          {displayReport.recommendations.map((rec, i) => (
                            <div key={i} className="flex gap-3 pl-1">
                              <span className="shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-[#fdd400]/10 text-[9px] font-bold text-[#fdd400] mt-0.5">
                                {rec.priority}
                              </span>
                              <div>
                                <span className="text-[13px] font-semibold text-[#e0e6ed] block">
                                  {rec.action}
                                </span>
                                <p className="text-[13px] leading-[20px] text-[#a6acb3]">
                                  {rec.rationale}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              ) : reportError ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
                  <span className="text-[13px] text-[#ee7d77] font-medium">
                    Failed to generate insights
                  </span>
                  <span className="text-[12px] text-[#a6acb3]/70 leading-[18px]">
                    {reportError}
                  </span>
                  <button
                    onClick={handleRetryReport}
                    className="mt-1 px-5 py-2 rounded-lg bg-[#fdd400]/10 text-[#fdd400] text-[11px] font-semibold hover:bg-[#fdd400]/20 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {placeholderInsights.map((insight, i) => (
                    <div
                      key={i}
                      className={`pl-4 py-2 ${
                        insight.bordered
                          ? "border-l-2 border-[#fdd400]/40"
                          : ""
                      }`}
                    >
                      <p className="text-[14px] leading-[22px] text-[#e0e6ed]">
                        {insight.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pin Detail Modal — same as main app */}
      {viewingPin && (
        <PinDetailModal
          pin={viewingPin}
          onClose={() => setViewingPin(null)}
          onResolve={handleResolvePin}
          onPinUpdate={handlePinUpdate}
        />
      )}
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Pin } from "../components/MapView";
import type { Category } from "../components/categories";
import type { Insight } from "../lib/insights/types";
import { fetchPins, createPin, resolvePin } from "../lib/pins";
import type { LocationStatus } from "../components/UserLocationTracker";
import { ThemeContext, type Theme } from "../components/ThemeContext";
import { useAuth } from "../components/AuthContext";
import AuthModal from "../components/AuthModal";
import ReportButton from "../components/ReportButton";
import CategorySelector from "../components/CategorySelector";
import PlacementBanner from "../components/PlacementBanner";
import ReportForm from "../components/ReportForm";
import PinDetailModal from "../components/PinDetailModal";
import InsightPanel from "../components/InsightPanel";
import LocateButton from "../components/LocateButton";
import { FaCheckCircle, FaWater, FaRoad, FaExclamationTriangle } from "react-icons/fa";
import Navbar from "../components/Navbar";
import MunicipalitySearch from "../components/MunicipalitySearch";
import CityStats from "../components/CityStats";
import { computeFloodWasteAlerts, type FloodWasteAlert } from "../data/flood-zones";
import { computeProneZones, type ProneZone } from "../lib/prone-zones";

const MapView = dynamic(() => import("../components/MapView"), { ssr: false });

type Mode = "idle" | "selecting" | "placing" | "reporting";

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();

  const [pins, setPins] = useState<Pin[]>([]);
  const [mode, setMode] = useState<Mode>("idle");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [viewingPin, setViewingPin] = useState<Pin | null>(null);
  const [theme, setTheme] = useState<Theme>("dark");
  const [locateTrigger, setLocateTrigger] = useState(0);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [showSearch, setShowSearch] = useState(false);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [cityStatsName, setCityStatsName] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [showFloodZones, setShowFloodZones] = useState(false);
  const [showPotholeZones, setShowPotholeZones] = useState(false);
  const [showAccidentZones, setShowAccidentZones] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [viewingInsight, setViewingInsight] = useState<Insight | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [generatedFloodAlertIds, setGeneratedFloodAlertIds] = useState<Set<string>>(new Set());
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isDark = theme === "dark";

  const floodAlerts = useMemo<FloodWasteAlert[]>(
    () => (showFloodZones ? computeFloodWasteAlerts(pins, 4) : []),
    [pins, showFloodZones]
  );

  const proneZones = useMemo<ProneZone[]>(() => {
    const zones: ProneZone[] = [];
    if (showPotholeZones) zones.push(...computeProneZones(pins, "pothole"));
    if (showAccidentZones) zones.push(...computeProneZones(pins, "accident"));
    return zones;
  }, [pins, showPotholeZones, showAccidentZones]);

  const visiblePins = showResolved ? pins : pins.filter((p) => p.status !== "resolved");

  useEffect(() => {
    fetchPins()
      .then(setPins)
      .catch((err) => console.error("Failed to load pins:", err));
  }, []);

  const triggerInsightGeneration = useCallback(
    async (pin: Pin) => {
      setInsightLoading(true);
      try {
        const nearby = pins
          .filter((p) => p.id !== pin.id && p.status === "active")
          .map((p) => {
            const dist = haversineKm(pin.lat, pin.lng, p.lat, p.lng) * 1000;
            return { id: p.id, categoryId: p.categoryId, distance: dist, description: p.description, createdAt: p.createdAt };
          })
          .filter((p) => p.distance <= 500)
          .slice(0, 10);

        const res = await fetch("/api/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pinId: pin.id,
            categoryId: pin.categoryId,
            description: pin.description,
            lat: pin.lat,
            lng: pin.lng,
            municipality: pin.municipality ?? null,
            nearbyReports: nearby,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.insight) {
            setInsights((prev) => [...prev, data.insight]);
            setViewingInsight(data.insight);
          }
        }
      } catch (err) {
        console.error("Insight generation failed:", err);
      } finally {
        setInsightLoading(false);
      }
    },
    [pins]
  );

  const handleReportClick = useCallback(() => {
    if (mode === "idle") {
      if (!user) {
        setShowAuthModal(true);
        return;
      }
      setMode("selecting");
    } else {
      setMode("idle");
      setSelectedCategory(null);
      setPendingLocation(null);
    }
  }, [mode, user]);

  const handleCategorySelect = useCallback((category: Category) => {
    setSelectedCategory(category);
    setMode("placing");
  }, []);

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (mode !== "placing" || !selectedCategory) return;
      setPendingLocation({ lat, lng });
      setMode("reporting");
    },
    [mode, selectedCategory]
  );

  const handleReportSubmit = useCallback(
    async (description: string, photoDataUrl: string) => {
      if (!pendingLocation || !selectedCategory) return;

      try {
        const newPin = await createPin({
          lat: pendingLocation.lat,
          lng: pendingLocation.lng,
          categoryId: selectedCategory.id,
          description,
          photoDataUrl,
        });
        setPins((prev) => [newPin, ...prev]);
        triggerInsightGeneration(newPin);
      } catch (err) {
        console.error("Failed to create pin:", err);
        alert("Failed to submit report. Please try again.");
      }

      setMode("idle");
      setSelectedCategory(null);
      setPendingLocation(null);
    },
    [pendingLocation, selectedCategory, triggerInsightGeneration]
  );

  const handlePinClick = useCallback((pin: Pin) => {
    setViewingPin(pin);
  }, []);

  const handleResolvePin = useCallback(
    async (pinId: string, comment: string, proofPhotoDataUrl: string) => {
      try {
        const updated = await resolvePin(pinId, comment, proofPhotoDataUrl);
        setPins((prev) => prev.map((p) => (p.id === pinId ? updated : p)));
        setViewingPin(null);
      } catch (err) {
        console.error("Failed to resolve pin:", err);
        alert("Failed to resolve. Please try again.");
      }
    },
    []
  );

  const handlePinUpdate = useCallback((updated: Pin) => {
    setPins((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setViewingPin(updated);
  }, []);

  const handleCancel = useCallback(() => {
    setMode("idle");
    setSelectedCategory(null);
    setPendingLocation(null);
  }, []);

  const handleLocate = useCallback(() => {
    setLocateTrigger((n) => n + 1);
  }, []);

  const handleLocationStatus = useCallback((status: LocationStatus) => {
    setLocationStatus(status);
  }, []);

  const handleSelectMunicipality = useCallback(
    (name: string, lat: number, lng: number) => {
      setFlyTarget({ lat, lng });
      setShowSearch(false);
      setCityStatsName(name);
    },
    []
  );

  const handleInsightClick = useCallback((insight: Insight) => {
    setViewingInsight(insight);
  }, []);

  const handleFloodAlertClick = useCallback(
    async (alert: FloodWasteAlert) => {
      if (generatedFloodAlertIds.has(alert.id)) {
        const existing = insights.find(
          (i) => i.type === "waste_flood" && i.lat === alert.lat && i.lng === alert.lng
        );
        if (existing) {
          setViewingInsight(existing);
          return;
        }
      }

      setInsightLoading(true);
      try {
        const wastePinsInZone = pins
          .filter((p) => p.status === "active")
          .map((p) => ({
            id: p.id,
            categoryId: p.categoryId,
            distance: haversineKm(alert.lat, alert.lng, p.lat, p.lng) * 1000,
            description: p.description,
            createdAt: p.createdAt,
          }))
          .filter((p) => p.distance <= 800)
          .slice(0, 12);

        const res = await fetch("/api/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pinId: `flood-zone-${alert.id}`,
            categoryId: "flooding",
            description: `Flood-prone zone "${alert.zoneName}" (${alert.hazardLevel} risk) with ${alert.wasteCount} active waste reports. Waste congestion increases flood contamination risk.`,
            lat: alert.lat,
            lng: alert.lng,
            municipality: null,
            nearbyReports: wastePinsInZone,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.insight) {
            setInsights((prev) => [...prev, data.insight]);
            setViewingInsight(data.insight);
            setGeneratedFloodAlertIds((prev) => new Set(prev).add(alert.id));
          }
        }
      } catch (err) {
        console.error("Flood alert insight generation failed:", err);
      } finally {
        setInsightLoading(false);
      }
    },
    [pins, insights, generatedFloodAlertIds]
  );

  return (
    <ThemeContext value={theme}>
      <main
        className={`relative h-screen w-screen overflow-hidden ${
          isDark ? "bg-[#0a0a0a]" : "bg-[#f0f0f0]"
        }`}
      >
        <MapView
          pins={visiblePins}
          onMapClick={handleMapClick}
          onPinClick={handlePinClick}
          isPlacingPin={mode === "placing"}
          locateTrigger={locateTrigger}
          onLocationStatus={handleLocationStatus}
          flyTarget={flyTarget}
          highlightMunicipality={null}
          showFloodZones={showFloodZones}
          insights={insights}
          onInsightClick={handleInsightClick}
          floodAlerts={floodAlerts}
          onFloodAlertClick={handleFloodAlertClick}
          proneZones={proneZones}
        />

        {/* Vignette */}
        <div className={isDark ? "vignette-dark" : "vignette-light"} />

        {/* Navbar */}
        <Navbar
          onToggleTheme={() => setTheme(isDark ? "light" : "dark")}
          onOpenSearch={() => setShowSearch(true)}
          onOpenAuth={() => setShowAuthModal(true)}
          onNavigateDashboard={() => router.push("/dashboard")}
          showUserMenu={showUserMenu}
          onToggleUserMenu={() => setShowUserMenu((v) => !v)}
          onCloseUserMenu={() => setShowUserMenu(false)}
        />

        {/* Insight loading indicator */}
        {insightLoading && (
          <div className="fixed top-14 right-4 z-[1001] flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-950/80 px-3 py-1.5 backdrop-blur-md">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
            <span className="text-[10px] font-medium text-blue-300">Analyzing...</span>
          </div>
        )}

        {/* Map overlay toggles */}
        <div className="fixed bottom-[4.5rem] left-6 z-[1000] flex flex-col gap-2">
          {/* Flood zones toggle */}
          <button
            onClick={() => setShowFloodZones((v) => !v)}
            title={showFloodZones ? "Hide flood zones" : "Show flood zones"}
            className={`flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md transition-all ${
              showFloodZones
                ? isDark
                  ? "border-red-500/40 bg-red-500/15 text-red-400"
                  : "border-red-600/40 bg-red-500/15 text-red-600"
                : isDark
                  ? "border-neutral-700 bg-[#0f0f0f]/80 text-neutral-400 hover:bg-[#1a1a1a]"
                  : "border-neutral-300 bg-white/80 text-neutral-500 hover:bg-white"
            }`}
            style={{
              boxShadow: isDark
                ? "0 2px 12px rgba(0,0,0,0.4)"
                : "0 2px 12px rgba(0,0,0,0.1)",
            }}
          >
            <FaWater size={15} />
          </button>

          {/* Pothole-prone toggle */}
          <button
            onClick={() => setShowPotholeZones((v) => !v)}
            title={showPotholeZones ? "Hide pothole-prone zones" : "Show pothole-prone zones"}
            className={`flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md transition-all ${
              showPotholeZones
                ? isDark
                  ? "border-stone-400/40 bg-stone-500/15 text-stone-300"
                  : "border-stone-600/40 bg-stone-500/15 text-stone-600"
                : isDark
                  ? "border-neutral-700 bg-[#0f0f0f]/80 text-neutral-400 hover:bg-[#1a1a1a]"
                  : "border-neutral-300 bg-white/80 text-neutral-500 hover:bg-white"
            }`}
            style={{
              boxShadow: isDark
                ? "0 2px 12px rgba(0,0,0,0.4)"
                : "0 2px 12px rgba(0,0,0,0.1)",
            }}
          >
            <FaRoad size={15} />
          </button>

          {/* Accident-prone toggle */}
          <button
            onClick={() => setShowAccidentZones((v) => !v)}
            title={showAccidentZones ? "Hide accident-prone zones" : "Show accident-prone zones"}
            className={`flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md transition-all ${
              showAccidentZones
                ? isDark
                  ? "border-amber-400/40 bg-amber-500/15 text-amber-300"
                  : "border-amber-600/40 bg-amber-500/15 text-amber-600"
                : isDark
                  ? "border-neutral-700 bg-[#0f0f0f]/80 text-neutral-400 hover:bg-[#1a1a1a]"
                  : "border-neutral-300 bg-white/80 text-neutral-500 hover:bg-white"
            }`}
            style={{
              boxShadow: isDark
                ? "0 2px 12px rgba(0,0,0,0.4)"
                : "0 2px 12px rgba(0,0,0,0.1)",
            }}
          >
            <FaExclamationTriangle size={15} />
          </button>

          {/* Show resolved toggle */}
          <button
            onClick={() => setShowResolved((v) => !v)}
            title={showResolved ? "Hide resolved pins" : "Show resolved pins"}
            className={`flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md transition-all ${
              showResolved
                ? isDark
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-emerald-600/40 bg-emerald-500/10 text-emerald-600"
                : isDark
                  ? "border-neutral-700 bg-[#0f0f0f]/80 text-neutral-400 hover:bg-[#1a1a1a]"
                  : "border-neutral-300 bg-white/80 text-neutral-500 hover:bg-white"
            }`}
            style={{
              boxShadow: isDark
                ? "0 2px 12px rgba(0,0,0,0.4)"
                : "0 2px 12px rgba(0,0,0,0.1)",
            }}
          >
            <FaCheckCircle size={15} />
          </button>
        </div>

        {/* Locate me button */}
        <LocateButton onClick={handleLocate} status={locationStatus} />

        <ReportButton
          isActive={mode !== "idle"}
          onClick={handleReportClick}
        />

        {mode === "selecting" && (
          <CategorySelector
            onSelect={handleCategorySelect}
            onClose={handleCancel}
          />
        )}

        {mode === "placing" && selectedCategory && (
          <PlacementBanner category={selectedCategory} onCancel={handleCancel} />
        )}

        {mode === "reporting" && selectedCategory && (
          <ReportForm
            category={selectedCategory}
            onSubmit={handleReportSubmit}
            onCancel={handleCancel}
          />
        )}

        {viewingPin && (
          <PinDetailModal
            pin={viewingPin}
            onClose={() => setViewingPin(null)}
            onResolve={handleResolvePin}
            onPinUpdate={handlePinUpdate}
          />
        )}

        {viewingInsight && (
          <InsightPanel
            insight={viewingInsight}
            onClose={() => setViewingInsight(null)}
          />
        )}

        {showSearch && (
          <MunicipalitySearch
            onClose={() => setShowSearch(false)}
            onSelectMunicipality={handleSelectMunicipality}
          />
        )}

        {cityStatsName && (
          <CityStats
            municipalityName={cityStatsName}
            onClose={() => setCityStatsName(null)}
          />
        )}

        {showAuthModal && (
          <AuthModal onClose={() => setShowAuthModal(false)} />
        )}
      </main>
    </ThemeContext>
  );
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

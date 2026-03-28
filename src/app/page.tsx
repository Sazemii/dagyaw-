"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import type { Pin } from "../components/MapView";
import type { Category } from "../components/categories";
import { fetchPins, createPin, resolvePin } from "../lib/pins";
import type { LocationStatus } from "../components/UserLocationTracker";
import { ThemeContext, type Theme } from "../components/ThemeContext";
import StatusBar from "../components/StatusBar";
import ReportButton from "../components/ReportButton";
import CategorySelector from "../components/CategorySelector";
import PlacementBanner from "../components/PlacementBanner";
import ReportForm from "../components/ReportForm";
import PinDetailModal from "../components/PinDetailModal";
import LocateButton from "../components/LocateButton";
import { FaSun, FaMoon, FaSearch } from "react-icons/fa";
import MunicipalitySearch from "../components/MunicipalitySearch";

const MapView = dynamic(() => import("../components/MapView"), { ssr: false });

type Mode = "idle" | "selecting" | "placing" | "reporting";

export default function Home() {
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

  const isDark = theme === "dark";

  // Load pins from Supabase on mount
  useEffect(() => {
    fetchPins()
      .then(setPins)
      .catch((err) => console.error("Failed to load pins:", err));
  }, []);

  const handleReportClick = useCallback(() => {
    if (mode === "idle") {
      setMode("selecting");
    } else {
      setMode("idle");
      setSelectedCategory(null);
      setPendingLocation(null);
    }
  }, [mode]);

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
      } catch (err) {
        console.error("Failed to create pin:", err);
        alert("Failed to submit report. Please try again.");
      }

      setMode("idle");
      setSelectedCategory(null);
      setPendingLocation(null);
    },
    [pendingLocation, selectedCategory]
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
    (_name: string, lat: number, lng: number) => {
      setFlyTarget({ lat, lng });
      setShowSearch(false);
    },
    []
  );

  return (
    <ThemeContext value={theme}>
      <main
        className={`relative h-screen w-screen overflow-hidden ${
          isDark ? "bg-[#0a0a0a]" : "bg-[#f0f0f0]"
        }`}
      >
        <MapView
          pins={pins}
          onMapClick={handleMapClick}
          onPinClick={handlePinClick}
          isPlacingPin={mode === "placing"}
          locateTrigger={locateTrigger}
          onLocationStatus={handleLocationStatus}
          flyTarget={flyTarget}
        />

        {/* Vignette */}
        <div className={isDark ? "vignette-dark" : "vignette-light"} />

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className={`fixed top-4 right-4 z-[1000] flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md transition-all ${
            isDark
              ? "border-neutral-700 bg-[#0f0f0f]/80 text-neutral-400 hover:text-[#f5c542]"
              : "border-neutral-300 bg-white/80 text-neutral-500 hover:text-[#b8860b]"
          }`}
        >
          {isDark ? <FaSun size={14} /> : <FaMoon size={14} />}
        </button>

        {/* Search municipality button */}
        <button
          onClick={() => setShowSearch(true)}
          className={`fixed top-4 right-16 z-[1000] flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md transition-all ${
            isDark
              ? "border-neutral-700 bg-[#0f0f0f]/80 text-neutral-400 hover:text-[#f5c542]"
              : "border-neutral-300 bg-white/80 text-neutral-500 hover:text-[#b8860b]"
          }`}
        >
          <FaSearch size={13} />
        </button>

        <StatusBar pins={pins} />

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
          />
        )}

        {showSearch && (
          <MunicipalitySearch
            onClose={() => setShowSearch(false)}
            onSelectMunicipality={handleSelectMunicipality}
          />
        )}
      </main>
    </ThemeContext>
  );
}

"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import type { Pin } from "../components/MapView";
import type { Category } from "../components/categories";
import { ThemeContext, type Theme } from "../components/ThemeContext";
import StatusBar from "../components/StatusBar";
import ReportButton from "../components/ReportButton";
import CategorySelector from "../components/CategorySelector";
import PlacementBanner from "../components/PlacementBanner";
import ReportForm from "../components/ReportForm";
import PinDetailModal from "../components/PinDetailModal";
import LocateButton from "../components/LocateButton";
import { FaSun, FaMoon } from "react-icons/fa";

const MapView = dynamic(() => import("../components/MapView"), { ssr: false });

type Mode = "idle" | "selecting" | "placing" | "reporting";

export default function Home() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [mode, setMode] = useState<Mode>("idle");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [viewingPin, setViewingPin] = useState<Pin | null>(null);
  const [theme, setTheme] = useState<Theme>("dark");
  const [permissionRequested, setPermissionRequested] = useState(false);

  const isDark = theme === "dark";

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
    (description: string, photoDataUrl: string) => {
      if (!pendingLocation || !selectedCategory) return;

      const newPin: Pin = {
        id: `pin-${Date.now()}`,
        lat: pendingLocation.lat,
        lng: pendingLocation.lng,
        categoryId: selectedCategory.id,
        description,
        photoDataUrl,
        createdAt: new Date(),
      };

      setPins((prev) => [...prev, newPin]);
      setMode("idle");
      setSelectedCategory(null);
      setPendingLocation(null);
    },
    [pendingLocation, selectedCategory]
  );

  const handlePinClick = useCallback((pin: Pin) => {
    setViewingPin(pin);
  }, []);

  const handleCancel = useCallback(() => {
    setMode("idle");
    setSelectedCategory(null);
    setPendingLocation(null);
  }, []);

  const handleLocate = useCallback(() => {
    // Trigger permission request (needed for iOS DeviceOrientation)
    // This must happen from a user gesture
    setPermissionRequested(true);
  }, []);

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
          permissionRequested={permissionRequested}
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

        <StatusBar pins={pins} />

        {/* Locate me button */}
        <LocateButton onClick={handleLocate} />

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
          />
        )}
      </main>
    </ThemeContext>
  );
}

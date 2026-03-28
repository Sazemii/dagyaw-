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
import { FaSun, FaMoon, FaSearch, FaUser, FaShieldAlt, FaSignOutAlt } from "react-icons/fa";
import MunicipalitySearch from "../components/MunicipalitySearch";
import CityStats from "../components/CityStats";
import { AuthProvider, useAuth } from "../components/AuthContext";
import AuthModal from "../components/AuthModal";
import { signOut } from "../lib/auth";

const MapView = dynamic(() => import("../components/MapView"), { ssr: false });

type Mode = "idle" | "selecting" | "placing" | "reporting";

function HomePage() {
  const { user, profile } = useAuth();
  const isLoggedIn = !!user;
  const isInstitutional =
    profile?.role === "institutional" && profile?.roleStatus === "active";
  const isAdmin = profile?.role === "admin" && profile?.roleStatus === "active";

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
  const [showAuth, setShowAuth] = useState(false);
  const [authPrompt, setAuthPrompt] = useState<string | undefined>(undefined);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const isDark = theme === "dark";

  // Load pins from Supabase on mount
  useEffect(() => {
    fetchPins()
      .then(setPins)
      .catch((err) => console.error("Failed to load pins:", err));
  }, []);

  // Login gate: if user tries to report without auth, show auth modal
  const handleReportClick = useCallback(() => {
    if (mode === "idle") {
      if (!isLoggedIn) {
        setAuthPrompt("Sign in to report an issue");
        setShowAuth(true);
        return;
      }
      setMode("selecting");
    } else {
      setMode("idle");
      setSelectedCategory(null);
      setPendingLocation(null);
    }
  }, [mode, isLoggedIn]);

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
    (name: string, lat: number, lng: number) => {
      setFlyTarget({ lat, lng });
      setShowSearch(false);
      setCityStatsName(name);
    },
    []
  );

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      setShowProfileMenu(false);
    } catch {
      // ignore
    }
  }, []);

  const topBtnCls = `fixed z-[1000] flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md transition-all ${
    isDark
      ? "border-neutral-700 bg-[#0f0f0f]/80 text-neutral-400 hover:text-[#f5c542]"
      : "border-neutral-300 bg-white/80 text-neutral-500 hover:text-[#b8860b]"
  }`;

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

        {/* Top-right button group */}
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className={`${topBtnCls} top-4 right-4`}
        >
          {isDark ? <FaSun size={14} /> : <FaMoon size={14} />}
        </button>

        {/* Search municipality */}
        <button
          onClick={() => setShowSearch(true)}
          className={`${topBtnCls} top-4 right-16`}
        >
          <FaSearch size={13} />
        </button>

        {/* User / auth button */}
        <div className="fixed top-4 right-28 z-[1000]">
          {isLoggedIn ? (
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu((v) => !v)}
                className={`flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md transition-all ${
                  isDark
                    ? "border-[#f5c542]/30 bg-[#f5c542]/10 text-[#f5c542]"
                    : "border-[#b8860b]/30 bg-[#b8860b]/10 text-[#b8860b]"
                }`}
              >
                <span className="text-xs font-bold">
                  {(profile?.displayName?.[0] || user?.email?.[0] || "U").toUpperCase()}
                </span>
              </button>

              {/* Profile dropdown */}
              {showProfileMenu && (
                <>
                  <div
                    className="fixed inset-0 z-[999]"
                    onClick={() => setShowProfileMenu(false)}
                  />
                  <div
                    className={`absolute right-0 top-11 z-[1001] w-48 rounded-xl border p-1.5 ${
                      isDark
                        ? "border-neutral-800 bg-[#0f0f0f] shadow-2xl"
                        : "border-neutral-200 bg-white shadow-lg"
                    }`}
                  >
                    {/* User info */}
                    <div
                      className={`px-3 py-2 mb-1 ${
                        isDark ? "text-neutral-400" : "text-neutral-500"
                      }`}
                    >
                      <p
                        className={`text-xs font-semibold truncate ${
                          isDark ? "text-white" : "text-neutral-900"
                        }`}
                      >
                        {profile?.displayName || "User"}
                      </p>
                      <p className="text-[10px] truncate">{user?.email}</p>
                    </div>

                    {/* Watch Mode link */}
                    {(isInstitutional || isAdmin) && (
                      <a
                        href="/dashboard"
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                          isDark
                            ? "text-[#f5c542] hover:bg-[#f5c542]/10"
                            : "text-[#b8860b] hover:bg-[#b8860b]/10"
                        }`}
                      >
                        <FaShieldAlt size={11} />
                        Watch Mode
                      </a>
                    )}

                    {/* Sign out */}
                    <button
                      onClick={handleSignOut}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                        isDark
                          ? "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                          : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
                      }`}
                    >
                      <FaSignOutAlt size={11} />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={() => {
                setAuthPrompt(undefined);
                setShowAuth(true);
              }}
              className={topBtnCls}
            >
              <FaUser size={13} />
            </button>
          )}
        </div>

        {/* Watch Mode quick-access for institutional users */}
        {(isInstitutional || isAdmin) && (
          <a
            href="/dashboard"
            className={`fixed top-4 left-4 z-[1000] flex h-9 items-center gap-2 rounded-full border px-3 backdrop-blur-md transition-all ${
              isDark
                ? "border-[#f5c542]/30 bg-[#f5c542]/10 text-[#f5c542] hover:bg-[#f5c542]/20"
                : "border-[#b8860b]/30 bg-[#b8860b]/10 text-[#b8860b] hover:bg-[#b8860b]/20"
            }`}
          >
            <FaShieldAlt size={12} />
            <span className="text-xs font-semibold tracking-wide">WATCH MODE</span>
          </a>
        )}

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

        {cityStatsName && (
          <CityStats
            municipalityName={cityStatsName}
            onClose={() => setCityStatsName(null)}
          />
        )}

        {/* Auth modal */}
        {showAuth && (
          <AuthModal
            onClose={() => setShowAuth(false)}
            prompt={authPrompt}
          />
        )}
      </main>
    </ThemeContext>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <HomePage />
    </AuthProvider>
  );
}

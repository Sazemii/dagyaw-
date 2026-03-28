"use client";

import Image from "next/image";
import { useRef, useEffect } from "react";
import { useTheme } from "./ThemeContext";
import { useAuth } from "./AuthContext";
import {
  FaSun,
  FaMoon,
  FaSearch,
  FaUser,
  FaSignOutAlt,
  FaTachometerAlt,
} from "react-icons/fa";

interface NavbarProps {
  onToggleTheme: () => void;
  onOpenSearch: () => void;
  onOpenAuth: () => void;
  onNavigateDashboard: () => void;
  showUserMenu: boolean;
  onToggleUserMenu: () => void;
  onCloseUserMenu: () => void;
}

export default function Navbar({
  onToggleTheme,
  onOpenSearch,
  onOpenAuth,
  onNavigateDashboard,
  showUserMenu,
  onToggleUserMenu,
  onCloseUserMenu,
}: NavbarProps) {
  const theme = useTheme();
  const { user, isCommunityWatcher, signOut } = useAuth();
  const isDark = theme === "dark";
  const userMenuRef = useRef<HTMLDivElement>(null);

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

  const iconBtnCls = `flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
    isDark
      ? "text-neutral-400 hover:text-[#f5c542] hover:bg-white/[0.06]"
      : "text-neutral-500 hover:text-[#b8860b] hover:bg-black/[0.06]"
  }`;

  return (
    <nav
      className="fixed top-0 right-0 left-0 z-[1000] flex h-12 items-center justify-between px-4"
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
        <button
          onClick={onOpenSearch}
          className={iconBtnCls}
          title="Search municipality"
        >
          <FaSearch size={13} />
        </button>

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

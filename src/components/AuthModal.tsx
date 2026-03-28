"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useTheme } from "./ThemeContext";
import {
  FaTimes,
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaShieldAlt,
  FaCheckCircle,
} from "react-icons/fa";

interface AuthModalProps {
  onClose: () => void;
}

type Tab = "login" | "signup";

export default function AuthModal({ onClose }: AuthModalProps) {
  const theme = useTheme();
  const isDark = theme === "dark";
  const emailRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isCommunityWatcher, setIsCommunityWatcher] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, [tab]);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setError(null);
    setSuccess(null);
  };

  const switchTab = (newTab: Tab) => {
    setTab(newTab);
    resetForm();
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    onClose();
  };

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          is_community_watcher: isCommunityWatcher,
        },
      },
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    setSuccess("Check your email to confirm your account.");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === "login") handleLogin();
    else handleSignUp();
  };

  const inputCls = `w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm outline-none transition-colors ${
    isDark
      ? "border-neutral-700 bg-neutral-800 text-white placeholder-neutral-500 focus:border-[#f5c542]/50"
      : "border-neutral-300 bg-neutral-50 text-neutral-900 placeholder-neutral-400 focus:border-[#b8860b]/50"
  }`;

  const iconCls = `absolute left-3 top-1/2 -translate-y-1/2 ${
    isDark ? "text-neutral-500" : "text-neutral-400"
  }`;

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center sm:items-center">
      <div
        className={`fixed inset-0 ${isDark ? "bg-black/60" : "bg-black/30"} backdrop-blur-sm`}
        onClick={onClose}
      />

      <div
        className={`relative z-10 w-full max-w-md rounded-t-2xl border sm:rounded-2xl sm:mb-0 mb-0 animate-slide-up ${
          isDark
            ? "border-neutral-800 bg-[#0f0f0f]"
            : "border-neutral-200 bg-white"
        }`}
        style={{
          boxShadow: isDark
            ? "0 -4px 30px rgba(0,0,0,0.5)"
            : "0 -4px 30px rgba(0,0,0,0.1)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Drag handle (mobile) */}
        <div
          className={`mx-auto mt-3 mb-2 h-1 w-10 rounded-full sm:hidden ${
            isDark ? "bg-neutral-700" : "bg-neutral-300"
          }`}
        />

        <div className="px-5 pb-6 pt-2 sm:pt-5">
          {/* Header */}
          <div className="mb-5 flex items-center justify-between">
            <h2
              className={`text-lg font-bold ${
                isDark ? "text-white" : "text-neutral-900"
              }`}
            >
              {tab === "login" ? "Welcome back" : "Create account"}
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

          {/* Tab switcher */}
          <div
            className={`mb-5 flex rounded-xl p-1 ${
              isDark ? "bg-neutral-800/60" : "bg-neutral-100"
            }`}
          >
            {(["login", "signup"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                  tab === t
                    ? isDark
                      ? "bg-neutral-700 text-white shadow-sm"
                      : "bg-white text-neutral-900 shadow-sm"
                    : isDark
                      ? "text-neutral-500 hover:text-neutral-300"
                      : "text-neutral-400 hover:text-neutral-600"
                }`}
              >
                {t === "login" ? "Log In" : "Sign Up"}
              </button>
            ))}
          </div>

          {/* Success message */}
          {success && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-green-500/30 bg-green-950/30 p-3">
              <FaCheckCircle className="mt-0.5 shrink-0 text-green-400" size={14} />
              <p className="text-xs leading-relaxed text-green-300">{success}</p>
            </div>
          )}

          {/* Form */}
          {!success && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {/* Email */}
              <div className="relative">
                <FaEnvelope size={13} className={iconCls} />
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className={inputCls}
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div className="relative">
                <FaLock size={13} className={iconCls} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className={`${inputCls} pr-10`}
                  autoComplete={tab === "login" ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${
                    isDark ? "text-neutral-500 hover:text-neutral-300" : "text-neutral-400 hover:text-neutral-600"
                  }`}
                >
                  {showPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                </button>
              </div>

              {/* Confirm Password (signup only) */}
              {tab === "signup" && (
                <>
                  <div className="relative">
                    <FaLock size={13} className={iconCls} />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      className={inputCls}
                      autoComplete="new-password"
                    />
                  </div>

                  {/* Community Watcher toggle */}
                  <button
                    type="button"
                    onClick={() => setIsCommunityWatcher((v) => !v)}
                    className={`mt-1 flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all ${
                      isCommunityWatcher
                        ? isDark
                          ? "border-[#f5c542]/40 bg-[#f5c542]/5"
                          : "border-[#b8860b]/40 bg-[#b8860b]/5"
                        : isDark
                          ? "border-neutral-800 bg-neutral-900/30 hover:border-neutral-700"
                          : "border-neutral-200 bg-neutral-50 hover:border-neutral-300"
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                        isCommunityWatcher
                          ? isDark
                            ? "border-[#f5c542] bg-[#f5c542] text-black"
                            : "border-[#b8860b] bg-[#b8860b] text-white"
                          : isDark
                            ? "border-neutral-600 bg-neutral-800"
                            : "border-neutral-300 bg-white"
                      }`}
                    >
                      {isCommunityWatcher && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M2.5 6L5 8.5L9.5 3.5"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <FaShieldAlt
                          size={11}
                          className={
                            isCommunityWatcher
                              ? isDark
                                ? "text-[#f5c542]"
                                : "text-[#b8860b]"
                              : isDark
                                ? "text-neutral-500"
                                : "text-neutral-400"
                          }
                        />
                        <span
                          className={`text-sm font-semibold ${
                            isCommunityWatcher
                              ? isDark
                                ? "text-[#f5c542]"
                                : "text-[#b8860b]"
                              : isDark
                                ? "text-neutral-300"
                                : "text-neutral-700"
                          }`}
                        >
                          Community Watcher
                        </span>
                      </div>
                      <p
                        className={`mt-1 text-[11px] leading-relaxed ${
                          isDark ? "text-neutral-500" : "text-neutral-400"
                        }`}
                      >
                        Get access to a dashboard with reports and statistics
                        scoped to your municipality.
                      </p>
                    </div>
                  </button>
                </>
              )}

              {/* Error */}
              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className={`mt-1 w-full rounded-xl py-2.5 text-sm font-semibold transition-all disabled:opacity-50 ${
                  isDark
                    ? "bg-[#f5c542] text-black hover:bg-[#e0b23a]"
                    : "bg-[#b8860b] text-white hover:bg-[#a0750a]"
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {tab === "login" ? "Logging in..." : "Creating account..."}
                  </span>
                ) : tab === "login" ? (
                  "Log In"
                ) : (
                  "Create Account"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

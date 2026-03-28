"use client";

import { useState } from "react";
import { FaTimes, FaEnvelope, FaLock, FaUser } from "react-icons/fa";
import { useTheme } from "./ThemeContext";
import { signIn, signUp } from "../lib/auth";

interface AuthModalProps {
  onClose: () => void;
  /** Optional message shown above the form, e.g. "Sign in to report an issue" */
  prompt?: string;
}

export default function AuthModal({ onClose, prompt }: AuthModalProps) {
  const theme = useTheme();
  const isDark = theme === "dark";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        await signUp(email, password, displayName);
        setSignupSuccess(true);
      } else {
        await signIn(email, password);
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = `w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm outline-none transition-colors ${
    isDark
      ? "border-neutral-700 bg-neutral-800 text-white placeholder-neutral-500 focus:border-[#f5c542]/50"
      : "border-neutral-300 bg-neutral-50 text-neutral-900 placeholder-neutral-400 focus:border-[#b8860b]/50"
  }`;

  const labelCls = `text-[11px] font-medium uppercase tracking-wider mb-1.5 block ${
    isDark ? "text-neutral-500" : "text-neutral-400"
  }`;

  const iconCls = `absolute left-3 top-1/2 -translate-y-1/2 ${
    isDark ? "text-neutral-500" : "text-neutral-400"
  }`;

  // Success state after signup
  if (signupSuccess) {
    return (
      <div className="fixed inset-0 z-[1300] flex items-center justify-center md:items-center">
        <div
          className={`fixed inset-0 ${isDark ? "bg-black/60" : "bg-black/30"}`}
          onClick={onClose}
        />
        <div
          className={`relative z-10 w-full max-w-sm mx-4 rounded-2xl border p-6 text-center ${
            isDark
              ? "border-neutral-800 bg-[#0f0f0f]"
              : "border-neutral-200 bg-white"
          }`}
          style={{
            boxShadow: isDark
              ? "0 8px 40px rgba(0,0,0,0.6)"
              : "0 8px 40px rgba(0,0,0,0.12)",
          }}
        >
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: isDark ? "#f5c54215" : "#f5c54220" }}
          >
            <FaEnvelope size={18} className="text-[#f5c542]" />
          </div>
          <h2
            className={`text-lg font-bold ${isDark ? "text-white" : "text-neutral-900"}`}
          >
            Check your email
          </h2>
          <p
            className={`mt-2 text-sm leading-relaxed ${
              isDark ? "text-neutral-400" : "text-neutral-500"
            }`}
          >
            We sent a confirmation link to{" "}
            <span className={isDark ? "text-neutral-200" : "text-neutral-700"}>
              {email}
            </span>
            . Click it to activate your account.
          </p>
          <button
            onClick={onClose}
            className={`mt-5 w-full rounded-xl py-2.5 text-sm font-semibold transition-colors ${
              isDark
                ? "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[1300] flex items-end justify-center md:items-center">
      <div
        className={`fixed inset-0 ${isDark ? "bg-black/60" : "bg-black/30"}`}
        onClick={onClose}
      />

      <div
        className={`relative z-10 w-full max-w-sm rounded-t-2xl border animate-slide-up md:rounded-2xl md:mx-4 ${
          isDark
            ? "border-neutral-800 bg-[#0f0f0f]"
            : "border-neutral-200 bg-white"
        }`}
        style={{
          boxShadow: isDark
            ? "0 -4px 30px rgba(0,0,0,0.5)"
            : "0 -4px 30px rgba(0,0,0,0.1)",
        }}
      >
        {/* Drag handle (mobile) */}
        <div
          className={`mx-auto mt-3 mb-1 h-1 w-10 rounded-full md:hidden ${
            isDark ? "bg-neutral-700" : "bg-neutral-300"
          }`}
        />

        <div className="px-5 pb-6 pt-4">
          {/* Header */}
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h2
                className={`text-base font-bold ${
                  isDark ? "text-white" : "text-neutral-900"
                }`}
              >
                {mode === "signin" ? "Welcome back" : "Create account"}
              </h2>
              {prompt && (
                <p
                  className={`mt-1 text-xs ${
                    isDark ? "text-neutral-500" : "text-neutral-400"
                  }`}
                >
                  {prompt}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                isDark
                  ? "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white"
                  : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-800"
              }`}
            >
              <FaTimes size={13} />
            </button>
          </div>

          {/* Error */}
          {error && (
            <div
              className={`mb-4 rounded-lg border px-3 py-2 text-xs ${
                isDark
                  ? "border-red-900/40 bg-red-950/30 text-red-400"
                  : "border-red-200 bg-red-50 text-red-600"
              }`}
            >
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === "signup" && (
              <div>
                <label className={labelCls}>Display Name</label>
                <div className="relative">
                  <FaUser size={13} className={iconCls} />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    className={inputCls}
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className={labelCls}>Email</label>
              <div className="relative">
                <FaEnvelope size={13} className={iconCls} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputCls}
                  required
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Password</label>
              <div className="relative">
                <FaLock size={13} className={iconCls} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "signup" ? "Min. 6 characters" : "Your password"}
                  className={inputCls}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full rounded-xl py-2.5 text-sm font-semibold transition-all disabled:opacity-50"
              style={{
                backgroundColor: isDark ? "#f5c542" : "#b8860b",
                color: isDark ? "#0a0a0a" : "#ffffff",
              }}
            >
              {loading
                ? "..."
                : mode === "signin"
                  ? "Sign In"
                  : "Create Account"}
            </button>
          </form>

          {/* Toggle mode */}
          <p
            className={`mt-4 text-center text-xs ${
              isDark ? "text-neutral-500" : "text-neutral-400"
            }`}
          >
            {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError("");
              }}
              className="font-semibold transition-colors"
              style={{ color: isDark ? "#f5c542" : "#b8860b" }}
            >
              {mode === "signin" ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

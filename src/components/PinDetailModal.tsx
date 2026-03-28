"use client";

import {
  FaTimes,
  FaCheckCircle,
  FaClock,
} from "react-icons/fa";
import type { Pin } from "./MapView";
import { getCategoryById } from "./categories";
import CategoryIcon from "./CategoryIcon";
import { useTheme } from "./ThemeContext";

interface PinDetailModalProps {
  pin: Pin;
  onClose: () => void;
  onResolve: (pinId: string, comment: string, proofPhotoDataUrl: string) => void;
  onPinUpdate?: (updated: Pin) => void;
}

export default function PinDetailModal({
  pin,
  onClose,
}: PinDetailModalProps) {
  const theme = useTheme();
  const isDark = theme === "dark";
  const category = getCategoryById(pin.categoryId);

  const isResolved = pin.status === "resolved";
  const isPending = pin.status === "pending_resolved";

  if (!category) return null;

  const timeAgo = getTimeAgo(pin.createdAt);

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
        <div
          className={`mx-auto mt-3 mb-3 h-1 w-10 rounded-full ${
            isDark ? "bg-neutral-700" : "bg-neutral-300"
          }`}
        />

        <div className="px-4 pb-6">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{
                  background: `${
                    isResolved
                      ? "#22c55e"
                      : isPending
                        ? "#f59e0b"
                        : category.color
                  }20`,
                }}
              >
                {isResolved ? (
                  <FaCheckCircle size={16} color="#22c55e" />
                ) : isPending ? (
                  <FaClock size={16} color="#f59e0b" />
                ) : (
                  <CategoryIcon
                    iconName={category.icon}
                    color={category.color}
                    size={16}
                  />
                )}
              </div>
              <div>
                <h2
                  className={`text-base font-semibold leading-tight ${
                    isDark ? "text-white" : "text-neutral-900"
                  }`}
                >
                  {category.label}
                </h2>
                <span
                  className={`text-xs ${
                    isDark ? "text-neutral-500" : "text-neutral-400"
                  }`}
                >
                  {timeAgo}
                  {isResolved && " · Resolved"}
                  {isPending && " · Pending Resolution"}
                </span>
              </div>
            </div>
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

          {/* Photo */}
          <img
            src={pin.photoUrl}
            alt={category.label}
            className="mb-4 w-full rounded-xl object-cover"
            style={{ maxHeight: "250px" }}
          />

          {/* Category badge row */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2.5 py-1 text-xs font-medium"
              style={{
                background: `${category.color}18`,
                color: category.color,
              }}
            >
              {category.group}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs ${
                isDark
                  ? "bg-neutral-800 text-neutral-400"
                  : "bg-neutral-100 text-neutral-500"
              }`}
            >
              SDG {category.sdg}
            </span>
            {isResolved && (
              <span className="rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-medium text-green-500">
                Resolved
              </span>
            )}
            {isPending && (
              <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-500">
                Pending
              </span>
            )}
          </div>

          {/* Description */}
          <p
            className={`text-sm leading-relaxed ${
              isDark ? "text-neutral-300" : "text-neutral-700"
            }`}
          >
            {pin.description}
          </p>

          {/* Resolved proof section */}
          {isResolved && pin.resolvedPhotoUrl && (
            <div
              className={`mt-4 rounded-xl border p-3 ${
                isDark
                  ? "border-green-900/50 bg-green-950/30"
                  : "border-green-200 bg-green-50"
              }`}
            >
              <p
                className={`mb-2 text-xs font-semibold ${
                  isDark ? "text-green-400" : "text-green-700"
                }`}
              >
                Resolution Proof
              </p>
              <img
                src={pin.resolvedPhotoUrl}
                alt="Resolution proof"
                className="mb-2 w-full rounded-lg object-cover"
                style={{ maxHeight: "180px" }}
              />
              {pin.resolvedComment && (
                <p
                  className={`text-sm ${
                    isDark ? "text-green-300/80" : "text-green-800"
                  }`}
                >
                  {pin.resolvedComment}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

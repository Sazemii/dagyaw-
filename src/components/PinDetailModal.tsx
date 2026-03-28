"use client";

import { FaTimes } from "react-icons/fa";
import type { Pin } from "./MapView";
import { getCategoryById } from "./categories";
import CategoryIcon from "./CategoryIcon";
import { useTheme } from "./ThemeContext";

interface PinDetailModalProps {
  pin: Pin;
  onClose: () => void;
}

export default function PinDetailModal({ pin, onClose }: PinDetailModalProps) {
  const theme = useTheme();
  const isDark = theme === "dark";
  const category = getCategoryById(pin.categoryId);

  if (!category) return null;

  const timeAgo = getTimeAgo(pin.createdAt);

  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 ${isDark ? "bg-black/60" : "bg-black/30"}`}
        onClick={onClose}
      />

      {/* Detail sheet */}
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
            <div className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ background: `${category.color}20` }}
              >
                <CategoryIcon
                  iconName={category.icon}
                  color={category.color}
                  size={16}
                />
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
            src={pin.photoDataUrl}
            alt={category.label}
            className="mb-4 w-full rounded-xl object-cover"
            style={{ maxHeight: "250px" }}
          />

          {/* Category badge */}
          <div className="mb-3 flex items-center gap-2">
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
          </div>

          {/* Description */}
          <p
            className={`text-sm leading-relaxed ${
              isDark ? "text-neutral-300" : "text-neutral-700"
            }`}
          >
            {pin.description}
          </p>
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

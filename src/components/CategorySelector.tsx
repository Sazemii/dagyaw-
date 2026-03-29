"use client";

import { useState } from "react";
import { CATEGORIES, CATEGORY_GROUPS, type Category } from "./categories";
import CategoryIcon from "./CategoryIcon";
import { FaTimes } from "react-icons/fa";
import { useTheme } from "./ThemeContext";

interface CategorySelectorProps {
  onSelect: (category: Category) => void;
  onClose: () => void;
  selectedId?: string;
}

export default function CategorySelector({
  onSelect,
  onClose,
  selectedId,
}: CategorySelectorProps) {
  const [activeGroup, setActiveGroup] = useState<string>(CATEGORY_GROUPS[0]);
  const theme = useTheme();
  const isDark = theme === "dark";
  const visibleCategories = CATEGORIES.filter(
    (category) => category.group === activeGroup,
  );

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div
        className={`fixed inset-0 ${isDark ? "bg-black/60" : "bg-black/25"}`}
        onClick={onClose}
      />

      <div
        className={`relative z-10 w-[min(92vw,30rem)] overflow-y-auto rounded-3xl border px-6 pb-6 pt-6 sm:px-7 sm:pb-7 sm:pt-7 ${
          isDark
            ? "border-white/[0.08] bg-[#161616]"
            : "border-black/[0.06] bg-[#fafafa]"
        }`}
        style={{
          boxShadow: isDark
            ? "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)"
            : "0 24px 80px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.02)",
          maxHeight: "min(36rem, calc(100vh - 2rem))",
        }}
      >
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-3">
            <h2
              className={`text-lg font-bold tracking-tight ${
                isDark ? "text-white" : "text-neutral-900"
              }`}
            >
              What&apos;s the issue?
            </h2>
            <button
              onClick={onClose}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                isDark
                  ? "text-neutral-500 hover:bg-white/[0.06] hover:text-neutral-300"
                  : "text-neutral-400 hover:bg-black/[0.05] hover:text-neutral-600"
              }`}
            >
              <FaTimes size={13} />
            </button>
          </div>

          {/* Group tabs */}
          <div className="mt-5 flex flex-wrap gap-2">
            {CATEGORY_GROUPS.map((group) => (
              <button
                key={group}
                onClick={() => setActiveGroup(group)}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-[13px] font-medium transition-all ${
                  activeGroup === group
                    ? isDark
                      ? "border-[#f5c542]/30 bg-[#f5c542]/10 text-[#f5c542]"
                      : "border-[#b8860b]/25 bg-[#b8860b]/8 text-[#8a6d08]"
                    : isDark
                      ? "border-white/[0.08] bg-white/[0.03] text-neutral-400 hover:border-white/[0.14] hover:text-neutral-200"
                      : "border-black/[0.07] bg-black/[0.02] text-neutral-500 hover:border-black/[0.12] hover:text-neutral-700"
                }`}
              >
                {group}
              </button>
            ))}
          </div>
        </div>

        {/* Category list */}
        <div className="flex flex-col gap-1.5">
          {visibleCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => onSelect(category)}
              className={`group flex items-center gap-3.5 rounded-2xl px-3.5 py-3 text-left transition-all ${
                selectedId === category.id
                  ? isDark
                    ? "bg-[#f5c542]/[0.08]"
                    : "bg-[#b8860b]/[0.06]"
                  : isDark
                    ? "hover:bg-white/[0.04]"
                    : "hover:bg-black/[0.03]"
              }`}
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: `${category.color}18` }}
              >
                <CategoryIcon
                  iconName={category.icon}
                  color={category.color}
                  size={18}
                />
              </div>
              <span
                className={`min-w-0 flex-1 text-[13px] font-medium ${
                  isDark ? "text-neutral-100" : "text-neutral-800"
                }`}
              >
                {category.label}
              </span>
              <div
                className={`text-[11px] ${
                  isDark ? "text-neutral-600" : "text-neutral-300"
                }`}
              >
                ›
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

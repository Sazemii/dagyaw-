/**
 * ==================================================================================
 * Team Smart Dito sa Globe (SDG)
 * BLUE HACKS 2026: GENERATIVE AI DISCLOSURE
 * * This code was created with the assistance of AI tools such as:
 * - Claude 4.6 Opus (Anthropic)
 * - GPT 5.3 - Codex (OpenAI)
 * - Claude Gemini 3.1 Pro (Google)
 * * Purpose: This AI was utilized for code generation (logic and functions),
 * brainstorming, code refinement (debugging), and performance optimization.
 * ==================================================================================
 */

"use client";

import { useRef, useState, useCallback } from "react";
import { FaCamera, FaTimes, FaCheck } from "react-icons/fa";
import type { Category } from "./categories";
import CategoryIcon from "./CategoryIcon";
import { useTheme } from "./ThemeContext";

interface ReportFormProps {
  category: Category;
  onSubmit: (description: string, photoDataUrl: string) => void;
  onCancel: () => void;
}

const MAX_CHARS = 1000;

export default function ReportForm({
  category,
  onSubmit,
  onCancel,
}: ReportFormProps) {
  const theme = useTheme();
  const isDark = theme === "dark";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCapture = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    },
    [],
  );

  const handleSubmit = useCallback(() => {
    if (!photo || !description.trim() || isSubmitting) return;
    setIsSubmitting(true);
    onSubmit(description.trim(), photo);
  }, [photo, description, onSubmit, isSubmitting]);

  const canSubmit = !!photo && description.trim().length > 0 && !isSubmitting;

  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 ${isDark ? "bg-black/60" : "bg-black/30"}`}
        onClick={onCancel}
      />

      {/* Form sheet */}
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
              <CategoryIcon
                iconName={category.icon}
                color={category.color}
                size={18}
              />
              <h2
                className={`text-base font-semibold ${
                  isDark ? "text-white" : "text-neutral-900"
                }`}
              >
                Report {category.label}
              </h2>
            </div>
            <button
              onClick={onCancel}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                isDark
                  ? "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white"
                  : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-800"
              }`}
            >
              <FaTimes size={14} />
            </button>
          </div>

          {/* Camera capture */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCapture}
            className="hidden"
          />

          {!photo ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`mb-4 flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-10 transition-colors ${
                isDark
                  ? "border-neutral-700 bg-neutral-900/50 text-neutral-400 hover:border-neutral-500 hover:text-neutral-200"
                  : "border-neutral-300 bg-neutral-50 text-neutral-500 hover:border-neutral-400 hover:text-neutral-700"
              }`}
            >
              <FaCamera size={28} />
              <span className="text-sm font-medium">Take a Photo</span>
              <span
                className={`text-xs ${
                  isDark ? "text-neutral-600" : "text-neutral-400"
                }`}
              >
                Camera required for verification
              </span>
            </button>
          ) : (
            <div className="relative mb-4">
              <img
                src={photo}
                alt="Captured issue"
                className="w-full rounded-xl object-cover"
                style={{ maxHeight: "200px" }}
              />
              <button
                onClick={() => {
                  setPhoto(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
              >
                <FaTimes size={12} />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur-sm transition-colors hover:bg-black/80"
              >
                <FaCamera size={10} />
                Retake
              </button>
            </div>
          )}

          {/* Description */}
          <div className="mb-4">
            <label
              className={`mb-1.5 block text-sm font-medium ${
                isDark ? "text-neutral-300" : "text-neutral-700"
              }`}
            >
              Describe the issue
            </label>
            <textarea
              value={description}
              onChange={(e) => {
                if (e.target.value.length <= MAX_CHARS) {
                  setDescription(e.target.value);
                }
              }}
              maxLength={MAX_CHARS}
              rows={3}
              placeholder="What's happening here? Be specific so it can be addressed..."
              className={`w-full resize-none rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors ${
                isDark
                  ? "border-neutral-700 bg-neutral-900 text-white placeholder-neutral-600 focus:border-neutral-500"
                  : "border-neutral-300 bg-white text-neutral-900 placeholder-neutral-400 focus:border-neutral-400"
              }`}
            />
            <div
              className={`mt-1 text-right text-xs ${
                description.length > 900
                  ? "text-red-400"
                  : isDark
                    ? "text-neutral-600"
                    : "text-neutral-400"
              }`}
            >
              {description.length}/{MAX_CHARS}
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all ${
              canSubmit
                ? isDark
                  ? "bg-[#f5c542] text-black hover:bg-[#e5b732]"
                  : "bg-[#b8860b] text-white hover:bg-[#a0750a]"
                : isDark
                  ? "cursor-not-allowed bg-neutral-800 text-neutral-600"
                  : "cursor-not-allowed bg-neutral-200 text-neutral-400"
            }`}
          >
            <FaCheck size={12} />
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
}

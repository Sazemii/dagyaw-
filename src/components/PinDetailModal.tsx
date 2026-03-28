"use client";

import { useEffect, useState, useCallback } from "react";
import {
  FaTimes,
  FaCheckCircle,
  FaThumbsUp,
  FaThumbsDown,
  FaClock,
  FaHandsHelping,
  FaGavel,
} from "react-icons/fa";
import type { Pin } from "./MapView";
import { getCategoryById } from "./categories";
import CategoryIcon from "./CategoryIcon";
import { useTheme } from "./ThemeContext";
import { useAuth } from "./AuthContext";
import {
  markPendingResolved,
  requestCommunityResolve,
  approveCommunityResolve,
  rejectCommunityResolve,
  castVote,
  getVotes,
  type VoteTally,
} from "../lib/pins";

interface PinDetailModalProps {
  pin: Pin;
  onClose: () => void;
  onResolve: (pinId: string, comment: string, proofPhotoDataUrl: string) => void;
  /** Called when pin state changes (pending resolve, vote, community resolve, etc.) */
  onPinUpdate?: (updated: Pin) => void;
}

export default function PinDetailModal({
  pin,
  onClose,
  onPinUpdate,
}: PinDetailModalProps) {
  const theme = useTheme();
  const isDark = theme === "dark";
  const { user, profile } = useAuth();
  const category = getCategoryById(pin.categoryId);

  const [loading, setLoading] = useState(false);
  const [votes, setVotes] = useState<VoteTally | null>(null);

  const isLoggedIn = !!user;
  const isInstitutional =
    (profile?.role === "institutional" || profile?.role === "admin") &&
    profile?.roleStatus === "active";
  const isResolved = pin.status === "resolved";
  const isPending = pin.status === "pending_resolved";
  const hasCommunityRequest = pin.communityResolveRequested && pin.status === "active";

  // Load votes for pending pins
  useEffect(() => {
    if (isPending) {
      getVotes(pin.id, user?.id).then(setVotes).catch(() => {});
    }
  }, [isPending, pin.id, user?.id]);

  // Time remaining for pending resolved
  const timeRemaining = isPending && pin.pendingResolvedAt
    ? getTimeRemaining(pin.pendingResolvedAt)
    : null;

  const handleMarkPending = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const updated = await markPendingResolved(pin.id, user.id);
      onPinUpdate?.(updated);
    } catch (err) {
      console.error("Failed to mark pending resolved:", err);
      alert("Failed to mark as pending resolved.");
    } finally {
      setLoading(false);
    }
  }, [pin.id, user, onPinUpdate]);

  const handleCommunityResolve = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const updated = await requestCommunityResolve(pin.id, user.id);
      onPinUpdate?.(updated);
    } catch (err) {
      console.error("Failed to request community resolve:", err);
      alert("Failed to submit community resolve request.");
    } finally {
      setLoading(false);
    }
  }, [pin.id, user, onPinUpdate]);

  const handleApproveCommunity = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const updated = await approveCommunityResolve(pin.id, user.id);
      onPinUpdate?.(updated);
    } catch (err) {
      console.error("Failed to approve community resolve:", err);
      alert("Failed to approve.");
    } finally {
      setLoading(false);
    }
  }, [pin.id, user, onPinUpdate]);

  const handleRejectCommunity = useCallback(async () => {
    setLoading(true);
    try {
      const updated = await rejectCommunityResolve(pin.id);
      onPinUpdate?.(updated);
    } catch (err) {
      console.error("Failed to reject community resolve:", err);
      alert("Failed to reject.");
    } finally {
      setLoading(false);
    }
  }, [pin.id, onPinUpdate]);

  const handleVote = useCallback(
    async (vote: "up" | "down") => {
      if (!user) return;
      try {
        await castVote(pin.id, user.id, vote);
        const updated = await getVotes(pin.id, user.id);
        setVotes(updated);
      } catch (err) {
        console.error("Failed to vote:", err);
      }
    },
    [pin.id, user]
  );

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
            {hasCommunityRequest && (
              <span className="rounded-full bg-blue-500/15 px-2.5 py-1 text-xs font-medium text-blue-500">
                Community Resolve Requested
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

          {/* ===== PENDING RESOLVED: Vote UI ===== */}
          {isPending && (
            <div
              className={`mt-4 rounded-xl border p-4 ${
                isDark
                  ? "border-amber-900/40 bg-amber-950/20"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              {/* Time remaining */}
              {timeRemaining && (
                <div className="mb-3 flex items-center gap-2">
                  <FaClock
                    size={12}
                    className={isDark ? "text-amber-400" : "text-amber-600"}
                  />
                  <span
                    className={`text-xs font-medium ${
                      isDark ? "text-amber-400" : "text-amber-700"
                    }`}
                  >
                    {timeRemaining} remaining in vote window
                  </span>
                </div>
              )}

              {/* Vote tally */}
              {votes && (
                <div className="mb-3 flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <FaThumbsUp
                      size={12}
                      className={isDark ? "text-green-400" : "text-green-600"}
                    />
                    <span
                      className={`text-sm font-semibold ${
                        isDark ? "text-green-400" : "text-green-700"
                      }`}
                    >
                      {votes.up}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FaThumbsDown
                      size={12}
                      className={isDark ? "text-red-400" : "text-red-600"}
                    />
                    <span
                      className={`text-sm font-semibold ${
                        isDark ? "text-red-400" : "text-red-700"
                      }`}
                    >
                      {votes.down}
                    </span>
                  </div>
                  {votes.total > 0 && (
                    <span
                      className={`text-xs ${
                        isDark ? "text-neutral-500" : "text-neutral-400"
                      }`}
                    >
                      {Math.round((votes.up / votes.total) * 100)}% upvote
                    </span>
                  )}
                </div>
              )}

              {/* Vote buttons */}
              {isLoggedIn && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleVote("up")}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
                      votes?.userVote === "up"
                        ? "bg-green-600 text-white"
                        : isDark
                          ? "bg-neutral-800 text-neutral-300 hover:bg-green-900/40 hover:text-green-400"
                          : "bg-neutral-200 text-neutral-600 hover:bg-green-100 hover:text-green-700"
                    }`}
                  >
                    <FaThumbsUp size={12} />
                    Upvote
                  </button>
                  <button
                    onClick={() => handleVote("down")}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
                      votes?.userVote === "down"
                        ? "bg-red-600 text-white"
                        : isDark
                          ? "bg-neutral-800 text-neutral-300 hover:bg-red-900/40 hover:text-red-400"
                          : "bg-neutral-200 text-neutral-600 hover:bg-red-100 hover:text-red-700"
                    }`}
                  >
                    <FaThumbsDown size={12} />
                    Downvote
                  </button>
                </div>
              )}

              {!isLoggedIn && (
                <p
                  className={`text-xs ${
                    isDark ? "text-neutral-500" : "text-neutral-400"
                  }`}
                >
                  Sign in to vote on this resolution.
                </p>
              )}
            </div>
          )}

          {/* ===== ACTIVE PIN: Action buttons ===== */}
          {pin.status === "active" && !hasCommunityRequest && (
            <div className="mt-4 flex flex-col gap-2">
              {/* Institutional: Mark Pending Resolved */}
              {isInstitutional && (
                <button
                  onClick={handleMarkPending}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all bg-amber-500 text-white hover:bg-amber-400 disabled:opacity-50"
                >
                  <FaClock size={12} />
                  {loading ? "Submitting..." : "Mark Pending Resolved"}
                </button>
              )}

              {/* Regular user: Community Resolve */}
              {isLoggedIn && !isInstitutional && (
                <button
                  onClick={handleCommunityResolve}
                  disabled={loading}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all disabled:opacity-50 ${
                    isDark
                      ? "bg-blue-600 text-white hover:bg-blue-500"
                      : "bg-blue-600 text-white hover:bg-blue-500"
                  }`}
                >
                  <FaHandsHelping size={14} />
                  {loading ? "Submitting..." : "Request Community Resolve"}
                </button>
              )}
            </div>
          )}

          {/* ===== COMMUNITY RESOLVE REQUESTED: Approval UI for institutional ===== */}
          {hasCommunityRequest && (
            <div
              className={`mt-4 rounded-xl border p-4 ${
                isDark
                  ? "border-blue-900/40 bg-blue-950/20"
                  : "border-blue-200 bg-blue-50"
              }`}
            >
              <div className="mb-3 flex items-center gap-2">
                <FaHandsHelping
                  size={13}
                  className={isDark ? "text-blue-400" : "text-blue-600"}
                />
                <span
                  className={`text-xs font-medium ${
                    isDark ? "text-blue-400" : "text-blue-700"
                  }`}
                >
                  A community member has flagged this as resolved.
                </span>
              </div>

              {isInstitutional ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleApproveCommunity}
                    disabled={loading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all bg-green-600 text-white hover:bg-green-500 disabled:opacity-50"
                  >
                    <FaCheckCircle size={12} />
                    {loading ? "..." : "Approve"}
                  </button>
                  <button
                    onClick={handleRejectCommunity}
                    disabled={loading}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all disabled:opacity-50 ${
                      isDark
                        ? "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                        : "bg-neutral-200 text-neutral-600 hover:bg-neutral-300"
                    }`}
                  >
                    <FaGavel size={12} />
                    {loading ? "..." : "Reject"}
                  </button>
                </div>
              ) : (
                <p
                  className={`text-xs ${
                    isDark ? "text-blue-300/60" : "text-blue-600/70"
                  }`}
                >
                  Waiting for a municipality watcher to review this request.
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

function getTimeRemaining(pendingAt: string): string | null {
  const deadline = new Date(pendingAt);
  deadline.setDate(deadline.getDate() + 3);
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  if (diffMs <= 0) return "Voting ended";
  const hours = Math.floor(diffMs / 3600000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  const mins = Math.floor((diffMs % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}

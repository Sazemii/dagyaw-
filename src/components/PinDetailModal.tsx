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

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FaTimes,
  FaCheckCircle,
  FaClock,
  FaCamera,
  FaThumbsUp,
  FaThumbsDown,
  FaShieldAlt,
  FaHandsHelping,
  FaReply,
  FaComment,
} from "react-icons/fa";
import type { Pin } from "./MapView";
import { getCategoryById } from "./categories";
import CategoryIcon from "./CategoryIcon";
import { useTheme } from "./ThemeContext";
import { useAuth } from "./AuthContext";
import {
  markPendingResolution,
  requestCommunityResolution,
  approveCommunityResolution,
  castVote,
  fetchVotes,
  type VoteTally,
} from "../lib/pins";
import {
  fetchComments,
  createComment,
  fetchWatcherIdentity,
  type Comment,
} from "../lib/comments";

const MAX_COMMENT_LENGTH = 200;

interface PinDetailModalProps {
  pin: Pin;
  onClose: () => void;
  onResolve: (
    pinId: string,
    comment: string,
    proofPhotoDataUrl: string,
  ) => void;
  onPinUpdate?: (updated: Pin) => void;
}

export default function PinDetailModal({
  pin,
  onClose,
  onPinUpdate,
}: PinDetailModalProps) {
  const theme = useTheme();
  const isDark = theme === "dark";
  const { user, isCommunityWatcher } = useAuth();
  const category = getCategoryById(pin.categoryId);

  const isResolved = pin.status === "resolved";
  const isPending = pin.status === "pending_resolved";
  const isActive = pin.status === "active";

  const [showResolveForm, setShowResolveForm] = useState(false);
  const [proofPhoto, setProofPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [votes, setVotes] = useState<VoteTally | null>(null);
  const [votingLoading, setVotingLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // Watcher identity for pending resolution
  const [pendingWatcherName, setPendingWatcherName] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (isPending && user) {
      fetchVotes(pin.id, user.id).then(setVotes).catch(console.error);
    }
  }, [isPending, pin.id, user]);

  useEffect(() => {
    fetchComments(pin.id)
      .then(setComments)
      .catch(console.error)
      .finally(() => setCommentsLoading(false));
  }, [pin.id]);

  useEffect(() => {
    if (isPending && pin.pendingResolvedBy) {
      fetchWatcherIdentity(pin.pendingResolvedBy)
        .then(setPendingWatcherName)
        .catch(console.error);
    }
  }, [isPending, pin.pendingResolvedBy]);

  const handlePhotoCapture = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onloadend = () => setProofPhoto(reader.result as string);
      reader.readAsDataURL(file);
    },
    [],
  );

  const handleWatcherResolve = useCallback(async () => {
    if (!proofPhoto || !user) return;
    setSubmitting(true);
    try {
      const updated = await markPendingResolution(pin.id, proofPhoto, user.id);
      onPinUpdate?.(updated);
      setShowResolveForm(false);
      setProofPhoto(null);
    } catch (err) {
      console.error("Failed to mark pending resolution:", err);
      alert("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [proofPhoto, user, pin.id, onPinUpdate]);

  const handleCommunityResolve = useCallback(async () => {
    if (!proofPhoto || !user) return;
    setSubmitting(true);
    try {
      const updated = await requestCommunityResolution(
        pin.id,
        proofPhoto,
        user.id,
      );
      onPinUpdate?.(updated);
      setShowResolveForm(false);
      setProofPhoto(null);
    } catch (err) {
      console.error("Failed to request resolution:", err);
      alert("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [proofPhoto, user, pin.id, onPinUpdate]);

  const handleApprove = useCallback(async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const updated = await approveCommunityResolution(pin.id, user.id);
      onPinUpdate?.(updated);
    } catch (err) {
      console.error("Failed to approve resolution:", err);
      alert("Failed to approve. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [user, pin.id, onPinUpdate]);

  const handleVote = useCallback(
    async (vote: "up" | "down") => {
      if (!user) return;
      setVotingLoading(true);
      try {
        await castVote(pin.id, user.id, vote);
        const updated = await fetchVotes(pin.id, user.id);
        setVotes(updated);
      } catch (err) {
        console.error("Vote failed:", err);
      } finally {
        setVotingLoading(false);
      }
    },
    [user, pin.id],
  );

  const handleSubmitComment = useCallback(async () => {
    if (!user || !commentText.trim()) return;
    setCommentSubmitting(true);
    try {
      const userEmail = user.email ?? "";
      const newComment = await createComment({
        pinId: pin.id,
        userId: user.id,
        body: commentText.trim(),
        isWatcher: isCommunityWatcher,
        watcherDisplay: isCommunityWatcher
          ? userEmail || "Community Watcher"
          : undefined,
      });
      setComments((prev) => [...prev, newComment]);
      setCommentText("");
    } catch (err) {
      console.error("Comment failed:", err);
    } finally {
      setCommentSubmitting(false);
    }
  }, [user, commentText, pin.id, isCommunityWatcher]);

  const handleSubmitReply = useCallback(
    async (parentId: string) => {
      if (!user || !replyText.trim()) return;
      setCommentSubmitting(true);
      try {
        const userEmail = user.email ?? "";
        const newReply = await createComment({
          pinId: pin.id,
          userId: user.id,
          body: replyText.trim(),
          parentId,
          isWatcher: isCommunityWatcher,
          watcherDisplay: isCommunityWatcher
            ? userEmail || "Community Watcher"
            : undefined,
        });
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentId ? { ...c, replies: [...c.replies, newReply] } : c,
          ),
        );
        setReplyText("");
        setReplyingTo(null);
      } catch (err) {
        console.error("Reply failed:", err);
      } finally {
        setCommentSubmitting(false);
      }
    },
    [user, replyText, pin.id, isCommunityWatcher],
  );

  if (!category) return null;

  const timeAgo = getTimeAgo(pin.createdAt);

  const pendingDeadline = pin.pendingResolvedAt
    ? new Date(
        new Date(pin.pendingResolvedAt).getTime() + 3 * 24 * 60 * 60 * 1000,
      )
    : null;
  const timeRemaining = pendingDeadline
    ? getTimeRemaining(pendingDeadline)
    : null;

  const totalVotes = votes ? votes.up + votes.down : 0;
  const upPercent =
    totalVotes > 0 ? Math.round((votes!.up / totalVotes) * 100) : 0;

  const totalCommentCount = comments.reduce(
    (sum, c) => sum + 1 + c.replies.length,
    0,
  );

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
            {isActive && pin.communityResolveRequested && (
              <span className="rounded-full bg-blue-500/15 px-2.5 py-1 text-xs font-medium text-blue-400">
                Resolution Requested
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

          {/* Community resolution request banner (for watchers to approve) */}
          {isActive &&
            pin.communityResolveRequested &&
            pin.resolvedPhotoUrl && (
              <div
                className={`mt-4 rounded-xl border p-3 ${
                  isDark
                    ? "border-blue-900/50 bg-blue-950/30"
                    : "border-blue-200 bg-blue-50"
                }`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <FaHandsHelping
                    size={13}
                    className={isDark ? "text-blue-400" : "text-blue-600"}
                  />
                  <p
                    className={`text-xs font-semibold ${
                      isDark ? "text-blue-400" : "text-blue-700"
                    }`}
                  >
                    A community member submitted a fix
                  </p>
                </div>
                <img
                  src={pin.resolvedPhotoUrl}
                  alt="Resolution proof"
                  className="mb-3 w-full rounded-lg object-cover"
                  style={{ maxHeight: "180px" }}
                />
                {isCommunityWatcher && (
                  <button
                    onClick={handleApprove}
                    disabled={submitting}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all disabled:opacity-50 ${
                      isDark
                        ? "bg-[#f5c542] text-black hover:bg-[#e0b23a]"
                        : "bg-[#b8860b] text-white hover:bg-[#a0750a]"
                    }`}
                  >
                    <FaShieldAlt size={12} />
                    {submitting ? "Approving..." : "Approve & Start Voting"}
                  </button>
                )}
                {!isCommunityWatcher && (
                  <p
                    className={`text-xs text-center ${
                      isDark ? "text-blue-400/70" : "text-blue-600/70"
                    }`}
                  >
                    Awaiting Community Watcher approval
                  </p>
                )}
              </div>
            )}

          {/* Pending resolution: voting section */}
          {isPending && (
            <div
              className={`mt-4 rounded-xl border p-4 ${
                isDark
                  ? "border-amber-900/50 bg-amber-950/20"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <p
                  className={`text-xs font-semibold ${
                    isDark ? "text-amber-400" : "text-amber-700"
                  }`}
                >
                  Community Voting
                </p>
                {timeRemaining && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      isDark
                        ? "bg-amber-500/15 text-amber-400"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {timeRemaining}
                  </span>
                )}
              </div>

              {/* Watcher identity */}
              {pendingWatcherName && (
                <div
                  className={`mb-3 flex items-center gap-2 rounded-lg px-3 py-2 ${
                    isDark ? "bg-neutral-800/60" : "bg-white/80"
                  }`}
                >
                  <FaShieldAlt
                    size={11}
                    className={isDark ? "text-[#f5c542]" : "text-[#b8860b]"}
                  />
                  <p
                    className={`text-xs ${
                      isDark ? "text-neutral-300" : "text-neutral-600"
                    }`}
                  >
                    Moved to voting by{" "}
                    <span className="font-semibold">{pendingWatcherName}</span>
                  </p>
                </div>
              )}

              {pin.resolvedPhotoUrl && (
                <img
                  src={pin.resolvedPhotoUrl}
                  alt="Resolution proof"
                  className="mb-3 w-full rounded-lg object-cover"
                  style={{ maxHeight: "160px" }}
                />
              )}

              <p
                className={`mb-3 text-xs leading-relaxed ${
                  isDark ? "text-amber-300/70" : "text-amber-800/70"
                }`}
              >
                Does this look resolved? Vote to confirm or reject. Needs 67%
                approval after 3 days.
              </p>

              {/* Vote bar */}
              {votes && totalVotes > 0 && (
                <div className="mb-3">
                  <div className="mb-1 flex justify-between text-[10px] font-medium">
                    <span
                      className={isDark ? "text-green-400" : "text-green-600"}
                    >
                      {votes.up} upvote{votes.up !== 1 ? "s" : ""}
                    </span>
                    <span className={isDark ? "text-red-400" : "text-red-600"}>
                      {votes.down} downvote{votes.down !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div
                    className={`h-2 w-full overflow-hidden rounded-full ${
                      isDark ? "bg-neutral-800" : "bg-neutral-200"
                    }`}
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-400 transition-all"
                      style={{ width: `${upPercent}%` }}
                    />
                  </div>
                  <p
                    className={`mt-1 text-center text-[10px] ${
                      isDark ? "text-neutral-500" : "text-neutral-400"
                    }`}
                  >
                    {upPercent}% approval · {totalVotes} total vote
                    {totalVotes !== 1 ? "s" : ""}
                  </p>
                </div>
              )}

              {/* Vote buttons */}
              {user && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleVote("up")}
                    disabled={votingLoading}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all disabled:opacity-50 ${
                      votes?.userVote === "up"
                        ? "bg-green-500 text-white"
                        : isDark
                          ? "border border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20"
                          : "border border-green-500/30 bg-green-50 text-green-600 hover:bg-green-100"
                    }`}
                  >
                    <FaThumbsUp size={12} />
                    Looks Fixed
                  </button>
                  <button
                    onClick={() => handleVote("down")}
                    disabled={votingLoading}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all disabled:opacity-50 ${
                      votes?.userVote === "down"
                        ? "bg-red-500 text-white"
                        : isDark
                          ? "border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                          : "border border-red-500/30 bg-red-50 text-red-600 hover:bg-red-100"
                    }`}
                  >
                    <FaThumbsDown size={12} />
                    Not Fixed
                  </button>
                </div>
              )}

              {!user && (
                <p
                  className={`text-center text-xs ${
                    isDark ? "text-neutral-500" : "text-neutral-400"
                  }`}
                >
                  Sign in to vote on this resolution
                </p>
              )}
            </div>
          )}

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

          {/* Action buttons for active pins */}
          {isActive &&
            !pin.communityResolveRequested &&
            user &&
            !showResolveForm && (
              <div className="mt-4 flex gap-2">
                {isCommunityWatcher ? (
                  <button
                    onClick={() => setShowResolveForm(true)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                      isDark
                        ? "bg-[#f5c542] text-black hover:bg-[#e0b23a]"
                        : "bg-[#b8860b] text-white hover:bg-[#a0750a]"
                    }`}
                  >
                    <FaShieldAlt size={12} />I Fixed This
                  </button>
                ) : (
                  <button
                    onClick={() => setShowResolveForm(true)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                      isDark
                        ? "border border-[#f5c542]/30 bg-[#f5c542]/10 text-[#f5c542] hover:bg-[#f5c542]/20"
                        : "border border-[#b8860b]/30 bg-[#b8860b]/10 text-[#b8860b] hover:bg-[#b8860b]/20"
                    }`}
                  >
                    <FaHandsHelping size={12} />
                    Request Resolution
                  </button>
                )}
              </div>
            )}

          {/* Proof photo upload form */}
          {showResolveForm && (
            <div
              className={`mt-4 rounded-xl border p-4 ${
                isDark
                  ? "border-neutral-800 bg-neutral-900/50"
                  : "border-neutral-200 bg-neutral-50"
              }`}
            >
              <p
                className={`mb-3 text-sm font-semibold ${
                  isDark ? "text-white" : "text-neutral-900"
                }`}
              >
                {isCommunityWatcher
                  ? "Submit proof that this issue is fixed"
                  : "Submit proof of your fix for review"}
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
                className="hidden"
              />

              {proofPhoto ? (
                <div className="relative mb-3">
                  <img
                    src={proofPhoto}
                    alt="Proof preview"
                    className="w-full rounded-lg object-cover"
                    style={{ maxHeight: "180px" }}
                  />
                  <button
                    onClick={() => setProofPhoto(null)}
                    className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
                  >
                    <FaTimes size={10} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`mb-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 text-sm transition-colors ${
                    isDark
                      ? "border-neutral-700 text-neutral-400 hover:border-neutral-600 hover:text-neutral-300"
                      : "border-neutral-300 text-neutral-500 hover:border-neutral-400 hover:text-neutral-600"
                  }`}
                >
                  <FaCamera size={16} />
                  Take or Upload Photo
                </button>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowResolveForm(false);
                    setProofPhoto(null);
                  }}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
                    isDark
                      ? "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                      : "bg-neutral-200 text-neutral-600 hover:bg-neutral-300"
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={
                    isCommunityWatcher
                      ? handleWatcherResolve
                      : handleCommunityResolve
                  }
                  disabled={!proofPhoto || submitting}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all disabled:opacity-40 ${
                    isDark
                      ? "bg-[#f5c542] text-black hover:bg-[#e0b23a]"
                      : "bg-[#b8860b] text-white hover:bg-[#a0750a]"
                  }`}
                >
                  {submitting ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Submitting...
                    </>
                  ) : isCommunityWatcher ? (
                    "Submit & Start Voting"
                  ) : (
                    "Submit for Review"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ────────── Comments Section ────────── */}
          <div
            className={`mt-6 border-t pt-4 ${
              isDark ? "border-neutral-800" : "border-neutral-200"
            }`}
          >
            <div className="mb-4 flex items-center gap-2">
              <FaComment
                size={13}
                className={isDark ? "text-neutral-500" : "text-neutral-400"}
              />
              <h3
                className={`text-sm font-semibold ${
                  isDark ? "text-white" : "text-neutral-900"
                }`}
              >
                Comments
                {totalCommentCount > 0 && (
                  <span
                    className={`ml-1.5 text-xs font-normal ${
                      isDark ? "text-neutral-500" : "text-neutral-400"
                    }`}
                  >
                    ({totalCommentCount})
                  </span>
                )}
              </h3>
            </div>

            {/* Comment input */}
            {user ? (
              <div className="mb-4">
                <div className="relative">
                  <textarea
                    value={commentText}
                    onChange={(e) =>
                      setCommentText(
                        e.target.value.slice(0, MAX_COMMENT_LENGTH),
                      )
                    }
                    placeholder="Write a comment..."
                    rows={2}
                    maxLength={MAX_COMMENT_LENGTH}
                    className={`w-full resize-none rounded-xl border py-2.5 px-3 text-sm outline-none transition-colors ${
                      isDark
                        ? "border-neutral-700 bg-neutral-800 text-white placeholder-neutral-500 focus:border-[#f5c542]/50"
                        : "border-neutral-300 bg-neutral-50 text-neutral-900 placeholder-neutral-400 focus:border-[#b8860b]/50"
                    }`}
                  />
                  <span
                    className={`absolute bottom-2 right-3 text-[10px] ${
                      commentText.length >= MAX_COMMENT_LENGTH
                        ? "text-red-400"
                        : isDark
                          ? "text-neutral-600"
                          : "text-neutral-400"
                    }`}
                  >
                    {commentText.length}/{MAX_COMMENT_LENGTH}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span
                    className={`text-[10px] ${
                      isDark ? "text-neutral-600" : "text-neutral-400"
                    }`}
                  >
                    {isCommunityWatcher
                      ? `Posting as ${user.email ?? "Watcher"}`
                      : "Posting as Anonymous"}
                  </span>
                  <button
                    onClick={handleSubmitComment}
                    disabled={!commentText.trim() || commentSubmitting}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-40 ${
                      isDark
                        ? "bg-[#f5c542] text-black hover:bg-[#e0b23a]"
                        : "bg-[#b8860b] text-white hover:bg-[#a0750a]"
                    }`}
                  >
                    {commentSubmitting ? "Posting..." : "Post"}
                  </button>
                </div>
              </div>
            ) : (
              <p
                className={`mb-4 text-center text-xs ${
                  isDark ? "text-neutral-500" : "text-neutral-400"
                }`}
              >
                Sign in to leave a comment
              </p>
            )}

            {/* Comments list */}
            {commentsLoading ? (
              <div className="flex justify-center py-4">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-500 border-t-transparent" />
              </div>
            ) : comments.length === 0 ? (
              <p
                className={`py-4 text-center text-xs ${
                  isDark ? "text-neutral-600" : "text-neutral-400"
                }`}
              >
                No comments yet. Be the first!
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {comments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    isDark={isDark}
                    user={user}
                    isCommunityWatcher={isCommunityWatcher}
                    replyingTo={replyingTo}
                    replyText={replyText}
                    commentSubmitting={commentSubmitting}
                    onSetReplyingTo={setReplyingTo}
                    onSetReplyText={setReplyText}
                    onSubmitReply={handleSubmitReply}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Comment Item Component ──

function CommentItem({
  comment,
  isDark,
  user,
  isCommunityWatcher,
  replyingTo,
  replyText,
  commentSubmitting,
  onSetReplyingTo,
  onSetReplyText,
  onSubmitReply,
  depth = 0,
}: {
  comment: Comment;
  isDark: boolean;
  user: { id: string; email?: string | undefined } | null;
  isCommunityWatcher: boolean;
  replyingTo: string | null;
  replyText: string;
  commentSubmitting: boolean;
  onSetReplyingTo: (id: string | null) => void;
  onSetReplyText: (text: string) => void;
  onSubmitReply: (parentId: string) => void;
  depth?: number;
}) {
  const isReplyOpen = replyingTo === comment.id;
  const displayName = comment.isWatcher
    ? (comment.watcherDisplay ?? "Community Watcher")
    : "Anonymous";

  return (
    <div className={depth > 0 ? "ml-6" : ""}>
      <div
        className={`rounded-xl p-3 ${
          isDark ? "bg-neutral-800/50" : "bg-neutral-50"
        }`}
      >
        {/* Comment header */}
        <div className="mb-1.5 flex items-center gap-2">
          {comment.isWatcher && (
            <FaShieldAlt
              size={9}
              className={isDark ? "text-[#f5c542]" : "text-[#b8860b]"}
            />
          )}
          <span
            className={`text-xs font-semibold ${
              comment.isWatcher
                ? isDark
                  ? "text-[#f5c542]"
                  : "text-[#b8860b]"
                : isDark
                  ? "text-neutral-400"
                  : "text-neutral-500"
            }`}
          >
            {displayName}
          </span>
          <span
            className={`text-[10px] ${
              isDark ? "text-neutral-600" : "text-neutral-400"
            }`}
          >
            {getTimeAgo(comment.createdAt)}
          </span>
        </div>

        {/* Comment body */}
        <p
          className={`text-sm leading-relaxed ${
            isDark ? "text-neutral-300" : "text-neutral-700"
          }`}
        >
          {comment.body}
        </p>

        {/* Reply button — only for top-level comments */}
        {user && depth === 0 && (
          <button
            onClick={() => onSetReplyingTo(isReplyOpen ? null : comment.id)}
            className={`mt-2 flex items-center gap-1.5 text-[11px] font-medium transition-colors ${
              isDark
                ? "text-neutral-500 hover:text-neutral-300"
                : "text-neutral-400 hover:text-neutral-600"
            }`}
          >
            <FaReply size={9} />
            Reply
          </button>
        )}
      </div>

      {/* Reply input */}
      {isReplyOpen && user && (
        <div className="mt-2 ml-3">
          <div className="relative">
            <textarea
              value={replyText}
              onChange={(e) =>
                onSetReplyText(e.target.value.slice(0, MAX_COMMENT_LENGTH))
              }
              placeholder="Write a reply..."
              rows={2}
              maxLength={MAX_COMMENT_LENGTH}
              className={`w-full resize-none rounded-xl border py-2 px-3 text-sm outline-none transition-colors ${
                isDark
                  ? "border-neutral-700 bg-neutral-800 text-white placeholder-neutral-500 focus:border-[#f5c542]/50"
                  : "border-neutral-300 bg-neutral-50 text-neutral-900 placeholder-neutral-400 focus:border-[#b8860b]/50"
              }`}
            />
            <span
              className={`absolute bottom-2 right-3 text-[10px] ${
                replyText.length >= MAX_COMMENT_LENGTH
                  ? "text-red-400"
                  : isDark
                    ? "text-neutral-600"
                    : "text-neutral-400"
              }`}
            >
              {replyText.length}/{MAX_COMMENT_LENGTH}
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span
              className={`text-[10px] ${
                isDark ? "text-neutral-600" : "text-neutral-400"
              }`}
            >
              {isCommunityWatcher
                ? `Replying as ${user.email ?? "Watcher"}`
                : "Replying as Anonymous"}
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  onSetReplyingTo(null);
                  onSetReplyText("");
                }}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  isDark
                    ? "text-neutral-400 hover:text-neutral-200"
                    : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => onSubmitReply(comment.id)}
                disabled={!replyText.trim() || commentSubmitting}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all disabled:opacity-40 ${
                  isDark
                    ? "bg-[#f5c542] text-black hover:bg-[#e0b23a]"
                    : "bg-[#b8860b] text-white hover:bg-[#a0750a]"
                }`}
              >
                {commentSubmitting ? "..." : "Reply"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Replies */}
      {comment.replies.length > 0 && (
        <div className="mt-2 flex flex-col gap-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              isDark={isDark}
              user={user}
              isCommunityWatcher={isCommunityWatcher}
              replyingTo={replyingTo}
              replyText={replyText}
              commentSubmitting={commentSubmitting}
              onSetReplyingTo={onSetReplyingTo}
              onSetReplyText={onSetReplyText}
              onSubmitReply={onSubmitReply}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Helpers ──

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

function getTimeRemaining(deadline: Date): string | null {
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  if (diffMs <= 0) return "Voting ended";
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainHours = hours % 24;
    return `${days}d ${remainHours}h left`;
  }
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m left`;
}

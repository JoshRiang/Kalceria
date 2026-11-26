"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ContentImage from "@/components/ui/ContentImage";
import {
  toggleReelsLike,
  fetchReelsComments,
  postReelsComment,
  deleteReelsPost,
} from "@/lib/api";
import KalcerianProfileCard from "../KalcerianProfileCard";
import { avatarUrl } from "../panel/kalceriansHelpers";
import { isVideoMediaUrl } from "./reelsHelpers";

const MAX_COMMENT_CHARS = 200;

export function ReelsPostDetailModal({
  post,
  isMapDark,
  onClose,
  onSeeInMap,
  onReplyFriend,
  onPostMutated,
}) {
  const [liked, setLiked] = useState(Boolean(post?.likedByMe));
  const [likeCount, setLikeCount] = useState(Number(post?.likeCount || 0));
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [viewingAuthorProfile, setViewingAuthorProfile] = useState(null);

  const isDedicatedPost = post?.source === "reels_post";

  useEffect(() => {
    setLiked(Boolean(post?.likedByMe));
    setLikeCount(Number(post?.likeCount || 0));
    setViewingAuthorProfile(null);
    setShowComments(false);
    setComments([]);
    if (post?.id && post?.source === "reels_post") {
      fetchReelsComments(post.id).then((list) => setComments(list || []));
    }
  }, [post?.id, post?.likedByMe, post?.likeCount, post?.source]);

  if (!post) return null;

  const isVid = isVideoMediaUrl(post.mediaUrl, post.mediaType);
  const authorName = post.author?.displayName || post.author?.name || "Kalcerian";

  const handleToggleLike = async () => {
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((c) => Math.max(0, c + (nextLiked ? 1 : -1)));
    if (isDedicatedPost) {
      try {
        const res = await toggleReelsLike(post.id);
        setLiked(Boolean(res?.liked));
        setLikeCount(Number(res?.likeCount || 0));
        onPostMutated?.();
      } catch {}
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    const clean = commentText.trim().slice(0, MAX_COMMENT_CHARS);
    if (!clean || !isDedicatedPost || isSendingComment) return;
    setIsSendingComment(true);
    try {
      const res = await postReelsComment(post.id, clean);
      if (Array.isArray(res?.comments)) setComments(res.comments);
      setCommentText("");
      onPostMutated?.();
    } finally {
      setIsSendingComment(false);
    }
  };

  const handleDeleteOwn = async () => {
    if (!isDedicatedPost || !post.isOwnPost) return;
    await deleteReelsPost(post.id).catch(() => {});
    onPostMutated?.();
    onClose?.();
  };

  const canSeeOnMap = Boolean(
    post.eventObj || post.eventId || (Number.isFinite(Number(post.lat)) && Number.isFinite(Number(post.lng)))
  );

  return (
    <AnimatePresence>
      <motion.div
        key={`reel-detail-${post.id}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[2150] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.94, opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full max-w-[420px] max-h-[90dvh] rounded-2xl overflow-hidden flex flex-col border shadow-2xl ${
            isMapDark ? "bg-[#0f1014] border-white/15 text-white" : "bg-white border-black/15 text-black"
          }`}
        >
          {/* Standalone Author Profile Panel (Full-bleed, zero overlap with post media behind it) */}
          <AnimatePresence>
            {viewingAuthorProfile && (
              <motion.div
                key="reel-author-profile-panel"
                initial={{ x: "100%", opacity: 0.95 }}
                animate={{ x: "0%", opacity: 1 }}
                exit={{ x: "100%", opacity: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={`absolute inset-0 z-40 flex flex-col overflow-hidden ${
                  isMapDark ? "bg-[#161b22] text-[#f0f6fc]" : "bg-white text-[#1f2328]"
                }`}
              >
                <div
                  className={`shrink-0 px-3.5 py-2.5 flex items-center justify-between border-b ${
                    isMapDark ? "border-[#30363d]/80 bg-[#161b22]" : "border-[#e5e7eb] bg-white"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setViewingAuthorProfile(null)}
                    className="flex items-center gap-2 text-sm font-bold cursor-pointer min-w-0"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    <span className="truncate">
                      @{String(viewingAuthorProfile?.nickname || viewingAuthorProfile?.username || viewingAuthorProfile?.name || "kalcerian").replace(/^@/, "")} Profile
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingAuthorProfile(null)}
                    aria-label="Close author profile"
                    className="w-7 h-7 rounded-full flex items-center justify-center opacity-70 hover:opacity-100 cursor-pointer shrink-0"
                  >
                    ×
                  </button>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto modern-kalcerian-scrollbar">
                  <KalcerianProfileCard
                    user={viewingAuthorProfile}
                    isMapDark={isMapDark}
                    showMobileClose={false}
                    onClose={() => setViewingAuthorProfile(null)}
                    inline={true}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 1. Author Header (Click Avatar or Name -> Opens Author Profile Panel!) */}
          <div className={`px-3.5 py-2.5 flex items-center justify-between border-b shrink-0 ${isMapDark ? "border-white/10" : "border-black/10"}`}>
            <button
              type="button"
              onClick={() => setViewingAuthorProfile(post.author)}
              className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer group"
              title={`View ${authorName}'s profile`}
            >
              <div className="w-9 h-9 rounded-full overflow-hidden border border-current/25 shrink-0 group-hover:scale-105 transition-transform">
                <ContentImage
                  src={avatarUrl(post.author)}
                  alt={authorName}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate group-hover:underline">{authorName}</p>
                {post.location && (
                  <p className="text-[10.5px] opacity-65 truncate">{post.location}</p>
                )}
              </div>
            </button>
            <div className="flex items-center gap-2 shrink-0">
              {isDedicatedPost && post.isOwnPost && (
                <button
                  type="button"
                  onClick={handleDeleteOwn}
                  title="Delete post"
                  className="text-xs font-bold text-[#ef4444] px-2 py-1 rounded-lg hover:bg-red-500/10 cursor-pointer"
                >
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="text-xl leading-none px-1.5 cursor-pointer opacity-70 hover:opacity-100"
              >
                ×
              </button>
            </div>
          </div>

          {/* 2. HD Media Stage */}
          <div className="relative bg-black flex items-center justify-center max-h-[48vh] overflow-hidden shrink-0">
            {isVid ? (
              <video
                src={post.mediaUrl}
                poster={post.thumbnailUrl || undefined}
                controls
                autoPlay
                playsInline
                className="w-full max-h-[48vh] object-contain"
              />
            ) : (
              <img
                src={post.mediaUrl}
                alt={post.caption || "Moment"}
                className="w-full max-h-[48vh] object-contain"
              />
            )}
          </div>

          {/* 3. Action Bar: Like, Comment, See on Map, and FRIEND-ONLY Reply */}
          <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-3.5">
              {/* Like */}
              <button
                type="button"
                onClick={handleToggleLike}
                className="flex items-center gap-1 text-xs font-bold cursor-pointer transition-transform active:scale-125"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill={liked ? "#ef4444" : "none"} stroke={liked ? "#ef4444" : "currentColor"} strokeWidth="2">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                <span>{likeCount}</span>
              </button>

              {/* Comment */}
              {isDedicatedPost && (
                <button
                  type="button"
                  onClick={() => setShowComments((p) => !p)}
                  className="flex items-center gap-1 text-xs font-bold cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                  <span>{comments.length || post.commentCount || 0}</span>
                </button>
              )}

              {/* FRIEND-ONLY Reply Button (Available on BOTH Friends & Public Global posts iff mutual friends!) */}
              {post.isFriendWithAuthor && (
                <button
                  type="button"
                  onClick={() => {
                    onClose?.();
                    onReplyFriend?.(post.author);
                  }}
                  title="Reply via Personal Chat (Friends)"
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-pointer transition-transform hover:scale-105 ${
                    isMapDark ? "border-white/25 hover:bg-white/10" : "border-black/25 hover:bg-black/5"
                  }`}
                >
                  Reply
                </button>
              )}
            </div>

            {/* See in the Map */}
            {canSeeOnMap && (
              <button
                type="button"
                onClick={() => {
                  onSeeInMap?.(post);
                  onClose?.();
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-transform hover:scale-105 ${
                  isMapDark ? "bg-white text-black" : "bg-black text-white"
                }`}
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
                </svg>
                <span>See in Map</span>
              </button>
            )}
          </div>

          {/* 4. Caption & Comments Drawer */}
          <div className="px-3.5 pb-3.5 flex-1 overflow-y-auto space-y-2 modern-kalcerian-scrollbar">
            {post.caption && (
              <p className="text-xs leading-relaxed break-words">
                <span className="font-bold mr-1.5">{authorName}</span>
                {post.caption}
              </p>
            )}

            {isDedicatedPost && showComments && (
              <div className="pt-2 border-t border-current/10 space-y-2">
                <div className="max-h-32 overflow-y-auto space-y-1.5">
                  {comments.length === 0 ? (
                    <p className="text-[11px] opacity-55">No comments yet.</p>
                  ) : (
                    comments.map((c) => (
                      <div key={c.id} className="text-[11.5px] leading-snug">
                        <button
                          type="button"
                          onClick={() => c.author && setViewingAuthorProfile(c.author)}
                          className="font-bold mr-1.5 hover:underline cursor-pointer"
                        >
                          {c.authorName}
                        </button>
                        <span>{c.body}</span>
                      </div>
                    ))
                  )}
                </div>
                <form onSubmit={handleAddComment} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    maxLength={MAX_COMMENT_CHARS}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value.slice(0, MAX_COMMENT_CHARS))}
                    placeholder={`Add a comment (${commentText.length}/${MAX_COMMENT_CHARS})...`}
                    className={`flex-1 rounded-full px-3 py-1.5 text-xs outline-none border ${
                      isMapDark ? "bg-white/10 border-white/15 text-white" : "bg-black/5 border-black/15 text-black"
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim() || isSendingComment}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer disabled:opacity-40 ${
                      isMapDark ? "bg-white text-black" : "bg-black text-white"
                    }`}
                  >
                    Post
                  </button>
                </form>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

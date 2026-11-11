"use client";

import { COMMENT_TYPES, CATEGORIES } from "./constants";
import { validateAndNormalizeMediaUrlClient } from "@/lib/urlSecurity";

export function IdeaCommentFormBody({
  handleSubmit,
  feedbackType,
  setFeedbackType,
  category,
  setCategory,
  identity,
  setIdentity,
  username,
  handleSelectAuthenticated,
  content,
  setContent,
  mediaUrl,
  setMediaUrl,
  selectedIdx = 0,
  setSelectedIdx,
  fileInputRef,
  handleMediaUpload,
  isUploadingMedia,
  isSubmitting,
  mediaError,
  setMediaError,
  handleRemoveMedia,
  handleClearAll,
  getDisplayFilename,
  isFormValid,
  setError,
}) {
  const parsedUrls = (mediaUrl || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const activeIdx = Math.min(selectedIdx || 0, Math.max(0, parsedUrls.length - 1));
  const activeUrl = parsedUrls[activeIdx] || "";
  const displayFilenameText = parsedUrls.length > 0
    ? (getDisplayFilename ? getDisplayFilename(activeUrl) : activeUrl)
    : mediaUrl;

  return (
    <form
      onSubmit={handleSubmit}
      className="relative z-10 p-4 xs:p-5 sm:p-6 flex-1 overflow-y-auto flex flex-col gap-3.5 sm:gap-4 custom-scrollbar pr-1.5"
    >
      {/* Description Paragraph */}
      <p className="text-white/70 text-xs sm:text-sm leading-relaxed tracking-wide font-sans">
        Share your thoughts, improvements, or wild ideas directly with the team.
      </p>

      {/* Feedback Type (Advice vs Idea) */}
      <div className="flex flex-col gap-1.5 sm:gap-2">
        <label className="text-[11px] sm:text-xs font-semibold tracking-wider text-slate-400 font-sans">
          Type
        </label>
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
          {COMMENT_TYPES.map((t) => {
            const isSelected = feedbackType === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setFeedbackType(t.id);
                  setError("");
                }}
                className={`flex items-center justify-center p-2.5 xs:p-3 rounded-xl border transition-all duration-300 outline-none cursor-pointer ${
                  isSelected
                    ? "bg-white/20 backdrop-blur-md border-white/80 shadow-[0_0_15px_rgba(255,255,255,0.25)] ring-1 ring-white/50 text-white font-bold"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06] text-white/60 font-medium"
                }`}
              >
                <span className="text-xs sm:text-sm tracking-wide font-sans">
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Category Selector (Event, Web Dev, Other) */}
      <div className="flex flex-col gap-1.5 sm:gap-2">
        <label className="text-[11px] sm:text-xs font-semibold tracking-wider text-slate-400 font-sans">
          Category
        </label>
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {CATEGORIES.map((c) => {
            const isSelected = category === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCategory(c.id);
                  setError("");
                }}
                className={`py-2 px-2 rounded-lg border text-center transition-all duration-200 outline-none cursor-pointer text-[10px] sm:text-xs font-sans ${
                  isSelected
                    ? "bg-white/25 border-white text-white font-bold shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                    : "border-white/10 bg-white/[0.02] text-white/50 hover:border-white/20 hover:text-white/80"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Identity: Anonymous vs Authenticated User */}
      <div className="flex flex-col gap-1.5 sm:gap-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] sm:text-xs font-semibold tracking-wider text-slate-400 font-sans">
            Identity
          </label>
          {username && identity === "User" && (
            <span className="text-[10px] text-emerald-400 font-sans">
              Signed in as {username}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setIdentity("Anonymous");
              setError("");
            }}
            className={`py-2 px-3 rounded-lg border text-center transition-all duration-200 outline-none cursor-pointer text-xs font-sans font-bold ${
              identity === "Anonymous"
                ? "bg-white/20 border-white text-white"
                : "border-white/10 bg-white/[0.02] text-white/50 hover:border-white/20 hover:text-white/80"
            }`}
          >
            Anonymous
          </button>
          <button
            type="button"
            onClick={handleSelectAuthenticated}
            className={`py-2 px-1 rounded-lg border text-center transition-all duration-200 outline-none cursor-pointer text-[10px] xs:text-[11px] leading-tight font-sans font-bold tracking-tight overflow-hidden text-ellipsis whitespace-nowrap ${
              identity === "User"
                ? "bg-white/20 border-white text-white"
                : "border-white/10 bg-white/[0.02] text-white/50 hover:border-white/20 hover:text-white/80"
            }`}
          >
            {username ? username : "Authenticated User"}
          </button>
        </div>
      </div>

      {/* Message Textarea (0/200, minimum 20 chars, Arial not bold) */}
      <div className="flex flex-col gap-1.5 sm:gap-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] sm:text-xs font-semibold tracking-wider text-slate-400 font-sans">
            Message
          </label>
          <span
            style={{ fontFamily: "Arial, sans-serif", fontWeight: "normal" }}
            className="text-xs text-white/70"
          >
            {content.length}/200{content.length > 0 && content.length < 20 ? " (min 20)" : ""}
          </span>
        </div>
        <textarea
          className="w-full border rounded-lg p-2.5 sm:p-3.5 text-xs sm:text-sm focus:border-slate-400 outline-none min-h-[110px] resize-y transition-all bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 font-sans"
          value={content}
          maxLength={200}
          onChange={(e) => {
            setContent(e.target.value.slice(0, 200));
            setError("");
          }}
          placeholder={
            feedbackType === "IDEA"
              ? "Describe your idea in detail (minimum 20 characters)..."
              : "Write your advice or feedback here (minimum 20 characters)..."
          }
          required
        />
      </div>

      {/* Add photos or videos segment */}
      <div className="flex flex-col gap-1.5 sm:gap-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] sm:text-xs font-semibold tracking-wider text-slate-400 font-sans flex items-center gap-1.5">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3.5 h-3.5"
            >
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
            Add photos or videos{" "}
            {mediaUrl && mediaUrl.includes(",")
              ? `(${mediaUrl.split(",").filter((s) => s.trim()).length} files)`
              : ""}
          </label>
          {mediaUrl && (
            <button
              type="button"
              onClick={handleClearAll || (() => setMediaUrl(""))}
              className="text-[10px] font-bold text-red-400 hover:underline cursor-pointer"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            readOnly={parsedUrls.length > 0}
            className={`flex-1 border rounded-lg p-2 sm:p-2.5 text-xs outline-none transition-all bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 focus:border-slate-400 font-sans ${
              parsedUrls.length > 0 ? "cursor-default select-all" : ""
            }`}
            value={displayFilenameText}
            onChange={(e) => {
              if (parsedUrls.length === 0) {
                setMediaUrl(e.target.value);
                setMediaError("");
              }
            }}
            onBlur={() => {
              if (parsedUrls.length === 0 && mediaUrl.trim()) {
                const check = validateAndNormalizeMediaUrlClient(mediaUrl.trim());
                if (!check.valid) {
                  setMediaError(check.error || "Format URL media tidak valid.");
                } else if (check.normalized && check.normalized !== mediaUrl) {
                  setMediaUrl(check.normalized);
                }
              }
            }}
            placeholder="Upload media atau tempel link..."
          />
          <input
            type="file"
            ref={fileInputRef}
            accept=".png,.jpg,.jpeg,.webp,.mp4,.m4v,.mp4v,.mpg4,.mov,.3gp,.webm,image/png,image/jpeg,image/webp,video/mp4,video/x-m4v,video/mp4v-es,video/quicktime,video/3gpp,video/webm"
            className="hidden"
            onChange={handleMediaUpload}
          />
          <button
            type="button"
            disabled={isUploadingMedia || isSubmitting}
            onClick={() => fileInputRef.current?.click()}
            style={{ fontFamily: "Arial, sans-serif" }}
            className="px-3.5 py-2 border rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-all shrink-0 cursor-pointer border-white/20 bg-white/10 text-white hover:bg-white/20 hover:border-white/30 disabled:opacity-40"
          >
            {isUploadingMedia ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 60" />
                </svg>
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3.5 h-3.5"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>Upload</span>
              </>
            )}
          </button>
        </div>

        {/* Surface Error Box in Consolas Red, No Outer Box */}
        {mediaError && (
          <div
            style={{ fontFamily: "Consolas, 'Courier New', monospace" }}
            className="text-red-500 text-[13px] sm:text-[14px] font-normal tracking-tight py-0.5 select-none"
          >
            {mediaError}
          </div>
        )}

        {/* Media Thumbnails (Zero outer box, matching Event Card real appearance) */}
        {parsedUrls.length > 0 && (
          <div className="flex items-center gap-2.5 overflow-x-auto py-1.5 px-0.5 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/20">
            {parsedUrls.map((url, idx) => {
              const isVideo =
                /\.(mp4|webm|mov|m4v|3gp)($|\?)/i.test(url) || /^data:video/i.test(url);
              const isSelected = idx === activeIdx;
              const displayName = getDisplayFilename ? getDisplayFilename(url) : `Media ${idx + 1}`;
              return (
                <div
                  key={`${idx}-${url.slice(0, 32)}`}
                  onClick={() => setSelectedIdx && setSelectedIdx(idx)}
                  title={`Pilih media: ${displayName}`}
                  className={`relative w-16 h-16 sm:w-18 sm:h-18 shrink-0 rounded-xl overflow-hidden shadow-sm transition-all duration-200 transform cursor-pointer ${
                    isSelected
                      ? "scale-105 ring-2 ring-white ring-offset-2 ring-offset-black/80 shadow-white/10 shadow-lg z-10 opacity-100"
                      : "hover:scale-102 opacity-70 hover:opacity-100 border border-white/20"
                  }`}
                >
                  {isVideo ? (
                    <video
                      src={url}
                      muted
                      autoPlay
                      loop
                      playsInline
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt={displayName}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveMedia(idx);
                    }}
                    title="Remove this media"
                    className="absolute top-1 right-1 z-20 w-5 h-5 rounded-full bg-white text-black shadow-md flex items-center justify-center text-xs font-bold hover:scale-110 active:scale-90 transition-transform cursor-pointer border border-black/15 leading-none"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Submit Action Button (Clean Unboxed Action Button) */}
      <div className="flex justify-center items-center mt-auto pt-3 pb-1 shrink-0">
        <button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          style={{ fontFamily: "Arial, sans-serif" }}
          className="bg-transparent border-none shadow-none outline-none text-white hover:text-white/80 font-bold text-sm sm:text-base py-2 px-6 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed select-none"
        >
          {isSubmitting ? "Submitting..." : "Send Message"}
        </button>
      </div>
    </form>
  );
}

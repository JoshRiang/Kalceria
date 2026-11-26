"use client";

import { useRef, useState } from "react";

export const DEFAULT_MEDIA_ACCEPT =
  ".png,.jpg,.jpeg,.webp,.mp4,.m4v,.mp4v,.mpg4,.mov,.3gp,.webm,image/png,image/jpeg,image/webp,video/mp4,video/x-m4v,video/mp4v-es,video/quicktime,video/3gpp,video/webm";

const THEME_STYLES = {
  light: {
    idle: "border-[#9ca3af] bg-[#f6f8fa]/90 hover:border-[#4b5563] hover:bg-[#eef2f6]/95",
    active: "border-[#1f2328] bg-[#e6edf5]/95",
    error: "border-[#cf222e] bg-[#fff5f5]/95 hover:border-[#a40e26]",
    addTile:
      "border-[#9ca3af] bg-white/75 text-[#57606a] hover:border-[#1f2328] hover:text-[#1f2328] hover:bg-white focus-visible:ring-[#1f2328]/40",
    addTileActive: "border-[#1f2328] bg-white text-[#1f2328]",
    thumbSelected: "ring-2 ring-black ring-offset-2 ring-offset-white shadow-black/10 shadow-lg z-10 opacity-100",
    thumbIdle: "opacity-85 hover:opacity-100 border border-black/20",
    prompt: "text-[#6b7280]",
    promptActive: "text-[#1f2328]",
    errorText: "text-[#cf222e]",
  },
  dark: {
    idle: "border-[#484f58] bg-[#0a0c10]/85 hover:border-[#8b949e] hover:bg-[#161b22]/90",
    active: "border-[#e6edf3] bg-[#161b22]/95",
    error: "border-[#f85149] bg-[#2a0f12]/80 hover:border-[#ff7b72]",
    addTile:
      "border-[#484f58] bg-[#0d1117]/80 text-[#9ca3af] hover:border-[#e6edf3] hover:text-[#f0f6fc] hover:bg-[#161b22] focus-visible:ring-white/40",
    addTileActive: "border-[#e6edf3] bg-[#161b22] text-[#f0f6fc]",
    thumbSelected: "ring-2 ring-white ring-offset-2 ring-offset-black/80 shadow-white/10 shadow-lg z-10 opacity-100",
    thumbIdle: "opacity-80 hover:opacity-100 border border-white/20",
    prompt: "text-[#9ca3af]",
    promptActive: "text-[#f0f6fc]",
    errorText: "text-[#ff6b6b]",
  },
  glass: {
    idle: "border-white/25 bg-white/[0.03] hover:border-white/45 hover:bg-white/[0.06]",
    active: "border-white/75 bg-white/[0.1]",
    error: "border-red-500/80 bg-red-950/30 hover:border-red-400",
    addTile:
      "border-white/30 bg-white/[0.04] text-white/60 hover:border-white/75 hover:text-white hover:bg-white/[0.09] focus-visible:ring-white/40",
    addTileActive: "border-white/80 bg-white/[0.12] text-white",
    thumbSelected: "ring-2 ring-white ring-offset-2 ring-offset-black/80 shadow-white/10 shadow-lg z-10 opacity-100",
    thumbIdle: "opacity-80 hover:opacity-100 border border-white/20",
    prompt: "text-white/55",
    promptActive: "text-white/90",
    errorText: "text-red-400",
  },
};

/**
 * Unified single outer dashed media dropzone with flexible multi-row thumbnail flow.
 * Always keeps uploaded tiles (1..n) AND the inner dashed "+" add tile (n+1) plus
 * compact two-line helper label ("Photo/Video" / "Max 10 MB") inside ONE outer dashed box.
 */
export function MediaDropzoneBox({
  onFilesSelected,
  items = [],
  selectedIdx = 0,
  onSelectItem,
  onRemoveItem,
  accept = DEFAULT_MEDIA_ACCEPT,
  multiple = true,
  disabled = false,
  isUploading = false,
  error = "",
  theme = "dark",
  fileInputRef: externalInputRef = null,
  mediaTypeLabel = "Photo/Video",
  maxSizeLabel = "Max 10 MB",
  ariaLabel = "Drag and drop or choose photo or video file",
}) {
  const internalInputRef = useRef(null);
  const inputRef = externalInputRef || internalInputRef;
  const dragDepthRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const palette = THEME_STYLES[theme] || THEME_STYLES.dark;
  const isBlocked = Boolean(disabled);
  const safeItems = Array.isArray(items) ? items : [];

  const triggerFilePicker = () => {
    if (!isBlocked) inputRef.current?.click();
  };

  const dispatchFiles = (fileList) => {
    if (isBlocked || !fileList || fileList.length === 0) return;
    onFilesSelected?.(Array.from(fileList));
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isBlocked) return;
    dragDepthRef.current += 1;
    setIsDragging(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isBlocked) return;
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragging(false);
    if (isBlocked) return;
    dispatchFiles(e.dataTransfer?.files);
  };

  const handleInputChange = (e) => {
    const files = e.target.files;
    dispatchFiles(files);
    if (e.target) e.target.value = "";
  };

  const stateClass = isDragging
    ? palette.active
    : error
      ? palette.error
      : palette.idle;

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={isBlocked}
        className="hidden"
        onChange={handleInputChange}
      />

      <div
        data-media-dropzone="true"
        aria-invalid={Boolean(error)}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={(e) => {
          if (e.target === e.currentTarget) triggerFilePicker();
        }}
        className={`w-full rounded-xl border-2 border-dashed p-2.5 sm:p-3 flex flex-col gap-2 transition-colors duration-150 select-none ${
          isBlocked ? "opacity-55 cursor-not-allowed" : "cursor-pointer"
        } ${stateClass}`}
      >
        {/* Single flexible multi-row grid: tiles 1..n followed by (n+1) inner dashed "+" tile + compact side text */}
        <div
          className="flex flex-wrap items-center gap-2.5"
          onClick={(e) => {
            if (e.target === e.currentTarget) triggerFilePicker();
          }}
        >
          {safeItems.map((item, idx) => {
            const isSelected = idx === selectedIdx;
            const label = item.label || `Media ${idx + 1}`;
            return (
              <div
                key={item.key || `${idx}-${String(item.url || "").slice(0, 32)}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectItem?.(idx);
                }}
                title={`Pilih media: ${label}`}
                className={`relative w-16 h-16 sm:w-[70px] sm:h-[70px] shrink-0 rounded-xl overflow-hidden shadow-sm transition-colors duration-150 cursor-pointer bg-black ${
                  isSelected ? palette.thumbSelected : palette.thumbIdle
                }`}
              >
                {item.isVideo ? (
                  <video
                    src={item.url}
                    muted
                    autoPlay
                    loop
                    playsInline
                    className="w-full h-full object-cover pointer-events-none"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.url}
                    alt={label}
                    className="w-full h-full object-cover pointer-events-none"
                  />
                )}
                {onRemoveItem && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveItem(idx);
                    }}
                    aria-label={`Remove ${label}`}
                    title="Remove this media"
                    className="absolute top-1 right-1 z-20 w-5 h-5 rounded-full bg-white text-black shadow-md flex items-center justify-center text-xs font-bold hover:bg-neutral-200 transition-colors cursor-pointer border border-black/15 leading-none"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}

          {/* Inner dashed (n+1) add-more tile paired horizontally with compact 2-line muted label */}
          <div
            data-media-add-slot="true"
            className="inline-flex items-center gap-2.5 shrink-0"
          >
            <button
              type="button"
              disabled={isBlocked}
              aria-label={ariaLabel}
              onClick={(e) => {
                e.stopPropagation();
                triggerFilePicker();
              }}
              className={`w-16 h-16 sm:w-[70px] sm:h-[70px] shrink-0 rounded-xl border-2 border-dashed flex items-center justify-center transition-colors duration-150 outline-none focus-visible:ring-2 cursor-pointer disabled:cursor-not-allowed ${
                isDragging ? palette.addTileActive : palette.addTile
              }`}
            >
              {isUploading ? (
                <svg
                  className="w-5 h-5 animate-spin motion-reduce:animate-none"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="9.5"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeDasharray="28 56"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-6 h-6"
                  aria-hidden="true"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              )}
            </button>

            <button
              type="button"
              disabled={isBlocked}
              onClick={(e) => {
                e.stopPropagation();
                triggerFilePicker();
              }}
              className={`flex flex-col items-start text-left font-sans leading-snug cursor-pointer disabled:cursor-not-allowed ${
                isDragging ? palette.promptActive : palette.prompt
              }`}
            >
              <span className="text-[11.5px] sm:text-xs font-medium italic">
                {isDragging ? "Drop here..." : mediaTypeLabel}
              </span>
              <span className="text-[10.5px] sm:text-[11px] opacity-85 italic">
                {isUploading ? "Uploading..." : maxSizeLabel}
              </span>
            </button>
          </div>
        </div>

        {error && (
          <span
            role="alert"
            style={{ fontFamily: "Consolas, 'Courier New', monospace" }}
            className={`inline-flex items-start gap-1.5 text-[11.5px] sm:text-xs font-normal leading-snug ${palette.errorText}`}
          >
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-3.5 h-3.5 shrink-0 mt-[1px]"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                clipRule="evenodd"
              />
            </svg>
            <span>{error}</span>
          </span>
        )}
      </div>
    </div>
  );
}

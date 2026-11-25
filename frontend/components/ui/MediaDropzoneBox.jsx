"use client";

import { useRef, useState } from "react";

export const DEFAULT_MEDIA_ACCEPT =
  ".png,.jpg,.jpeg,.webp,.mp4,.m4v,.mp4v,.mpg4,.mov,.3gp,.webm,image/png,image/jpeg,image/webp,video/mp4,video/x-m4v,video/mp4v-es,video/quicktime,video/3gpp,video/webm";

const THEME_STYLES = {
  light: {
    idle: "border-[#9ca3af] bg-[#f6f8fa]/90 hover:border-[#4b5563] hover:bg-[#eef2f6]/95 focus-visible:ring-[#1f2328]/40",
    active: "border-[#1f2328] bg-[#e6edf5]/95",
    error: "border-[#cf222e] bg-[#fff5f5]/95 hover:border-[#a40e26]",
    prompt: "text-[#57606a]",
    promptActive: "text-[#1f2328]",
    errorText: "text-[#cf222e]",
  },
  dark: {
    idle: "border-[#484f58] bg-[#0a0c10]/85 hover:border-[#8b949e] hover:bg-[#161b22]/90 focus-visible:ring-white/40",
    active: "border-[#e6edf3] bg-[#161b22]/95",
    error: "border-[#f85149] bg-[#2a0f12]/80 hover:border-[#ff7b72]",
    prompt: "text-[#9ca3af]",
    promptActive: "text-[#f0f6fc]",
    errorText: "text-[#ff6b6b]",
  },
  glass: {
    idle: "border-white/25 bg-white/[0.03] hover:border-white/45 hover:bg-white/[0.06] focus-visible:ring-white/40",
    active: "border-white/75 bg-white/[0.1]",
    error: "border-red-500/80 bg-red-950/30 hover:border-red-400",
    prompt: "text-white/55",
    promptActive: "text-white/90",
    errorText: "text-red-400",
  },
};

export function MediaDropzoneBox({
  onFilesSelected,
  accept = DEFAULT_MEDIA_ACCEPT,
  multiple = true,
  disabled = false,
  isUploading = false,
  error = "",
  theme = "dark",
  fileInputRef: externalInputRef = null,
  promptText = "Drag & drop or choose photo / video (max 4.5 MB)",
  ariaLabel = "Drag and drop or choose photo or video file",
}) {
  const internalInputRef = useRef(null);
  const inputRef = externalInputRef || internalInputRef;
  const dragDepthRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const palette = THEME_STYLES[theme] || THEME_STYLES.dark;
  const isBlocked = Boolean(disabled);

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
      <button
        type="button"
        disabled={isBlocked}
        data-media-dropzone="true"
        aria-label={ariaLabel}
        aria-invalid={Boolean(error)}
        onClick={() => {
          if (!isBlocked) inputRef.current?.click();
        }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full rounded-xl border-2 border-dashed px-3.5 py-4 sm:py-4.5 flex flex-col items-center justify-center gap-1.5 text-center transition-colors duration-150 outline-none focus-visible:ring-2 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed ${stateClass}`}
      >
        {isUploading ? (
          <span className={`inline-flex items-center gap-2 text-xs italic font-sans ${palette.promptActive}`}>
            <svg
              className="w-3.5 h-3.5 animate-spin shrink-0 motion-reduce:animate-none"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="2.5" strokeDasharray="28 56" strokeLinecap="round" />
            </svg>
            <span>Uploading media...</span>
          </span>
        ) : (
          <span className={`text-xs sm:text-[12.5px] italic font-sans leading-snug ${isDragging ? palette.promptActive : palette.prompt}`}>
            {isDragging ? "Drop photo or video here..." : promptText}
          </span>
        )}

        {error && (
          <span
            role="alert"
            style={{ fontFamily: "Consolas, 'Courier New', monospace" }}
            className={`inline-flex items-start justify-center gap-1.5 mt-1 text-[11.5px] sm:text-xs font-normal leading-snug ${palette.errorText}`}
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
      </button>
    </div>
  );
}


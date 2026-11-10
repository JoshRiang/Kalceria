"use client";

import { useState } from "react";

export function usePhotoCropHandler() {
  const [rawImageForCrop, setRawImageForCrop] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [croppedAvatar, setCroppedAvatar] = useState(null);
  const [photoError, setPhotoError] = useState("");

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const mime = String(file.type || "").toLowerCase();
    const ext = (String(file.name || "").split(".").pop() || "").toLowerCase();
    const isDisallowedMedia =
      mime.startsWith("video/") ||
      mime === "image/gif" ||
      mime === "image/svg+xml" ||
      ["mp4", "webm", "mov", "avi", "mkv", "gif", "svg"].includes(ext);
    const isAllowedImage =
      !isDisallowedMedia &&
      (mime.startsWith("image/") ||
        ["jpg", "jpeg", "png", "webp", "heic", "heif"].includes(ext));

    if (!isAllowedImage) {
      setPhotoError("Only JPG, PNG or WEBP images allowed");
      e.target.value = "";
      return;
    }
    if (file.size > 4.5 * 1024 * 1024) {
      setPhotoError("Ukuran file melebihi batas 4.5 MB");
      e.target.value = "";
      return;
    }

    setPhotoError("");

    const openWithFileReader = () => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === "string") {
          setRawImageForCrop(event.target.result);
          setShowCropModal(true);
        } else {
          setPhotoError("Could not read selected photo");
        }
      };
      reader.onerror = () => setPhotoError("Could not read selected photo");
      reader.readAsDataURL(file);
    };

    // Pre-normalize large mobile camera photos via ObjectURL -> Canvas so 12MP-48MP phone photos open smoothly
    if (typeof window !== "undefined" && typeof URL !== "undefined" && URL.createObjectURL) {
      const tempObjUrl = URL.createObjectURL(file);
      const probeImg = new window.Image();
      probeImg.onload = () => {
        try {
          const nw = probeImg.naturalWidth || 800;
          const nh = probeImg.naturalHeight || 800;
          const maxDim = 1600;
          const scale = Math.min(1, maxDim / Math.max(nw, nh));
          const targetW = Math.max(64, Math.round(nw * scale));
          const targetH = Math.max(64, Math.round(nh * scale));
          const canvas = document.createElement("canvas");
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(probeImg, 0, 0, targetW, targetH);
            const normalizedDataUrl = canvas.toDataURL("image/jpeg", 0.92);
            URL.revokeObjectURL(tempObjUrl);
            setRawImageForCrop(normalizedDataUrl);
            setShowCropModal(true);
            return;
          }
        } catch {}
        URL.revokeObjectURL(tempObjUrl);
        openWithFileReader();
      };
      probeImg.onerror = () => {
        URL.revokeObjectURL(tempObjUrl);
        openWithFileReader();
      };
      probeImg.src = tempObjUrl;
    } else {
      openWithFileReader();
    }

    e.target.value = "";
  };

  const handleCropComplete = (croppedDataUrl) => {
    setCroppedAvatar(croppedDataUrl);
    setShowCropModal(false);
    setRawImageForCrop(null);
  };

  return {
    rawImageForCrop,
    setRawImageForCrop,
    showCropModal,
    setShowCropModal,
    croppedAvatar,
    setCroppedAvatar,
    photoError,
    setPhotoError,
    handlePhotoSelect,
    handleCropComplete,
  };
}

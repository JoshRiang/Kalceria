"use client";

import { useState, useRef, useEffect } from "react";
import ContentImage from "@/components/ui/ContentImage";
import { uploadBlobMedia } from "@/lib/api";
import {
  GROUP_PROFILE_BG_DARK,
  GROUP_PROFILE_BG_LIGHT,
  DEFAULT_GROUP_AVATAR,
  getInstantMapBgUrl,
} from "@/lib/mapBgCache";
import {
  GROUP_ROLE_MAKER,
  GROUP_ROLE_COLLABORATOR,
  GROUP_ROLE_MEMBER,
  canActorManageMember,
} from "./groupChatHelpers";

const MAX_GROUP_DESC = 400;

export function GroupSettingsSlideView({
  event,
  myId,
  myRole,
  meta,
  members = [],
  isMapDark,
  avatarUrl,
  onBack,
  onSaveSettings,
  onPromoteMember,
  onKickMember,
}) {
  const canEditSettings = myRole === GROUP_ROLE_MAKER || myRole === GROUP_ROLE_COLLABORATOR;
  const [description, setDescription] = useState(meta?.description || "");
  const [previewAvatar, setPreviewAvatar] = useState(meta?.avatarUrl || null);
  const [previewCover, setPreviewCover] = useState(meta?.coverUrl || null);
  const [previewCoverType, setPreviewCoverType] = useState(meta?.coverType || "image");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [confirmKickId, setConfirmKickId] = useState(null);
  const [busyMemberId, setBusyMemberId] = useState(null);
  const [feedback, setFeedback] = useState("");
  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);

  useEffect(() => {
    setDescription(meta?.description || "");
    setPreviewAvatar(meta?.avatarUrl || null);
    setPreviewCover(meta?.coverUrl || null);
    setPreviewCoverType(meta?.coverType || "image");
  }, [meta?.description, meta?.avatarUrl, meta?.coverUrl, meta?.coverType]);

  const handleAvatarUpload = async (e) => {
    const file = e.target?.files?.[0];
    if (!file || !canEditSettings) return;
    setIsUploadingAvatar(true);
    setFeedback("");
    try {
      const uploaded = await uploadBlobMedia(file, { purpose: "avatar" });
      if (uploaded?.url) {
        setPreviewAvatar(uploaded.url);
        await onSaveSettings?.({
          avatarUrl: uploaded.url,
          coverUrl: previewCover,
          coverType: previewCoverType,
          description,
        });
        setFeedback("Group avatar updated.");
      }
    } catch {
      setFeedback("Failed to upload avatar.");
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target?.files?.[0];
    if (!file || !canEditSettings) return;
    setIsUploadingCover(true);
    setFeedback("");
    try {
      const isVid = String(file.type || "").startsWith("video/");
      const uploaded = await uploadBlobMedia(file, { purpose: "cover" });
      if (uploaded?.url) {
        const nextType = isVid ? "video" : "image";
        setPreviewCover(uploaded.url);
        setPreviewCoverType(nextType);
        await onSaveSettings?.({
          avatarUrl: previewAvatar,
          coverUrl: uploaded.url,
          coverType: nextType,
          description,
        });
        setFeedback(isVid ? "Group cover video updated." : "Group cover image updated.");
      }
    } catch {
      setFeedback("Failed to upload cover media.");
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const handleSaveDesc = async () => {
    if (!canEditSettings || isSaving) return;
    setIsSaving(true);
    setFeedback("");
    try {
      await onSaveSettings?.({
        avatarUrl: previewAvatar,
        coverUrl: previewCover,
        coverType: previewCoverType,
        description: description.slice(0, MAX_GROUP_DESC),
      });
      setFeedback("Group settings saved.");
    } catch {
      setFeedback("Could not save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRoleToggle = async (member, nextRole) => {
    if (busyMemberId) return;
    setBusyMemberId(member.id);
    setFeedback("");
    try {
      await onPromoteMember?.(member.id, nextRole);
    } catch {
      setFeedback("Could not update member role.");
    } finally {
      setBusyMemberId(null);
    }
  };

  const handleConfirmKick = async (memberId) => {
    if (busyMemberId) return;
    setBusyMemberId(memberId);
    setFeedback("");
    try {
      await onKickMember?.(memberId);
      setConfirmKickId(null);
    } catch {
      setFeedback("Could not remove member.");
    } finally {
      setBusyMemberId(null);
    }
  };

  const iconColor = isMapDark ? "#ffffff" : "#000000";
  const resolvedGroupAvatar = previewAvatar || getInstantMapBgUrl(DEFAULT_GROUP_AVATAR);
  const groupBgUrl = getInstantMapBgUrl(isMapDark ? GROUP_PROFILE_BG_DARK : GROUP_PROFILE_BG_LIGHT);

  return (
    <div
      className={`flex flex-col flex-1 h-full min-h-0 overflow-hidden ${
        isMapDark ? "bg-[#0f1014] text-white" : "bg-white text-black"
      }`}
      style={{
        backgroundImage: `url("${groupBgUrl}")`,
        backgroundSize: "cover",
        backgroundPosition: "center bottom",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Top Bar */}
      <div
        className={`px-3 py-2.5 flex items-center gap-2.5 border-b shrink-0 ${
          isMapDark ? "bg-[#202c33] border-white/10" : "bg-white border-black/10"
        }`}
      >
        <button
          type="button"
          onClick={onBack}
          title="Back to Group Chat"
          className="p-1 rounded-full transition-transform hover:scale-110 active:scale-95 cursor-pointer"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke={iconColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold truncate">Group Settings</h3>
          <p className={`text-[11px] truncate ${isMapDark ? "text-white/60" : "text-black/60"}`}>
            {event?.title || "Event Group"}
          </p>
        </div>
      </div>

      {/* Scrollable Settings Body */}
      <div className="flex-1 overflow-y-auto pb-4 modern-kalcerian-scrollbar">
        {/* 1. Group Video / Photo Cover Banner (Editable by Maker & Collaborator) */}
        <div className="relative w-full h-32 bg-gradient-to-br from-[#1d4ed8]/30 via-[#0f172a]/50 to-[#eab308]/30 overflow-hidden">
          {previewCover ? (
            previewCoverType === "video" || /\.(mp4|webm|mov)(\?|$)/i.test(previewCover) ? (
              <video
                src={previewCover}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <ContentImage
                src={previewCover}
                alt="Group cover"
                width={360}
                height={140}
                className="w-full h-full object-cover"
              />
            )
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/15 pointer-events-none" />
          {canEditSettings && (
            <>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleCoverUpload}
              />
              <button
                type="button"
                disabled={isUploadingCover}
                onClick={() => coverInputRef.current?.click()}
                className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-black/75 text-white border border-white/25 text-[10.5px] font-bold backdrop-blur-sm cursor-pointer transition-transform hover:scale-105"
              >
                {isUploadingCover ? "Uploading..." : "Edit Cover Video/Photo"}
              </button>
            </>
          )}
        </div>

        <div className="px-3.5 space-y-4">
          {/* 2. Overlapping Default / Custom Group Avatar + Description with 0/400 Counter */}
          <div className="flex flex-col items-center gap-2.5 -mt-9 relative z-10">
            <div className="relative">
              <div
                className={`w-18 h-18 rounded-full overflow-hidden flex items-center justify-center border-[3px] shadow-lg ${
                  isMapDark ? "border-[#0f1014] bg-[#161b22]" : "border-white bg-[#f6f8fa]"
                }`}
              >
                <ContentImage
                  src={resolvedGroupAvatar}
                  alt={event?.title || "Group"}
                  width={72}
                  height={72}
                  className="w-full h-full object-cover"
                />
              </div>
              {canEditSettings && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                  <button
                    type="button"
                    disabled={isUploadingAvatar}
                    onClick={() => fileInputRef.current?.click()}
                    className={`absolute -bottom-0.5 -right-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border shadow cursor-pointer transition-transform hover:scale-105 ${
                      isMapDark
                        ? "bg-white text-black border-black"
                        : "bg-black text-white border-white"
                    }`}
                  >
                    {isUploadingAvatar ? "..." : "Edit"}
                  </button>
                </>
              )}
            </div>

            <div className="w-full space-y-1.5">
              <div className="flex items-center justify-between">
                <label className={`block text-[11px] font-semibold ${isMapDark ? "text-white/75" : "text-black/75"}`}>
                  Group Description
                </label>
                <span
                  style={{ fontFamily: "Arial, sans-serif" }}
                  className={`text-[10.5px] ${
                    description.length >= MAX_GROUP_DESC ? "text-red-500 font-bold" : "text-neutral-400"
                  }`}
                >
                  {description.length}/{MAX_GROUP_DESC}
                </span>
              </div>
              <textarea
                rows={2}
                maxLength={MAX_GROUP_DESC}
                disabled={!canEditSettings}
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, MAX_GROUP_DESC))}
                placeholder={canEditSettings ? "Write a short meeting note or rules..." : "No group description yet."}
                className={`w-full rounded-xl border px-3 py-2 text-xs outline-none resize-none ${
                  isMapDark
                    ? "bg-[#161b22]/90 border-white/15 text-white placeholder:text-white/40"
                    : "bg-white/90 border-black/15 text-black placeholder:text-black/40"
                }`}
              />
              {canEditSettings && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10.5px] text-emerald-500">{feedback}</span>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSaveDesc}
                    className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-transform hover:scale-105 active:scale-95 ${
                      isMapDark ? "bg-white text-black" : "bg-black text-white"
                    }`}
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 3. Members & Role Management (Maker Immunity + Collaborator Promotion + Kick Purge) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold">Members ({members.length})</h4>
              <span className={`text-[10px] ${isMapDark ? "text-white/55" : "text-black/55"}`}>
                Collaborators can upload event media
              </span>
            </div>

            <div className="space-y-1.5">
              {members.map((member) => {
                const perms = canActorManageMember(myRole, member.role, myId, member.id);
                const isBusy = busyMemberId === member.id;
                const isConfirmKick = confirmKickId === member.id;

                return (
                  <div
                    key={member.id}
                    className={`rounded-xl border px-2.5 py-2 flex items-center justify-between gap-2 ${
                      isMapDark
                        ? "bg-[#161b22]/88 border-white/12"
                        : "bg-white/88 border-black/10"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-current/20 shrink-0">
                        <ContentImage
                          src={avatarUrl(member)}
                          alt={member.displayName || member.name}
                          width={36}
                          height={36}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate">
                          {member.displayName || member.name}
                          {String(member.id) === String(myId) ? " (You)" : ""}
                        </p>
                        <span
                          className={`inline-block text-[9.5px] font-semibold px-1.5 py-0.5 rounded-md mt-0.5 ${
                            member.role === GROUP_ROLE_MAKER
                              ? "bg-amber-500/20 text-amber-500"
                              : member.role === GROUP_ROLE_COLLABORATOR
                              ? "bg-emerald-500/20 text-emerald-500"
                              : isMapDark
                              ? "bg-white/10 text-white/70"
                              : "bg-black/10 text-black/70"
                          }`}
                        >
                          {member.role === GROUP_ROLE_MAKER
                            ? "Maker"
                            : member.role === GROUP_ROLE_COLLABORATOR
                            ? "Collaborator"
                            : "Member"}
                        </span>
                      </div>
                    </div>

                    {(perms.canPromote || perms.canDemote || perms.canKick) && (
                      <div className="flex items-center gap-1 shrink-0">
                        {isConfirmKick ? (
                          <>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setConfirmKickId(null)}
                              className={`px-2 py-1 rounded-md text-[10px] font-semibold cursor-pointer ${
                                isMapDark ? "bg-white/10 text-white" : "bg-black/10 text-black"
                              }`}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleConfirmKick(member.id)}
                              className="px-2 py-1 rounded-md text-[10px] font-bold bg-[#ef4444] text-white cursor-pointer"
                            >
                              {isBusy ? "..." : "Erase"}
                            </button>
                          </>
                        ) : (
                          <>
                            {perms.canPromote && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleRoleToggle(member, GROUP_ROLE_COLLABORATOR)}
                                title="Grant Collaborator media upload permission"
                                className={`px-2 py-1 rounded-md text-[10px] font-semibold border cursor-pointer transition-colors ${
                                  isMapDark
                                    ? "border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/20"
                                    : "border-emerald-600/40 text-emerald-700 hover:bg-emerald-500/10"
                                }`}
                              >
                                + Collab
                              </button>
                            )}
                            {perms.canDemote && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleRoleToggle(member, GROUP_ROLE_MEMBER)}
                                title="Revoke Collaborator role"
                                className={`px-2 py-1 rounded-md text-[10px] font-semibold border cursor-pointer ${
                                  isMapDark
                                    ? "border-white/25 text-white/75 hover:bg-white/10"
                                    : "border-black/25 text-black/75 hover:bg-black/10"
                                }`}
                              >
                                Revoke
                              </button>
                            )}
                            {perms.canKick && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => setConfirmKickId(member.id)}
                                title="Erase member from group & event"
                                className="p-1.5 rounded-md text-[#ef4444] hover:bg-[#ef4444]/15 cursor-pointer transition-colors"
                              >
                                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                                  <path d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM6 8h12l-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 8z" />
                                </svg>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

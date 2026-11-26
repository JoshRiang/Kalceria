"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ContentImage from "@/components/ui/ContentImage";
import {
  fetchEventGroupMessages,
  postEventGroupMessage,
  deleteEventGroupMessages,
  ackEventGroupRead,
  updateEventGroupSettings,
  promoteEventGroupMember,
  kickEventGroupMember,
  uploadBlobMedia,
} from "@/lib/api";
import { getEventCategory } from "../EventIcon";
import { CategoryIcon } from "../panel/PanelIcons";
import { ChatDeleteConfirmOverlay } from "../chat/components/ChatDeleteConfirmOverlay";
import { getChatBgSlideUrl, pickRandomChatBgSlideIndex } from "../chat/components/chatBackgroundCarousel";
import { getInstantMapBgUrl, DEFAULT_GROUP_AVATAR } from "@/lib/mapBgCache";
import { GroupSettingsSlideView } from "./GroupSettingsSlideView";
import { GroupCallView } from "./GroupCallView";

export function EventGroupChatPanel({
  event,
  currentUser,
  isMapDark,
  avatarUrl,
  onClose,
}) {
  const myId = currentUser?.id ? String(currentUser.id) : "";
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [meta, setMeta] = useState({ avatarUrl: null, description: "" });
  const [myRole, setMyRole] = useState("MEMBER");
  const [activeCall, setActiveCall] = useState(null);
  const [joinedCallMode, setJoinedCallMode] = useState(null); // null | "voice" | "video"
  const [inputText, setInputText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [bgIndex] = useState(() => pickRandomChatBgSlideIndex());
  const messagesEndRef = useRef(null);
  const mediaInputRef = useRef(null);

  const loadGroupState = useCallback(async () => {
    if (!event?.id) return;
    try {
      const res = await fetchEventGroupMessages(event.id, { limit: 80 });
      if (!res?.ok) return;
      setMessages(Array.isArray(res.messages) ? res.messages : []);
      setMembers(Array.isArray(res.members) ? res.members : []);
      if (res.meta) setMeta(res.meta);
      if (res.role) setMyRole(res.role);
      setActiveCall(res.activeCall || null);
      ackEventGroupRead(event.id).catch(() => {});
    } catch (err) {
      if (err?.response?.status === 403 || err?.response?.status === 404) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("kalceria:refresh-events"));
        }
        onClose?.();
      }
    }
  }, [event?.id, onClose]);

  useEffect(() => {
    if (!event?.id) return undefined;
    loadGroupState();
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      loadGroupState();
    }, 1800);
    return () => clearInterval(timer);
  }, [event?.id, loadGroupState]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSendText = async (e) => {
    e?.preventDefault?.();
    const trimmed = inputText.trim();
    if (!trimmed || !event?.id) return;
    const tempId = `gmsg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const draft = {
      id: tempId,
      senderId: myId,
      senderName: currentUser?.name || "You",
      type: "text",
      text: trimmed,
      replyTo: replyingTo,
      ts: Date.now(),
    };
    setInputText("");
    setReplyingTo(null);
    setMessages((prev) => [...prev, draft]);
    try {
      await postEventGroupMessage(event.id, draft);
      loadGroupState();
    } catch {}
  };

  const handleMediaFile = async (e) => {
    const file = e.target?.files?.[0];
    if (!file || !event?.id) return;
    setIsUploadingMedia(true);
    try {
      const uploaded = await uploadBlobMedia(file, { purpose: "chat" });
      if (uploaded?.url) {
        const isVideo = String(file.type || "").startsWith("video/");
        await postEventGroupMessage(event.id, {
          type: isVideo ? "video" : "photo",
          mediaUrl: uploaded.url,
          mediaType: isVideo ? "video" : "image",
          text: isVideo ? "Video" : "Photo",
        });
        loadGroupState();
      }
    } finally {
      setIsUploadingMedia(false);
      if (mediaInputRef.current) mediaInputRef.current.value = "";
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedIds.length || !event?.id) return;
    const ids = [...selectedIds];
    setMessages((prev) => prev.filter((m) => !ids.includes(m.id)));
    setSelectedIds([]);
    setSelectMode(false);
    await deleteEventGroupMessages(event.id, { messageIds: ids }).catch(() => {});
  };

  const handleConfirmClearForMe = async () => {
    if (isClearing || !event?.id) return;
    setIsClearing(true);
    try {
      await deleteEventGroupMessages(event.id, { clearAll: true });
      setMessages([]);
    } finally {
      setIsClearing(false);
      setShowClearConfirm(false);
    }
  };

  const handleSaveSettings = async (payload) => {
    const res = await updateEventGroupSettings(event.id, payload);
    if (res?.meta) setMeta(res.meta);
  };

  const handlePromoteMember = async (targetId, role) => {
    const res = await promoteEventGroupMember(event.id, targetId, role);
    if (Array.isArray(res?.members)) setMembers(res.members);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("kalceria:refresh-events"));
    }
  };

  const handleKickMember = async (targetId) => {
    const res = await kickEventGroupMember(event.id, targetId);
    if (Array.isArray(res?.members)) setMembers(res.members);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("kalceria:refresh-events"));
    }
  };

  const iconColor = isMapDark ? "#ffffff" : "#000000";
  const bgUrl = getInstantMapBgUrl(getChatBgSlideUrl(bgIndex, isMapDark));

  if (!event) return null;

  return (
    <motion.aside
      key={`group-chat-${event.id}`}
      initial={{ y: "110%", opacity: 1 }}
      animate={{ y: "0%", opacity: 1 }}
      exit={{ y: "110%", opacity: 0.95 }}
      transition={{ type: "spring", stiffness: 290, damping: 30, mass: 0.9 }}
      className={`fixed z-[1005] left-4 bottom-4 w-[340px] sm:w-[360px] h-[580px] max-h-[calc(100vh-120px)] rounded-2xl flex flex-col overflow-hidden font-sans max-[860px]:left-0 max-[860px]:right-0 max-[860px]:bottom-0 max-[860px]:w-full max-[860px]:h-[70vh] max-[860px]:max-h-[calc(100vh-70px)] max-[860px]:min-h-[380px] max-[860px]:rounded-b-none max-[860px]:rounded-t-2xl ${
        isMapDark
          ? "bg-[#111b21] text-[#f0f6fc] shadow-[0_14px_38px_rgba(0,0,0,0.85)]"
          : "bg-[#ffffff] text-[#000000] shadow-[0_14px_38px_rgba(0,0,0,0.18)]"
      }`}
    >
      {/* Active Group Voice/Video Call View (Strictly inside Assign a Meeting panel!) */}
      <AnimatePresence>
        {joinedCallMode && (
          <GroupCallView
            event={event}
            initialMode={joinedCallMode}
            currentUser={currentUser}
            members={members}
            isMapDark={isMapDark}
            avatarUrl={avatarUrl}
            onLeaveCall={() => {
              setJoinedCallMode(null);
              loadGroupState();
            }}
          />
        )}
      </AnimatePresence>

      {/* Horizontal Sliding Deck: Chat Thread (left) <-> Group Settings (right) */}
      <motion.div
        animate={{ x: showSettings ? "-100%" : "0%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className={`flex w-full h-full flex-1 min-h-0 transition-[filter] duration-200 ${
          showClearConfirm ? "filter blur-[8px] opacity-35 pointer-events-none select-none" : ""
        }`}
      >
        {/* SLIDE 1: Event Group Chat Thread */}
        <div className="w-full h-full shrink-0 flex flex-col min-h-0">
          {/* Pull handle */}
          <button
            type="button"
            onClick={onClose}
            className={`w-full pt-2 pb-1 flex justify-center cursor-pointer outline-none shrink-0 ${
              isMapDark ? "bg-[#202c33]" : "bg-white"
            }`}
          >
            <span className={`w-11 h-1 rounded-full ${isMapDark ? "bg-white/25" : "bg-black/25"}`} />
          </button>

          {/* Group Header (NO Personal Profile Card — opens Settings only via Three Dots) */}
          <div
            className={`relative z-20 px-2.5 py-2 flex items-center justify-between gap-1.5 shrink-0 ${
              isMapDark ? "bg-[#202c33] text-white" : "bg-white text-black"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-full hover:scale-110 active:scale-95 transition-transform cursor-pointer shrink-0"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke={iconColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-9 h-9 rounded-full overflow-hidden border border-current/25 flex items-center justify-center shrink-0">
                <ContentImage
                  src={meta?.avatarUrl || getInstantMapBgUrl(DEFAULT_GROUP_AVATAR)}
                  alt={event.title}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold leading-tight truncate">{event.title}</p>
                <p className={`text-[10.5px] leading-tight truncate mt-0.5 ${isMapDark ? "text-white/65" : "text-black/65"}`}>
                  {members.length || 1} member{(members.length || 1) > 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Group Video Call, Group Voice Call, Three-Dot Menu */}
            <div className="flex items-center gap-0.5 shrink-0 relative">
              <button
                type="button"
                onClick={() => setJoinedCallMode("video")}
                title="Start Group Video Call"
                className="w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-transform cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill={iconColor}>
                  <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setJoinedCallMode("voice")}
                title="Start Group Voice Call"
                className="w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-transform cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="w-[17px] h-[17px]" fill={iconColor}>
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setMenuOpen((p) => !p)}
                title="Group options"
                className="w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-transform cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill={iconColor}>
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.94, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.94, y: -6 }}
                    transition={{ duration: 0.16 }}
                    className={`absolute right-0 top-full mt-1.5 w-48 rounded-xl border py-1.5 z-50 shadow-2xl ${
                      isMapDark ? "bg-[#233138] border-white/20 text-white" : "bg-white border-black text-black"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setShowSettings(true);
                      }}
                      className={`w-full px-3.5 py-2 text-left text-xs font-medium flex items-center gap-2.5 cursor-pointer ${
                        isMapDark ? "hover:bg-white/10" : "hover:bg-black/5"
                      }`}
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke={iconColor} strokeWidth="2">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.85 1 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                      <span>Group settings</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectMode((p) => !p);
                        setSelectedIds([]);
                        setMenuOpen(false);
                      }}
                      className={`w-full px-3.5 py-2 text-left text-xs font-medium flex items-center gap-2.5 cursor-pointer ${
                        isMapDark ? "hover:bg-white/10" : "hover:bg-black/5"
                      }`}
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke={iconColor} strokeWidth="2">
                        <polyline points="9 11 12 14 22 4" />
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                      </svg>
                      <span>{selectMode ? "Cancel selection" : "Select messages"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setShowClearConfirm(true);
                      }}
                      className={`w-full px-3.5 py-2 text-left text-xs font-medium text-[#ef4444] flex items-center gap-2.5 cursor-pointer ${
                        isMapDark ? "hover:bg-white/10" : "hover:bg-black/5"
                      }`}
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="#ef4444">
                        <path d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM6 8h12l-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 8z" />
                      </svg>
                      <span>Delete Chat</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Active Group Call Banner (if ongoing while user is in chat) */}
          {activeCall?.active && !joinedCallMode && (
            <div className="px-3 py-1.5 bg-emerald-600 text-white flex items-center justify-between text-xs shrink-0">
              <span className="font-semibold truncate">
                Ongoing {activeCall.mode === "video" ? "Video" : "Voice"} Call ({activeCall.participantIds?.length || 1} in call)
              </span>
              <button
                type="button"
                onClick={() => setJoinedCallMode(activeCall.mode)}
                className="px-2.5 py-0.5 rounded-full bg-white text-emerald-700 font-bold text-[11px] cursor-pointer"
              >
                Join
              </button>
            </div>
          )}

          {/* Message Thread with Carousel Background */}
          <div
            className="relative flex-1 min-h-0 overflow-y-auto px-3 py-2.5 space-y-2 modern-kalcerian-scrollbar"
            style={{
              backgroundImage: `url("${bgUrl}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center px-6">
                <p className={`text-xs ${isMapDark ? "text-white/65" : "text-black/65"}`}>
                  {meta?.description || "Start coordinating your meeting here."}
                </p>
              </div>
            ) : (
              messages.map((m) => {
                const isMine = String(m.senderId) === myId;
                const isSelected = selectedIds.includes(m.id);
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      if (!selectMode) return;
                      setSelectedIds((prev) =>
                        prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                      );
                    }}
                    className={`flex flex-col ${isMine ? "items-end" : "items-start"} ${
                      selectMode ? "cursor-pointer" : ""
                    }`}
                  >
                    {!isMine && (
                      <span className={`text-[10px] font-bold mb-0.5 px-1 ${isMapDark ? "text-white/75" : "text-black/75"}`}>
                        {m.senderName}
                      </span>
                    )}
                    <div
                      onDoubleClick={() => setReplyingTo({ id: m.id, senderName: m.senderName, text: m.text || m.type })}
                      className={`max-w-[82%] rounded-2xl px-3 py-1.5 text-xs shadow-sm border ${
                        isSelected
                          ? "ring-2 ring-[#ef4444]"
                          : ""
                      } ${
                        isMine
                          ? isMapDark
                            ? "bg-[#2b3942] border-white/15 text-white"
                            : "bg-black border-black text-white"
                          : isMapDark
                          ? "bg-[#161b22]/95 border-white/15 text-white"
                          : "bg-white/95 border-black/15 text-black"
                      }`}
                    >
                      {m.replyTo && (
                        <div className="mb-1 pl-2 border-l-2 border-current/40 text-[10.5px] opacity-75 truncate">
                          {m.replyTo.senderName}: {m.replyTo.text}
                        </div>
                      )}
                      {m.type === "photo" && m.mediaUrl ? (
                        <img src={m.mediaUrl} alt="Group photo" className="rounded-lg max-h-44 object-cover mb-1" />
                      ) : m.type === "video" && m.mediaUrl ? (
                        <video src={m.mediaUrl} controls playsInline className="rounded-lg max-h-44 mb-1" />
                      ) : m.type === "call" ? (
                        <span className="italic opacity-85">{m.text || "Group call ended"}</span>
                      ) : (
                        <p className="whitespace-pre-wrap break-words">{m.text}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Selection Delete Bar OR Composer Bar */}
          {selectMode ? (
            <div className={`px-3 py-2 flex items-center justify-between border-t shrink-0 ${isMapDark ? "bg-[#202c33] border-white/10" : "bg-white border-black/10"}`}>
              <span className="text-xs font-semibold">{selectedIds.length} selected</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectMode(false);
                    setSelectedIds([]);
                  }}
                  className="text-xs px-2.5 py-1 rounded-lg cursor-pointer opacity-75"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedIds.length}
                  onClick={handleDeleteSelected}
                  className="text-xs px-3 py-1 rounded-lg bg-[#ef4444] text-white font-bold cursor-pointer disabled:opacity-40"
                >
                  Delete for everyone
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSendText}
              className={`px-2.5 py-2 border-t flex flex-col gap-1.5 shrink-0 ${
                isMapDark ? "bg-[#202c33] border-white/10" : "bg-white border-black/10"
              }`}
            >
              {replyingTo && (
                <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded-lg bg-black/10 dark:bg-white/10">
                  <span className="truncate">Replying to <b>{replyingTo.senderName}</b>: {replyingTo.text}</span>
                  <button type="button" onClick={() => setReplyingTo(null)} className="ml-2 font-bold cursor-pointer">×</button>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <input ref={mediaInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleMediaFile} />
                <button
                  type="button"
                  disabled={isUploadingMedia}
                  onClick={() => mediaInputRef.current?.click()}
                  title="Send photo or video"
                  className="p-1.5 rounded-full hover:scale-110 active:scale-95 transition-transform cursor-pointer shrink-0"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke={iconColor} strokeWidth="2">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <circle cx="8.5" cy="10.5" r="1.5" />
                    <path d="M21 15l-5-5L5 19" />
                  </svg>
                </button>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Message meeting group..."
                  className={`flex-1 rounded-full px-3 py-1.5 text-xs outline-none border ${
                    isMapDark
                      ? "bg-[#111b21] border-white/15 text-white placeholder:text-white/45"
                      : "bg-[#f4f5f7] border-black/15 text-black placeholder:text-black/45"
                  }`}
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer disabled:opacity-35 ${
                    isMapDark ? "bg-white text-black" : "bg-black text-white"
                  }`}
                >
                  Send
                </button>
              </div>
            </form>
          )}
        </div>

        {/* SLIDE 2: Group Settings Slide Panel */}
        <div className="w-full h-full shrink-0 flex flex-col min-h-0">
          <GroupSettingsSlideView
            event={event}
            myId={myId}
            myRole={myRole}
            meta={meta}
            members={members}
            isMapDark={isMapDark}
            avatarUrl={avatarUrl}
            onBack={() => setShowSettings(false)}
            onSaveSettings={handleSaveSettings}
            onPromoteMember={handlePromoteMember}
            onKickMember={handleKickMember}
          />
        </div>
      </motion.div>

      {/* Delete Chat for Me Semi-Blur Overlay */}
      <ChatDeleteConfirmOverlay
        isOpen={showClearConfirm}
        mode="delete"
        displayName={event.title || "this group"}
        isMapDark={isMapDark}
        isDeleting={isClearing}
        onCancel={() => setShowClearConfirm(false)}
        onConfirm={handleConfirmClearForMe}
      />
    </motion.aside>
  );
}


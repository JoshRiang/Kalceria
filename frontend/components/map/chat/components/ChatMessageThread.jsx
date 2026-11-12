"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { ChatMessageContextMenu } from "./ChatMessageContextMenu";

export function ChatMessageThread({
  groupedMessages,
  myId,
  targetId,
  displayName = "Kalcerian",
  events = [],
  isTargetBlocked = false,
  isBlockedByTarget = false,
  isMapDark,
  selectMode,
  selectedMsgIds,
  handleToggleSelectMsg,
  playingVoiceId,
  setPlayingVoiceId,
  nextCursor,
  isLoadingOlder,
  loadOlderMessages,
  messagesEndRef,
  onResendMessage,
  replyingTo,
  onReplyMessage,
  onCopyMessage,
  onDeleteMessage,
}) {
  const [contextMenu, setContextMenu] = useState({
    isOpen: false,
    position: { x: 0, y: 0 },
    message: null,
  });

  const [nudgedMsgId, setNudgedMsgId] = useState(null);
  const messageRefs = useRef({});
  const nudgeTimerRef = useRef(null);

  // Realtime block / unblock system event pills
  const [blockEvents, setBlockEvents] = useState(() => {
    if (typeof window !== "undefined" && targetId) {
      try {
        const stored = localStorage.getItem(`kalceria:chat_block_events:${targetId}`);
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return [];
  });

  useEffect(() => {
    const handleBlockChange = (e) => {
      const { targetId: changedTargetId, action } = e.detail || {};
      if (String(changedTargetId) === String(targetId)) {
        setBlockEvents((prev) => {
          const next = [...prev, { id: `block_evt_${Date.now()}`, type: action, ts: Date.now() }];
          try {
            localStorage.setItem(`kalceria:chat_block_events:${targetId}`, JSON.stringify(next));
          } catch {}
          return next;
        });
      }
    };
    window.addEventListener("kalceria:user-block-changed", handleBlockChange);
    return () => window.removeEventListener("kalceria:user-block-changed", handleBlockChange);
  }, [targetId]);

  // Derived active block events list (synthesizes initial block if user is currently blocked without logged events)
  const displayBlockEvents = useMemo(() => {
    if (blockEvents.length > 0) return blockEvents;
    if (isTargetBlocked) {
      return [{ id: `init_blocked_${targetId}`, type: "block", ts: Date.now() }];
    }
    return [];
  }, [blockEvents, isTargetBlocked, targetId]);

  const handleJumpToMessage = useCallback((targetId) => {
    if (!targetId) return;
    const el = messageRefs.current[targetId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
      // Wait for smooth scrolling to settle smoothly before initiating the organic nudge
      nudgeTimerRef.current = setTimeout(() => {
        setNudgedMsgId(targetId);
        nudgeTimerRef.current = setTimeout(() => {
          setNudgedMsgId(null);
        }, 800);
      }, 350);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    };
  }, []);

  // Group flat [date_divider, message, ...] list into scoped day sections
  // so each sticky date divider stays strictly inside its own day's scroll boundary and never overlaps.
  const daySections = useMemo(() => {
    const sections = [];
    let current = null;
    const isTargetCurrentlyBlocked = Boolean(
      isTargetBlocked ||
      (blockEvents && blockEvents.some((e) => e.type === "block"))
    );
    let earliestBlockTs = (blockEvents || [])
      .filter((e) => e.type === "block")
      .map((e) => Number(e.ts) || 0)
      .filter((ts) => ts > 0)
      .sort((a, b) => a - b)[0] || 0;

    if (!earliestBlockTs && isTargetCurrentlyBlocked && typeof window !== "undefined") {
      try {
        const storedTs = Number(localStorage.getItem(`kalceria:chat_block_ts:${String(targetId).toLowerCase()}`));
        if (storedTs > 0) earliestBlockTs = storedTs;
      } catch {}
    }

    (groupedMessages || []).forEach((item) => {
      if (item.type === "date_divider") {
        current = {
          id: item.id,
          label: item.label,
          messages: [],
        };
        sections.push(current);
      } else {
        // If target is blocked by me, suppress any incoming messages sent by target while blocked
        if (
          isTargetCurrentlyBlocked &&
          String(item.senderId) === String(targetId)
        ) {
          if (
            item.status === "blocked_drop" ||
            item.isBlockedDrop ||
            item.blockedWhileSent ||
            item.wasBlocked ||
            item.isCall ||
            item.msgType === "call" ||
            item.callMode
          ) {
            return;
          }
          if (earliestBlockTs > 0 && Number(item.ts) >= earliestBlockTs - 2000) {
            return;
          }
        }

        if (!current) {
          current = {
            id: `sec_${item.id || sections.length}`,
            label: null,
            messages: [],
          };
          sections.push(current);
        }
        current.messages.push(item);
      }
    });

    // Remove empty day sections whose messages were all filtered out
    return sections.filter((sec) => sec.messages.length > 0);
  }, [groupedMessages, isTargetBlocked, targetId, blockEvents]);

  const handleOpenContextMenu = (e, message) => {
    // If in select mode, do not open context menu; selection takes precedence
    if (selectMode) return;
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      message,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Background Layer: Keep BG_PersonalChat.webp always visible with subtle contrast veil */}
      <div
        className="absolute inset-0 z-0 pointer-events-none transition-all duration-300"
        style={{
          backgroundImage: "url('/BG_PersonalChat.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: isMapDark ? 0.45 : 0.58,
        }}
      />
      {/* Subtle Theme Contrast Veil */}
      <div
        className={`absolute inset-0 z-0 pointer-events-none ${
          isMapDark ? "bg-[#0b141a]/45" : "bg-white/30"
        }`}
      />

      {/* Scrollable Message Thread: Optimized with GPU acceleration & low-latency scrolling */}
      <div
        ref={messagesEndRef}
        style={{ WebkitOverflowScrolling: "touch" }}
        className="relative z-10 flex-1 overflow-y-auto px-3 py-2.5 flex flex-col gap-2 modern-kalcerian-scrollbar overscroll-contain transform-gpu will-change-scroll"
      >
        {/* Cursor Pagination for Cold Archive */}
        {nextCursor && (
          <div className="flex justify-center my-1">
            <button
              type="button"
              disabled={isLoadingOlder}
              onClick={loadOlderMessages}
              className={`px-3 py-1 rounded-full text-[10px] font-semibold border transition-opacity cursor-pointer disabled:opacity-50 ${
                isMapDark
                  ? "bg-[#182229]/90 border-white/20 text-white hover:bg-[#202c33]"
                  : "bg-white/95 border-black text-black hover:bg-black/5"
              }`}
            >
              {isLoadingOlder ? "Loading older messages..." : "Load older messages"}
            </button>
          </div>
        )}

        {daySections.map((section) => (
          <div key={section.id} className="relative flex flex-col gap-1.5">
            {section.label && (
              /* Scoped Sticky Date/Time Mark: Pushes out cleanly when next day section arrives */
              <div className="sticky top-1.5 z-20 flex justify-center my-1 pointer-events-none">
                <span
                  className={`px-3 py-0.5 rounded-md text-[10.5px] font-medium border shadow-md backdrop-blur-md pointer-events-auto ${
                    isMapDark
                      ? "bg-[#182229]/95 border-white/15 text-white/85 shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                      : "bg-white/95 border-black text-black shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
                  }`}
                >
                  {section.label}
                </span>
              </div>
            )}

            {section.messages.map((item) => (
              <div
                key={item.id}
                ref={(el) => {
                  if (el) messageRefs.current[item.id] = el;
                  else delete messageRefs.current[item.id];
                }}
                className="w-full"
              >
                <ChatMessageBubble
                  item={item}
                  myId={myId}
                  events={events}
                  isMapDark={isMapDark}
                  selectMode={selectMode}
                  selectedMsgIds={selectedMsgIds}
                  handleToggleSelectMsg={handleToggleSelectMsg}
                  playingVoiceId={playingVoiceId}
                  setPlayingVoiceId={setPlayingVoiceId}
                  onResendMessage={onResendMessage}
                  replyingTo={replyingTo}
                  onOpenContextMenu={handleOpenContextMenu}
                  onJumpToMessage={handleJumpToMessage}
                  isNudged={nudgedMsgId === item.id}
                />
              </div>
            ))}
          </div>
        ))}

        {/* Realtime Block / Unblock System Event Pills (matching size, placement & behaviour of Today 8:59 am) */}
        {displayBlockEvents.map((evt) => (
          <div key={evt.id} className="flex justify-center my-1.5 pointer-events-none">
            <span
              className={`px-3 py-0.5 rounded-md text-[10.5px] font-medium border shadow-md backdrop-blur-md pointer-events-auto ${
                isMapDark
                  ? "bg-[#182229]/95 border-white/15 text-white/85 shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                  : "bg-white/95 border-black text-black shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
              }`}
            >
              You <span className="text-[#ef4444] font-semibold">{evt.type === "block" ? "blocked" : "unblocked"}</span> {displayName}
            </span>
          </div>
        ))}
      </div>

      {/* Floating Right-Click Context Menu */}
      <ChatMessageContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        targetMessage={contextMenu.message}
        isMapDark={isMapDark}
        onClose={handleCloseContextMenu}
        onReply={(msg) => onReplyMessage?.(msg)}
        onCopy={(msg) => onCopyMessage?.(msg)}
        onDelete={(msg) => onDeleteMessage?.([msg.id])}
      />
    </div>
  );
}

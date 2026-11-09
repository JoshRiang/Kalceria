"use client";

import { useCallback, useEffect } from "react";
import { fetchPersonalChatPage } from "@/lib/api";
import { decryptChatEnvelope } from "@/lib/chatCrypto";

/**
 * frontend/components/map/chat/hooks/personalChat/useChatThreadUi.js
 *
 * Chat thread UI pagination, scroll-to-bottom, and 3-dots outside click listener.
 * Ledger: E6, E7
 *
 * Input: { nextCursor, isLoadingOlder, targetId, myId, messages, isPeerTyping, menuOpen,
 *          setMessages, setNextCursor, setIsLoadingOlder, setMenuOpen, messagesEndRef, menuContainerRef }
 * Output: { loadOlderMessages }
 */
export function useChatThreadUi({
  nextCursor = null,
  isLoadingOlder = false,
  targetId = null,
  myId = null,
  messages = [],
  isPeerTyping = false,
  menuOpen = false,
  setMessages = () => {},
  setNextCursor = () => {},
  setIsLoadingOlder = () => {},
  setMenuOpen = () => {},
  messagesEndRef = { current: null },
  menuContainerRef = { current: null },
} = {}) {
  // Cursor pagination for older messages from Cold Archive
  const loadOlderMessages = useCallback(async () => {
    if (!nextCursor || isLoadingOlder || !targetId) return;
    setIsLoadingOlder(true);
    try {
      const page = await fetchPersonalChatPage(targetId, { cursor: nextCursor, limit: 30 });
      setNextCursor(page?.nextCursor || null);
      const remoteEnvelopes = page?.messages || [];
      if (Array.isArray(remoteEnvelopes) && remoteEnvelopes.length > 0) {
        const decryptedOlder = (
          await Promise.all(
            remoteEnvelopes.map((env) => decryptChatEnvelope(env, myId, targetId))
          )
        ).filter(Boolean);
        if (decryptedOlder.length > 0) {
          setMessages((prev) => {
            const mergedMap = new Map();
            decryptedOlder.forEach((m) => mergedMap.set(m.id, m));
            prev.forEach((m) => mergedMap.set(m.id, m));
            return Array.from(mergedMap.values()).sort((a, b) => (a.ts || 0) - (b.ts || 0));
          });
        }
      }
    } catch { } finally {
      setIsLoadingOlder(false);
    }
  }, [nextCursor, isLoadingOlder, targetId, myId]);

  // Auto-scroll message thread container to bottom when messages change (never scroll outer page/main!)
  useEffect(() => {
    const container = messagesEndRef.current;
    if (!container) return;
    const raf = requestAnimationFrame(() => {
      try {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      } catch {
        container.scrollTop = container.scrollHeight;
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [messages.length, isPeerTyping]);

  // Close 3-dots dropdown when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    function handleOutside(e) {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [menuOpen]);

  return {
    loadOlderMessages,
  };
}


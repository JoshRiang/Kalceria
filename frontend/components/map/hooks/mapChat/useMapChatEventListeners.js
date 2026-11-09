"use client";

import { useEffect } from "react";

export function useMapChatEventListeners({
  receivePersonalChatMessage,
  markPersonalChatRead,
  receiveEventGroupChatMessage,
  receiveEnvelopeNotification,
  currentUser,
}) {
  // Register global event listeners & imperative test/integration helpers
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onPersonalChat = (e) => receivePersonalChatMessage(e?.detail || {});
    const onPersonalChatRead = (e) => {
      const targetId = e?.detail?.targetId;
      if (targetId) markPersonalChatRead(targetId);
    };
    const onEventChat = (e) => receiveEventGroupChatMessage(e?.detail || {});
    const onEnvelope = (e) => receiveEnvelopeNotification(e?.detail || {});

    window.addEventListener("kalceria:incoming-personal-chat", onPersonalChat);
    window.addEventListener("kalceria:personal-chat-read", onPersonalChatRead);
    window.addEventListener("kalceria:incoming-event-chat", onEventChat);
    window.addEventListener("kalceria:incoming-envelope-request", onEnvelope);

    window.__kalceriaTriggerPersonalChat = (senderIdOrHandle, message = "Hey, let's roll!") => {
      receivePersonalChatMessage({ senderId: senderIdOrHandle, message, timestamp: Date.now() });
    };
    window.__kalceriaTriggerEventGroupChat = (eventId, message = "New group update!", senderName = "Kalcerian") => {
      receiveEventGroupChatMessage({ eventId, message, senderName, timestamp: Date.now() });
    };
    window.__kalceriaTriggerEnvelopeRequest = (eventId, request) => {
      receiveEnvelopeNotification({ eventId, request });
    };

    let bc = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        bc = new BroadcastChannel("kalceria_realtime_channel");
        bc.onmessage = (ev) => {
          const { type, payload } = ev.data || {};
          if (type === "personal_chat") {
            receivePersonalChatMessage(payload || {});
          } else if (type === "envelope_request") {
            receiveEnvelopeNotification(payload || {});
          } else if (type === "event_group_chat") {
            receiveEventGroupChatMessage(payload || {});
          }
        };
      }
    } catch {}

    return () => {
      window.removeEventListener("kalceria:incoming-personal-chat", onPersonalChat);
      window.removeEventListener("kalceria:personal-chat-read", onPersonalChatRead);
      window.removeEventListener("kalceria:incoming-event-chat", onEventChat);
      window.removeEventListener("kalceria:incoming-envelope-request", onEnvelope);
      delete window.__kalceriaTriggerPersonalChat;
      delete window.__kalceriaTriggerEventGroupChat;
      delete window.__kalceriaTriggerEnvelopeRequest;
      if (bc) {
        try {
          bc.close();
        } catch {}
      }
    };
  }, [receivePersonalChatMessage, markPersonalChatRead, receiveEventGroupChatMessage, receiveEnvelopeNotification]);

  // Listen for real incoming personal chat events and background-poll for genuine unread peer messages
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleIncomingPersonalMsg = (e) => {
      const detail = e?.detail;
      if (!detail || !detail.senderId) return;
      if (currentUser?.id && String(detail.senderId) === String(currentUser.id)) return;
      receivePersonalChatMessage({
        senderId: detail.senderId,
        message: detail.message || "Pesan baru",
        timestamp: detail.timestamp || Date.now(),
      });
    };
    window.addEventListener("kalceria:incoming-personal-message", handleIncomingPersonalMsg);
    return () => {
      window.removeEventListener("kalceria:incoming-personal-message", handleIncomingPersonalMsg);
    };
  }, [currentUser?.id, receivePersonalChatMessage]);
}

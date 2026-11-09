"use client";

import { useEffect } from "react";
import { fetchCallSignals, postCallSignal } from "@/lib/api";
import { startIncomingRingtone, stopCallRingtone } from "@/lib/soundEngine";
import { generateCryptoNonce } from "@/lib/chatCrypto";

export function useKalceriansIncomingCall({
  currentUser,
  isSelfOfflineRef,
  sidebarKalceriansRef,
  mapUsersDataRef,
  activeChatUserIdRef,
  activeChatUserSnapshotRef,
  setActiveChatUserId,
  setActiveChatUserSnapshot,
  incomingCall,
  setIncomingCall,
  incomingCallRef,
  setIncomingCallInitialState,
  handledCallIdsRef,
  suspendedChatUserRef,
  handleOpenChatWithTransition,
  setDrawerOpen,
}) {
  // Poll for incoming call signals across devices (event-driven, visibility-adaptive)
  useEffect(() => {
    if (!currentUser?.id) return;

    let active = true;
    let timerId = null;

    const checkSignals = async () => {
      if (!active) return;
      try {
        // When user intentionally toggles Offline (Eye shut), incoming calls are naturally not received
        if (isSelfOfflineRef.current) {
          if (active) {
            timerId = setTimeout(checkSignals, 3200);
          }
          return;
        }
        const res = await fetchCallSignals();
        const signals = res?.signals || [];

        for (const sig of signals) {
          if (sig.signalType === "offer") {
            if (sig.callId && handledCallIdsRef.current.has(sig.callId)) continue;
            // New incoming call offer from another user
            if (!incomingCallRef.current || incomingCallRef.current.callId !== sig.callId) {
              const currentSidebar = sidebarKalceriansRef.current || [];
              const currentMapUsers = mapUsersDataRef.current || [];
              const caller =
                currentSidebar.find(
                  (u) => String(u.id || u.nickname) === String(sig.fromUserId)
                ) ||
                currentMapUsers.find(
                  (u) => String(u.id || u.nickname) === String(sig.fromUserId)
                ) || {
                  id: sig.fromUserId,
                  name: "Kalcerian",
                  displayName: "Kalcerian",
                };

              // If chat box is currently open, suspend it and slide it down
              if (activeChatUserIdRef.current) {
                const currentChatUser =
                  currentSidebar.find(
                    (u) => String(u.id || u.nickname || u.name) === String(activeChatUserIdRef.current)
                  ) || activeChatUserSnapshotRef.current;
                if (currentChatUser) {
                  suspendedChatUserRef.current = currentChatUser;
                }
                setActiveChatUserId(null);
                setActiveChatUserSnapshot(null);
              }

              setIncomingCall({
                callId: sig.callId,
                fromUserId: sig.fromUserId,
                callerUser: caller,
                callMode: sig.callMode,
                offerSdp: sig.encryptedPayload,
              });

              postCallSignal(sig.fromUserId, {
                callId: sig.callId,
                callMode: sig.callMode,
                signalType: "ringing",
                nonce: generateCryptoNonce(),
              }).catch(() => {});

              startIncomingRingtone();

              if (typeof Notification !== "undefined" && Notification.permission === "granted") {
                new Notification(`Panggilan Masuk dari ${caller.displayName || caller.name}`, {
                  body: `Panggilan ${sig.callMode === "video" ? "video" : "suara"} masuk di Kalceria Map`,
                  icon: "/ForChat/Coki_Speak.png",
                  tag: `call-${sig.callId}`,
                  renotify: true,
                });
              }
            }
          } else if (sig.signalType === "hangup") {
            if (sig.callId) handledCallIdsRef.current.add(sig.callId);
            if (incomingCallRef.current && incomingCallRef.current.callId === sig.callId) {
              stopCallRingtone();
              setIncomingCall(null);
              fetchCallSignals({ clear: "true" }).catch(() => {});
              // Gracefully return to state 0 if caller canceled
              if (suspendedChatUserRef.current) {
                const prevUser = suspendedChatUserRef.current;
                suspendedChatUserRef.current = null;
                handleOpenChatWithTransition(prevUser);
              } else {
                setDrawerOpen(true);
              }
            }
          }
        }
      } catch {}

      if (active) {
        const isHidden = typeof document !== "undefined" && document.hidden;
        timerId = setTimeout(checkSignals, isHidden ? 4800 : 1200);
      }
    };

    timerId = setTimeout(checkSignals, 600);

    const onVisibilityWake = () => {
      if (active && typeof document !== "undefined" && !document.hidden) {
        if (timerId) clearTimeout(timerId);
        checkSignals();
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibilityWake);
    }

    return () => {
      active = false;
      if (timerId) clearTimeout(timerId);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibilityWake);
      }
    };
  }, [currentUser?.id]);

  const handleAcceptIncomingCall = (call) => {
    stopCallRingtone();
    const callData = call || incomingCall;
    if (!callData) return;

    if (callData.callId) {
      handledCallIdsRef.current.add(callData.callId);
    }
    suspendedChatUserRef.current = null;
    const caller = callData.callerUser;
    setIncomingCallInitialState({
      mode: callData.callMode,
      user: caller,
      isIncoming: true,
      offerSdp: callData.offerSdp,
      callId: callData.callId,
    });
    setIncomingCall(null);
    handleOpenChatWithTransition(caller);
  };

  const handleDeclineIncomingCall = () => {
    stopCallRingtone();
    if (incomingCall?.callId) {
      handledCallIdsRef.current.add(incomingCall.callId);
    }
    if (incomingCall?.fromUserId) {
      postCallSignal(incomingCall.fromUserId, {
        callId: incomingCall.callId,
        callMode: incomingCall.callMode,
        signalType: "hangup",
        nonce: generateCryptoNonce(),
      }).catch(() => {});
    }
    fetchCallSignals({ clear: "true" }).catch(() => {});
    setIncomingCall(null);

    // Return gracefully to State 0:
    // If chat was open before call, slide chat back up; else slide Kalcerians scroll bar drawer back up
    if (suspendedChatUserRef.current) {
      const prevUser = suspendedChatUserRef.current;
      suspendedChatUserRef.current = null;
      handleOpenChatWithTransition(prevUser);
    } else {
      setDrawerOpen(true);
    }
  };

  return {
    handleAcceptIncomingCall,
    handleDeclineIncomingCall,
  };
}

"use client";

import { useEffect } from "react";
import { postCallSignal } from "@/lib/api";
import { generateCryptoNonce } from "@/lib/chatCrypto";

export function useCallCamStateSync({
  hardware,
  mode,
  targetUserId,
  callCtrlChannelRef,
  activeCallIdRef,
  isHungUpRef,
  camMountSyncedRef,
}) {
  // Toggle Camera Mute + Real-Time Peer Camera State Sync (DataChannel + Signal Queue Fallback)
  useEffect(() => {
    const isCamOff = hardware.isCamOff;
    const dc = callCtrlChannelRef.current;
    if (dc && dc.readyState === "open") {
      try {
        dc.send(JSON.stringify({ type: "cam_state", isCamOff: Boolean(isCamOff), ts: Date.now() }));
      } catch {}
    }

    if (!camMountSyncedRef.current) {
      camMountSyncedRef.current = true;
      if (!isCamOff) return;
    }

    if (mode === "video" && targetUserId && !isHungUpRef.current) {
      postCallSignal(targetUserId, {
        callId: activeCallIdRef.current,
        callMode: mode,
        signalType: "cam_state",
        nonce: generateCryptoNonce(),
        encryptedPayload: JSON.stringify({ isCamOff: Boolean(isCamOff) }),
      }).catch(() => {});
    }
  }, [hardware.isCamOff, mode, targetUserId]);
}

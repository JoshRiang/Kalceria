"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";
import {
  FORCE_LOAD_PAUSE_MS,
  clearPendingOAuthMode,
  closeCurrentWindow,
  detectIsOAuthPopupWindow,
  dispatchOAuthHandoffResult,
} from "./oauthCallbackHelpers";
import { GoogleCallbackView } from "./GoogleCallbackView";

function GoogleCallbackContent() {
  const searchParams = useSearchParams();
  const [statusMessage, setStatusMessage] = useState("Authenticating with Google");
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [canCloseManually, setCanCloseManually] = useState(false);
  const [isPopupContext, setIsPopupContext] = useState(true);

  useEffect(() => {
    let completed = false;
    const timers = [];

    async function handleExchange() {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const errorParam = searchParams.get("error");
      const errorDesc = searchParams.get("error_description");
      const popupMode = detectIsOAuthPopupWindow();
      setIsPopupContext(popupMode);

      const finishAndClose = (result) => {
        if (completed) return;
        completed = true;

        dispatchOAuthHandoffResult(result);
        clearPendingOAuthMode();

        // Force Load stabilization pause (~700ms) so parent tab processes session & UI transitions smoothly
        const pauseTimer = setTimeout(() => {
          if (popupMode) {
            closeCurrentWindow();
            const retryInterval = setInterval(closeCurrentWindow, 140);
            timers.push(retryInterval);
            const fallbackTimer = setTimeout(() => {
              clearInterval(retryInterval);
              if (typeof window !== "undefined" && !window.closed) {
                setCanCloseManually(true);
              }
            }, 900);
            timers.push(fallbackTimer);
          } else if (typeof window !== "undefined") {
            window.location.replace("/?auth=true&google_handoff=1");
          }
        }, FORCE_LOAD_PAUSE_MS);
        timers.push(pauseTimer);
      };

      if (errorParam) {
        setIsError(true);
        const errMsg = errorDesc || errorParam;
        setStatusMessage(`Google Sign-In canceled: ${errMsg}`);
        finishAndClose({
          type: "KALCERIA_GOOGLE_OAUTH_RESULT",
          ok: false,
          error: errMsg,
        });
        return;
      }

      if (!code || !state) {
        setIsError(true);
        setStatusMessage("Missing authorization code or state parameter.");
        finishAndClose({
          type: "KALCERIA_GOOGLE_OAUTH_RESULT",
          ok: false,
          error: "Missing authorization code or state from Google.",
        });
        return;
      }

      try {
        const redirectUri = `${window.location.origin}/auth/google/callback`;
        const res = await api.post("/auth/google/exchange", {
          code,
          state,
          redirectUri,
        });

        setIsSuccess(true);
        setStatusMessage("Redirecting back to Kalceria");
        finishAndClose({
          type: "KALCERIA_GOOGLE_OAUTH_RESULT",
          ok: true,
          payload: res.data,
        });
      } catch (err) {
        setIsError(true);
        const errMsg =
          err.response?.data?.error || err.message || "Failed to exchange Google authorization.";
        setStatusMessage(errMsg);
        finishAndClose({
          type: "KALCERIA_GOOGLE_OAUTH_RESULT",
          ok: false,
          error: errMsg,
        });
      }
    }

    handleExchange();

    return () => {
      timers.forEach((t) => {
        clearTimeout(t);
        clearInterval(t);
      });
    };
  }, [searchParams]);

  return (
    <GoogleCallbackView
      statusMessage={statusMessage}
      isError={isError}
      isSuccess={isSuccess}
      canCloseManually={canCloseManually}
      isPopupContext={isPopupContext}
    />
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <GoogleCallbackView
          statusMessage="Authenticating with Google"
          isError={false}
          isSuccess={false}
          canCloseManually={false}
          isPopupContext={true}
        />
      }
    >
      <GoogleCallbackContent />
    </Suspense>
  );
}

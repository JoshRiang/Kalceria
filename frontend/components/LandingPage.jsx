"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useMerchRandomizer } from "./landing/showcase";
import { ClosingSections } from "./landing/ClosingSections";
import {
  LandingHeroSection,
  LandingEventsSection,
  LandingAboutSection,
  LandingSupportSection,
  LandingFindMoreSection,
  LandingNeedHelpSection,
} from "./landing/sections";
import { useViewportActivity } from "@/hooks/useViewportActivity";
import { useHasMounted } from "@/hooks/useHasMounted";
import { useIsMobileViewport, useIsMobileOrTabletViewport } from "@/hooks/useIsMobileViewport";
import api from "@/lib/api";
import { clearSession, establishSession, hasUserSession } from "@/lib/session";
import { useAuthStore } from "@/stores/useAuthStore";

const ServiceRequestModal = dynamic(() => import("./ServiceRequestModal"), { ssr: false });
const LogoutConfirmModal = dynamic(() => import("./landing/modals/LogoutConfirmModal").then(m => m.LogoutConfirmModal), { ssr: false });
const IdeaCommentModal = dynamic(() => import("./landing/modals/IdeaCommentModal").then(m => m.IdeaCommentModal), { ssr: false });

const ABOUT_IMAGES = [
  { src: "/aboutus_bg1.webp", width: 1358, height: 768 },
  { src: "/aboutus_bg2.webp", width: 1317, height: 800 },
  { src: "/aboutus_bg3.webp", width: 1317, height: 800 },
  { src: "/aboutus_bg4.webp", width: 1253, height: 832 }
];

const ABOUT_IMAGES_HP = [
  { src: "/hp/abt_landing_hp1.webp", width: 720, height: 540 },
  { src: "/hp/abt_landing_hp2.webp", width: 1000, height: 701 },
  { src: "/hp/abt_landing_hp3.webp", width: 500, height: 333 }
];

const slideVariants = {
  enter: { x: "100%", opacity: 0 },
  center: { x: "0%", opacity: 1, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
  exit: { x: "-100%", opacity: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
};

export default function LandingPage({ onNavigateAuth }) {
  const mounted = useHasMounted();
  const [aboutIndex, setAboutIndex] = useState(0);
  const [mascotFrame, setMascotFrame] = useState(1);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState("");
  const [serviceManageState, setServiceManageState] = useState(null);

  const handleApplyRequest = () => {
    setShowServiceModal(true);
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await api.get("/location/reverse", {
              params: { lat: pos.coords.latitude, lng: pos.coords.longitude }
            });
            if (res.data?.formatted) {
              setDetectedLocation(res.data.formatted);
            }
          } catch { }
        },
        () => { },
        { timeout: 8000 }
      );
    }
  };

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showIdeaModal, setShowIdeaModal] = useState(false);
  const openIdeaModal = useCallback(() => setShowIdeaModal(true), []);
  const closeIdeaModal = useCallback(() => setShowIdeaModal(false), []);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const [skipAnim, setSkipAnim] = useState(false);
  const [ambientGated, setAmbientGated] = useState(true);
  const displayedMerch = useMerchRandomizer();
  const [merchInitial, setMerchInitial] = useState(true);

  useEffect(() => {
    if (displayedMerch.length > 0) {
      const t = setTimeout(() => setMerchInitial(false), 2000);
      return () => clearTimeout(t);
    }
  }, [displayedMerch.length]);

  const isMobile = useIsMobileViewport();
  const isMobileOrTablet = useIsMobileOrTabletViewport();
  const heroSectionRef = useRef(null);
  const heroVideoRef = useRef(null);
  const isHeroActive = useViewportActivity(heroSectionRef, { rootMargin: "200px 0px", initialActive: true });

  useEffect(() => {
    const v = heroVideoRef.current;
    if (!v) return;
    if (isHeroActive) {
      v.play().catch(() => { });
    } else {
      v.pause();
    }
  }, [isHeroActive]);

  const currentAboutImages = isMobileOrTablet ? ABOUT_IMAGES_HP : ABOUT_IMAGES;
  const currentAboutImage = currentAboutImages[aboutIndex % currentAboutImages.length];

  useEffect(() => {
    setSkipAnim(false);
    const gateTimer = setTimeout(() => {
      setAmbientGated(false);
    }, 1800);

    // Check login status & heal session if cookie exists
    api.get("/users/me").then((res) => {
      if (res.data?.user) {
        establishSession(res.data.user);
      } else {
        clearSession();
      }
    }).catch((err) => {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        clearSession();
      }
    });

    // Smooth scroll restoration on fallback navigation
    const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;

    // Cross-Tab / Email Link handling for Service Booking (Edit or Cancel)
    const serviceAction = urlParams?.get("service_action");
    const bookingId = urlParams?.get("booking_id");
    const token = urlParams?.get("token");

    if (serviceAction && bookingId) {
      try {
        if (typeof window !== "undefined" && "BroadcastChannel" in window) {
          const ch = new BroadcastChannel("kalceria_service_channel");
          ch.postMessage({
            type: "SERVICE_ACTION_TRIGGERED",
            action: serviceAction,
            bookingId,
            token,
          });
          ch.close();
        }
        localStorage.setItem(
          "kalceria_service_action_sync",
          JSON.stringify({
            action: serviceAction,
            bookingId,
            token,
            timestamp: Date.now(),
          })
        );
      } catch {}

      // Attempt to close this tab so user seamlessly returns to parent tab
      if (typeof window !== "undefined") {
        if (window.opener || window.history.length <= 2) {
          window.close();
        }
      }

      setServiceManageState({
        action: serviceAction,
        bookingId,
        token,
      });
      setShowServiceModal(true);
    }
    const scrollTarget = urlParams?.get("anchor") || sessionStorage.getItem("landingScrollTarget");
    const scrollY = sessionStorage.getItem("landingScrollY");
    if (scrollTarget || scrollY) {
      if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }

      sessionStorage.removeItem("landingScrollTarget");
      sessionStorage.removeItem("landingScrollY");

      // Clean query parameters from address bar to keep UX clean
      if (typeof window !== "undefined" && window.history.replaceState) {
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
      }

      // Industrial-grade recurring scroll lock to force viewport position through dynamic loading reflows
      const scrollInterval = setInterval(() => {
        if (scrollY) {
          window.scrollTo(0, parseInt(scrollY, 10));
        } else {
          const element = document.getElementById(scrollTarget);
          if (element) {
            element.scrollIntoView({ behavior: "auto", block: "start" });
          }
        }
      }, 150);

      const timer = setTimeout(() => {
        clearInterval(scrollInterval);
        if (!scrollY) {
          const element = document.getElementById(scrollTarget);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
      }, 1600);
      return () => {
        if (gateTimer) clearTimeout(gateTimer);
        clearInterval(scrollInterval);
        clearTimeout(timer);
      };
    }
    return () => {
      if (gateTimer) clearTimeout(gateTimer);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* Clear the local session marker even if the API is unavailable. */
    }
    clearSession();
    localStorage.removeItem("user");
    setShowLogoutConfirm(false);
    sessionStorage.setItem("introPlayed", "true");
    sessionStorage.setItem("landingSeen", "true");
  };

  useEffect(() => {
    const handlePageShow = (e) => {
      if (e.persisted || !hasUserSession()) {
        if (!hasUserSession()) {
          clearSession();
        }
      }
      api.get("/users/me").then((res) => {
        if (res.data?.user) {
          establishSession(res.data.user);
        } else {
          clearSession();
        }
      }).catch((err) => {
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          clearSession();
        }
      });
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setAboutIndex((prev) => (prev + 1) % currentAboutImages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [currentAboutImages.length]);

  useEffect(() => {
    const mascotInterval = setInterval(() => {
      setMascotFrame(prev => prev === 1 ? 2 : 1);
    }, 2000);
    return () => clearInterval(mascotInterval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: skipAnim ? 1 : 0 }}
      animate={{ opacity: skipAnim ? 1 : (mounted ? 1 : 0) }}
      transition={{ duration: skipAnim ? 0 : 1.5, ease: "easeOut" }}
      className="relative w-full bg-[#050a14] text-white font-mono overflow-x-hidden selection:bg-[#FF00FF] selection:text-white"
    >
      {/* ── Section 1: Hero ── */}
      <LandingHeroSection
        heroSectionRef={heroSectionRef}
        heroVideoRef={heroVideoRef}
        ambientGated={ambientGated}
        isLoggedIn={isLoggedIn}
        onOpenLogoutConfirm={() => setShowLogoutConfirm(true)}
        onNavigateAuth={onNavigateAuth}
      />

      {/* ── Section 2: Events ── */}
      <LandingEventsSection />

      {/* ── Section 3: About Us ── */}
      <LandingAboutSection
        aboutIndex={aboutIndex}
        currentAboutImage={currentAboutImage}
        slideVariants={slideVariants}
      />

      {/* ── Section 4: Merchandise / Support Us ── */}
      <LandingSupportSection
        isMobile={isMobile}
        isMobileOrTablet={isMobileOrTablet}
        displayedMerch={displayedMerch}
        merchInitial={merchInitial}
      />

      {/* ── Section 5: Find More ── */}
      <LandingFindMoreSection
        isMobile={isMobile}
        mascotFrame={mascotFrame}
      />

      {/* ── Section 6: Need Help? ── */}
      <LandingNeedHelpSection
        isMobile={isMobile}
        isMobileOrTablet={isMobileOrTablet}
        onApplyRequest={handleApplyRequest}
      />

      <ClosingSections isMobile={isMobile} onOpenIdeaModal={openIdeaModal} />

      <AnimatePresence>
        {showServiceModal && (
          <ServiceRequestModal
            initialLocation={detectedLocation}
            initialBookingId={serviceManageState?.bookingId}
            initialToken={serviceManageState?.token}
            initialAction={serviceManageState?.action}
            onClose={() => {
              setShowServiceModal(false);
              setDetectedLocation("");
              setServiceManageState(null);
            }}
            onRequireAuth={() => {
              setShowServiceModal(false);
              setDetectedLocation("");
              setServiceManageState(null);
              onNavigateAuth?.();
            }}
          />
        )}
        {showLogoutConfirm && (
          <LogoutConfirmModal
            onConfirm={handleLogout}
            onCancel={() => setShowLogoutConfirm(false)}
          />
        )}
        {showIdeaModal && (
          <IdeaCommentModal onClose={closeIdeaModal} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

import express from "express";
import fs from "node:fs";
import path from "node:path";
import {
  register, login, requestOtp, verifyOtp, completeRegistration,
  requestPasswordReset, resetPassword, getResetPasswordStatus, recommendStrongPassword, checkUsername, verifyJitPassword, getMe,
  updateMe, deleteMe, changePassword
} from "../controllers/authController.js";
import { updateLiveLocation, getNearbyUsers, setLiveLocationPreference, setOffline } from "../controllers/locationController.js";
import { searchIndonesianLocations, reverseGeocodeLocation } from "../controllers/geoController.js";
import { getMedia, createMedia } from "../controllers/mediaController.js";
import {
  createMiniEvent,
  getActiveMiniEvents,
  updateMiniEvent,
  deleteMiniEvent,
  addMiniEventMedia,
  deleteMiniEventMedia,
  addMiniEventCollaborator,
  requestMiniEventCollab,
  cancelMiniEventCollabRequest,
  getMiniEventCollabRequests,
  acceptMiniEventCollab,
  declineMiniEventCollab,
} from "../controllers/miniEventController.js";
import { createBooking, createServiceRequest, deleteOwnServiceRequest, listPublicServiceBookings, getServiceRequestForEdit, updateServiceRequest, confirmServiceRequest, getServiceBookingTimerBadge } from "../controllers/serviceController.js";
import {
  saveTelemetry, getMapUsers, getAllKalcerians,
  getBlockedUsers, blockUser, unblockUser,
  getFavouriteUsers, favouriteUser, unfavouriteUser,
  getMutedUsers, muteUser, unmuteUser,
} from "../controllers/telemetryController.js";
import {
  getPersonalChatMessages,
  sendPersonalChatMessage,
  deletePersonalChatMessages,
  ackPersonalChatRead,
  getPersonalChatInboxSummary,
  sendChatRtcSignal,
  getChatRtcSignals,
  sendCallSignal,
  getCallSignals,
  clearCallSignals,
  getLiveKitCallToken,
} from "../controllers/personalChatController.js";
import { getMinigameStatus, recordMinigameScore } from "../controllers/minigameController.js";
import { getMyBroadcast, createBroadcast, updateBroadcast, deleteBroadcast } from "../controllers/broadcastController.js";
import { redirectEvent } from "../controllers/redirectController.js";
import { cleanupExpiredBroadcasts } from "../utils/cronWorker.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { requireAdmin, requireJIT } from "../middleware/admin.js";
import { requireEmailAuth, requirePublicSignup } from "../middleware/authAvailability.js";
import {
  createEvent, listEvents, updateEvent, deleteEvent,
} from "../controllers/adminEventController.js";
import {
  createMerch, listMerch, listPublicMerch, updateMerch, toggleSoldOut, deleteMerch, recordMerchSale,
} from "../controllers/adminMerchController.js";
import {
  registerEvent, listPublicEvents, getPublicEvent,
  listRegistrations, confirmRegistrationPayment, deleteRegistration, markPdfExported,
  getEventRegistrationForManage, updateEventRegistration, confirmEventRegistration, deleteOwnEventRegistration,
  getEventRegistrationTimerBadge,
} from "../controllers/eventRegistrationController.js";
import {
  listServiceBookings, confirmServicePayment, deleteServiceBooking, markServicePdf,
  listBookings, confirmBookingPayment, deleteBooking, markBookingPdf, updateServiceStatus,
} from "../controllers/adminServiceController.js";
import {
  listUsers, getUser, setUserRole, deleteUser,
} from "../controllers/adminUserController.js";
import { createComment } from "../controllers/commentController.js";
import { checkCommentDefense } from "../middleware/commentDefense.js";
import {
  checkServiceBookingDefense,
  eventRegistrationDefense,
  authLoginDefense,
  authSignupDefense,
  miniEventDefense,
  googleAuthDefense,
} from "../middleware/ingressDefense.js";
import { startGoogleOAuth, exchangeGoogleOAuth } from "../controllers/googleAuthController.js";
import { searchCitiesEndpoint } from "../utils/cityResolver.js";
import { listComments, togglePinComment, deleteComment } from "../controllers/adminCommentController.js";
import { getEarnings } from "../controllers/adminEarningsController.js";
import { sendGeneralEmail } from "../controllers/emailController.js";
import { listLogs } from "../controllers/auditController.js";
import { exportAllLogs, resetSystem } from "../controllers/adminSystemController.js";
import { logout } from "../controllers/authController.js";
import { issueCsrfToken } from "../middleware/csrf.js";
import {
  getPaymentCapabilities,
  createCheckoutSession,
  getRegistrationPaymentStatus,
  handlePaymentWebhook,
} from "../controllers/paymentController.js";
import {
  verifyMetaWhatsAppWebhook,
  handleInboundWhatsAppWebhook,
} from "../controllers/whatsappWebhookController.js";
import {
  getPublicIntegrationStatus,
  getAdminIntegrationReadiness,
} from "../controllers/integrationController.js";
import {
  bookingRateLimit,
  commentRateLimit,
  jitRateLimit,
  loginIdentityRateLimit,
  loginIpRateLimit,
  miniEventRateLimit,
  otpRequestEmailRateLimit,
  otpRequestIpRateLimit,
  otpVerifyRateLimit,
  passwordResetConfirmRateLimit,
  passwordResetRateLimit,
  signupRateLimit,
  usernameCheckRateLimit,
  googleAuthRateLimit,
  citySearchRateLimit,
} from "../middleware/rateLimit.js";
import crypto from 'node:crypto';

const router = express.Router();

// ─── Health ───────────────────────────────────────────────────────────────────
router.get("/health", (_req, res) => res.json({ ok: true }));

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.get("/auth/csrf", issueCsrfToken);
router.post("/auth/register", signupRateLimit, authSignupDefense, requirePublicSignup, register);
router.post("/auth/register/complete", signupRateLimit, authSignupDefense, requirePublicSignup, completeRegistration);
router.post("/auth/login", loginIpRateLimit, loginIdentityRateLimit, authLoginDefense, login);
router.get("/auth/google/start", googleAuthRateLimit, googleAuthDefense, startGoogleOAuth);
router.post("/auth/google/exchange", googleAuthRateLimit, googleAuthDefense, exchangeGoogleOAuth);
router.post("/auth/logout", logout);
router.post("/auth/otp/request", otpRequestIpRateLimit, otpRequestEmailRateLimit, requireEmailAuth, requestOtp);
router.post("/auth/otp/verify", otpVerifyRateLimit, requireEmailAuth, verifyOtp);
router.post("/auth/password/reset-request", passwordResetRateLimit, requireEmailAuth, requestPasswordReset);
router.post("/auth/password/reset", passwordResetConfirmRateLimit, requireEmailAuth, resetPassword);
router.get("/auth/password/reset-status", getResetPasswordStatus);
router.get("/auth/password/recommend", recommendStrongPassword);
router.get("/auth/check-username/:username", usernameCheckRateLimit, checkUsername);

// ─── Brand Assets ─────────────────────────────────────────────────────────────
router.get("/avatar", (_req, res) => {
  const filePath = path.resolve("backend/assets/logo-avatar.png");
  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.sendFile(filePath);
  }
  return res.redirect("https://kalceria.id/logo-avatar.png");
});

router.get("/logo", (_req, res) => {
  res.redirect(301, "/api/avatar");
});

// ─── User Profile ────────────────────────────────────────────────────────────
router.get("/users/me", requireAuth, getMe);
router.put("/users/me", requireAuth, updateMe);
router.delete("/users/me", requireAuth, deleteMe);
router.post("/auth/password/change", requireAuth, changePassword);

// ─── Events (Public) ─────────────────────────────────────────────────────────
router.get("/events", listPublicEvents);
router.get("/events/:eventId", getPublicEvent);

// ─── Event Registration (Auth optional / 2-step verification) ───────────────
router.post("/events/:eventId/register", optionalAuth, bookingRateLimit, eventRegistrationDefense, registerEvent);
router.get("/events/registration/:id", optionalAuth, getEventRegistrationForManage);
router.put("/events/registration/:id", optionalAuth, updateEventRegistration);
router.get("/events/registration/:id/confirm", optionalAuth, confirmEventRegistration);
router.post("/events/registration/:id/confirm", optionalAuth, confirmEventRegistration);
router.get("/events/registration/:id/timer.svg", getEventRegistrationTimerBadge);
router.get("/events/registration/:id/timer.gif", getEventRegistrationTimerBadge);
router.delete("/events/registration/:id", optionalAuth, deleteOwnEventRegistration);

// ─── Location & Geocoding ────────────────────────────────────────────────────
router.get("/location/cities", citySearchRateLimit, searchCitiesEndpoint);
router.get("/location/search", searchIndonesianLocations);
router.get("/location/reverse", reverseGeocodeLocation);
router.post("/location/update", requireAuth, updateLiveLocation);
router.patch("/location/visibility", requireAuth, setLiveLocationPreference);
router.post("/location/offline", optionalAuth, setOffline);
router.get("/location/nearby", requireAuth, getNearbyUsers);

// ─── Media ───────────────────────────────────────────────────────────────────
router.get("/media", getMedia);
router.post("/media", requireAdmin, createMedia);
router.get("/merch", listPublicMerch);

// ─── Mini Events ─────────────────────────────────────────────────────────────
router.post("/mini-events", requireAuth, miniEventRateLimit, miniEventDefense, createMiniEvent);
router.get("/mini-events/active", requireAuth, getActiveMiniEvents);
router.put("/mini-events/:id", requireAuth, miniEventRateLimit, miniEventDefense, updateMiniEvent);
router.delete("/mini-events/:id", requireAuth, miniEventRateLimit, deleteMiniEvent);
router.post("/mini-events/:id/media", requireAuth, miniEventRateLimit, addMiniEventMedia);
router.delete("/mini-events/:id/media", requireAuth, miniEventRateLimit, deleteMiniEventMedia);
router.post("/mini-events/:id/collaborators", requireAuth, miniEventRateLimit, addMiniEventCollaborator);
router.post("/mini-events/:id/collab/request", requireAuth, miniEventRateLimit, requestMiniEventCollab);
router.delete("/mini-events/:id/collab/request", requireAuth, miniEventRateLimit, cancelMiniEventCollabRequest);
router.get("/mini-events/:id/collab/requests", requireAuth, getMiniEventCollabRequests);
router.post("/mini-events/:id/collab/requests/:requestId/accept", requireAuth, miniEventRateLimit, acceptMiniEventCollab);
router.post("/mini-events/:id/collab/requests/:requestId/decline", requireAuth, miniEventRateLimit, declineMiniEventCollab);

// ─── Booking (Need Us? Timekeeper) ───────────────────────────────────────────
router.post("/services/book", requireAuth, bookingRateLimit, checkServiceBookingDefense, createBooking);
router.post("/services/request", optionalAuth, bookingRateLimit, checkServiceBookingDefense, createServiceRequest);
router.get("/services/request/:id", optionalAuth, getServiceRequestForEdit);
router.put("/services/request/:id", optionalAuth, bookingRateLimit, updateServiceRequest);
router.get("/services/bookings", listPublicServiceBookings);
router.get("/services/request/:id/confirm", optionalAuth, confirmServiceRequest);
router.post("/services/request/:id/confirm", optionalAuth, confirmServiceRequest);
router.get("/services/request/:id/timer.svg", getServiceBookingTimerBadge);
router.get("/services/request/:id/timer.gif", getServiceBookingTimerBadge);
router.delete("/services/request/:id", optionalAuth, deleteOwnServiceRequest);

// ─── Minigame (Daily Attempt & Score Tracking) ─────────────────────────────────
router.get("/minigame/status", optionalAuth, getMinigameStatus);
router.post("/minigame/score", requireAuth, recordMinigameScore);

// ─── Telemetry & Map ─────────────────────────────────────────────────────────
router.post("/map/telemetry", requireAuth, saveTelemetry);
router.get("/map/users", requireAuth, getMapUsers);
router.get("/map/kalcerians", requireAuth, getAllKalcerians);
// ─── Blocked, Favourited & Muted Users ───────────────────────────────────────
router.get("/map/blocked", requireAuth, getBlockedUsers);
router.post("/map/block/:targetId", requireAuth, blockUser);
router.delete("/map/block/:targetId", requireAuth, unblockUser);
router.get("/map/favourites", requireAuth, getFavouriteUsers);
router.post("/map/favourite/:targetId", requireAuth, favouriteUser);
router.delete("/map/favourite/:targetId", requireAuth, unfavouriteUser);
router.get("/map/muted", requireAuth, getMutedUsers);
router.post("/map/mute/:targetId", requireAuth, muteUser);
router.delete("/map/mute/:targetId", requireAuth, unmuteUser);

// ─── Personal Chat & Call Signaling (E2EE + O(1) Real-Time Sync) ──────────────
router.get("/map/chat-inbox/summary", requireAuth, getPersonalChatInboxSummary);
router.get("/map/chat/:targetId", requireAuth, getPersonalChatMessages);
router.post("/map/chat/:targetId", requireAuth, sendPersonalChatMessage);
router.post("/map/chat/:targetId/read", requireAuth, ackPersonalChatRead);
router.get("/map/chat/:targetId/rtc-signal", requireAuth, getChatRtcSignals);
router.post("/map/chat/:targetId/rtc-signal", requireAuth, sendChatRtcSignal);
router.delete("/map/chat/:targetId", requireAuth, deletePersonalChatMessages);
router.get("/map/call/signals", requireAuth, getCallSignals);
router.delete("/map/call/signals", requireAuth, clearCallSignals);
router.post("/map/call/:targetId/signal", requireAuth, sendCallSignal);
router.get("/map/call/:targetId/livekit-token", requireAuth, getLiveKitCallToken);


// ─── Broadcast ───────────────────────────────────────────────────────────────
router.post("/broadcast", requireAuth, createBroadcast);
router.get("/broadcast/me", requireAuth, getMyBroadcast);
router.put("/broadcast", requireAuth, updateBroadcast);
router.delete("/broadcast", requireAuth, deleteBroadcast);

// ─── Redirect ────────────────────────────────────────────────────────────────
router.get("/redirect/event/:eventId", redirectEvent);

// ─── Admin: Auth / JIT ────────────────────────────────────────────────────────
router.post('/admin/verify-jit', requireAdmin, jitRateLimit, verifyJitPassword);

// ─── Admin: Events ───────────────────────────────────────────────────────────
router.get("/admin/events", requireAdmin, listEvents);
router.post("/admin/events", requireAdmin, createEvent);
router.put("/admin/events/:id", requireAdmin, updateEvent);
router.delete("/admin/events/:id", requireAdmin, requireJIT, deleteEvent);

// ─── Admin: Merch ────────────────────────────────────────────────────────────
router.get("/admin/merch", requireAdmin, listMerch);
router.post("/admin/merch", requireAdmin, createMerch);
router.put("/admin/merch/:id", requireAdmin, updateMerch);
router.patch("/admin/merch/:id/soldout", requireAdmin, toggleSoldOut);
router.post("/admin/merch/:id/sales", requireAdmin, recordMerchSale);
router.delete("/admin/merch/:id", requireAdmin, requireJIT, deleteMerch);

// ─── Admin: Event Registrations ──────────────────────────────────────────────
router.get("/admin/registrations", requireAdmin, listRegistrations);
router.patch("/admin/registrations/:id/payment", requireAdmin, confirmRegistrationPayment);
router.delete("/admin/registrations/:id", requireAdmin, requireJIT, deleteRegistration);
router.patch("/admin/registrations/:id/pdf", requireAdmin, markPdfExported);

// ─── Admin: Service Bookings ──────────────────────────────────────────────────
router.get("/admin/services", requireAdmin, listServiceBookings);
router.patch("/admin/services/:id/payment", requireAdmin, confirmServicePayment);
router.patch("/admin/services/:id/status", requireAdmin, updateServiceStatus);
// Mengamankan aksi destruktif DELETE dengan JIT token
router.delete("/admin/services/:id", requireAdmin, requireJIT, deleteServiceBooking);
router.patch("/admin/services/:id/pdf", requireAdmin, markServicePdf);

// ─── Admin: Need Us Bookings ──────────────────────────────────────────────────
router.get("/admin/bookings", requireAdmin, listBookings);
router.patch("/admin/bookings/:id/payment", requireAdmin, confirmBookingPayment);
router.delete("/admin/bookings/:id", requireAdmin, requireJIT, deleteBooking);
router.patch("/admin/bookings/:id/pdf", requireAdmin, markBookingPdf);

// ─── Admin: Users ─────────────────────────────────────────────────────────────
router.get("/admin/users", requireAdmin, listUsers);
router.get("/admin/users/:id", requireAdmin, getUser);
router.patch("/admin/users/:id/role", requireAdmin, requireJIT, setUserRole);
router.delete("/admin/users/:id", requireAdmin, requireJIT, deleteUser);

// ─── Comments ───────────────────────────────────────────────────────────────
router.post("/comments", optionalAuth, commentRateLimit, checkCommentDefense, createComment);
router.get("/admin/comments", requireAdmin, listComments);
router.patch("/admin/comments/:id/pin", requireAdmin, togglePinComment);
router.delete("/admin/comments/:id", requireAdmin, requireJIT, deleteComment);
router.get("/admin/earnings", requireAdmin, getEarnings);

// ─── Email (Admin utility) ──────────────────────────────────────────────────
router.post("/email", requireAdmin, sendGeneralEmail);

router.get("/admin/logs", requireAdmin, listLogs);

// ─── Admin: System ───────────────────────────────────────────────────────────
router.get("/admin/system/logs", requireAdmin, exportAllLogs);
router.post("/admin/system/reset", requireAdmin, requireJIT, resetSystem);

// ─── Cron ────────────────────────────────────────────────────────────────────
router.get("/cron/cleanup", async (req, res, next) => {
  const configuredSecret = process.env.CRON_SECRET;
  const providedSecret = req.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  if (!configuredSecret) {
    return res.status(503).json({ error: 'Cron endpoint is not configured.' });
  }
  const expected = Buffer.from(configuredSecret);
  const provided = Buffer.from(providedSecret);
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  try {
    const count = await cleanupExpiredBroadcasts();
    res.json({ deleted: count });
  } catch (error) {
    next(error);
  }
});

// ─── Integrations (Capabilities & Broker Readiness) ──────────────────────────
router.get("/integrations/status", getPublicIntegrationStatus);
router.get("/admin/integrations/readiness", requireAdmin, getAdminIntegrationReadiness);

// ─── Payments (Online Events Broker) ─────────────────────────────────────────
router.get("/payments/config", getPaymentCapabilities);
router.post("/payments/events/:registrationId/checkout", optionalAuth, bookingRateLimit, createCheckoutSession);
router.get("/payments/events/:registrationId/status", optionalAuth, getRegistrationPaymentStatus);

// ─── Webhooks (Server-to-Server Broker Callbacks) ────────────────────────────
router.post("/webhooks/payment", handlePaymentWebhook);
router.get("/webhooks/whatsapp", verifyMetaWhatsAppWebhook);
router.post("/webhooks/whatsapp", handleInboundWhatsAppWebhook);

export default router;

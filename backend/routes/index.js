import express from "express";
import {
  register, login, requestOtp, verifyOtp,
  requestPasswordReset, resetPassword, checkUsername, verifyJitPassword, getMe
} from "../controllers/authController.js";
import { updateLiveLocation, getNearbyUsers, setLiveLocationPreference } from "../controllers/locationController.js";
import { getMedia, createMedia } from "../controllers/mediaController.js";
import { createMiniEvent, getActiveMiniEvents, updateMiniEvent, deleteMiniEvent } from "../controllers/miniEventController.js";
import { createBooking, createServiceRequest, deleteOwnServiceRequest, listPublicServiceBookings } from "../controllers/serviceController.js";
import { saveTelemetry, getMapUsers, getAllKalcerians } from "../controllers/telemetryController.js";
import { getMyBroadcast, createBroadcast, updateBroadcast, deleteBroadcast } from "../controllers/broadcastController.js";
import { redirectEvent } from "../controllers/redirectController.js";
import { cleanupExpiredBroadcasts } from "../utils/cronWorker.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { requireAdmin, requireJIT } from "../middleware/admin.js";
import {
  createEvent, listEvents, updateEvent, deleteEvent,
} from "../controllers/adminEventController.js";
import {
  createMerch, listMerch, updateMerch, toggleSoldOut, deleteMerch, recordMerchSale,
} from "../controllers/adminMerchController.js";
import {
  registerEvent, listPublicEvents, getPublicEvent,
  listRegistrations, confirmRegistrationPayment, deleteRegistration, markPdfExported,
} from "../controllers/eventRegistrationController.js";
import {
  listServiceBookings, confirmServicePayment, deleteServiceBooking, markServicePdf,
  listBookings, confirmBookingPayment, deleteBooking, markBookingPdf, updateServiceStatus,
} from "../controllers/adminServiceController.js";
import {
  listUsers, getUser, setUserRole, deleteUser,
} from "../controllers/adminUserController.js";
import { createComment } from "../controllers/commentController.js";
import { listComments, togglePinComment, deleteComment } from "../controllers/adminCommentController.js";
import { getEarnings } from "../controllers/adminEarningsController.js";
import { sendGeneralEmail } from "../controllers/emailController.js";
import { listLogs } from "../controllers/auditController.js";
import { exportAllLogs, resetSystem } from "../controllers/adminSystemController.js";

const router = express.Router();

// ─── Health ───────────────────────────────────────────────────────────────────
router.get("/health", (_req, res) => res.json({ ok: true }));

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.post("/auth/register", register);
router.post("/auth/login", login);
router.post("/auth/otp/request", requestOtp);
router.post("/auth/otp/verify", verifyOtp);
router.post("/auth/password/reset-request", requestPasswordReset);
router.post("/auth/password/reset", resetPassword);
router.get("/auth/check-username/:username", checkUsername);

// ─── User Profile ────────────────────────────────────────────────────────────
router.get("/users/me", requireAuth, getMe);

// ─── Events (Public) ─────────────────────────────────────────────────────────
router.get("/events", listPublicEvents);
router.get("/events/:eventId", getPublicEvent);

// ─── Event Registration (Auth required) ──────────────────────────────────────
router.post("/events/:eventId/register", requireAuth, registerEvent);

// ─── Location ────────────────────────────────────────────────────────────────
router.post("/location/update", requireAuth, updateLiveLocation);
router.patch("/location/visibility", requireAuth, setLiveLocationPreference);
router.get("/location/nearby", requireAuth, getNearbyUsers);

// ─── Media ───────────────────────────────────────────────────────────────────
router.get("/media", getMedia);
router.post("/media", requireAuth, createMedia);

// ─── Mini Events ─────────────────────────────────────────────────────────────
router.post("/mini-events", requireAuth, createMiniEvent);
router.get("/mini-events/active", getActiveMiniEvents);
router.put("/mini-events/:id", requireAuth, updateMiniEvent);
router.delete("/mini-events/:id", requireAuth, deleteMiniEvent);

// ─── Booking (Need Us? Timekeeper) ───────────────────────────────────────────
router.post("/services/book", requireAuth, createBooking);
router.post("/services/request", requireAuth, createServiceRequest);
router.get("/services/bookings", listPublicServiceBookings);
router.delete("/services/request/:id", requireAuth, deleteOwnServiceRequest);

// ─── Telemetry & Map ─────────────────────────────────────────────────────────
router.post("/map/telemetry", requireAuth, saveTelemetry);
router.get("/map/users", requireAuth, getMapUsers);
router.get("/map/kalcerians", requireAuth, getAllKalcerians);

// ─── Broadcast ───────────────────────────────────────────────────────────────
router.post("/broadcast", requireAuth, createBroadcast);
router.get("/broadcast/me", requireAuth, getMyBroadcast);
router.put("/broadcast", requireAuth, updateBroadcast);
router.delete("/broadcast", requireAuth, deleteBroadcast);

// ─── Redirect ────────────────────────────────────────────────────────────────
router.get("/redirect/event/:eventId", redirectEvent);

// ─── Admin: Auth / JIT ────────────────────────────────────────────────────────
router.post('/admin/verify-jit', requireAdmin, verifyJitPassword);

// ─── Admin: Events ───────────────────────────────────────────────────────────
router.get("/admin/events", requireAdmin, listEvents);
router.post("/admin/events", requireAdmin, createEvent);
router.put("/admin/events/:id", requireAdmin, updateEvent);
router.delete("/admin/events/:id", requireAdmin, deleteEvent);

// ─── Admin: Merch ────────────────────────────────────────────────────────────
router.get("/admin/merch", requireAdmin, listMerch);
router.post("/admin/merch", requireAdmin, createMerch);
router.put("/admin/merch/:id", requireAdmin, updateMerch);
router.patch("/admin/merch/:id/soldout", requireAdmin, toggleSoldOut);
router.post("/admin/merch/:id/sales", requireAdmin, recordMerchSale);
router.delete("/admin/merch/:id", requireAdmin, deleteMerch);

// ─── Admin: Event Registrations ──────────────────────────────────────────────
router.get("/admin/registrations", requireAdmin, listRegistrations);
router.patch("/admin/registrations/:id/payment", requireAdmin, confirmRegistrationPayment);
router.delete("/admin/registrations/:id", requireAdmin, deleteRegistration);
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
router.patch("/admin/users/:id/role", requireAdmin, setUserRole);
router.delete("/admin/users/:id", requireAdmin, deleteUser);

// ─── Comments ───────────────────────────────────────────────────────────────
router.post("/comments", optionalAuth, createComment);
router.get("/admin/comments", requireAdmin, listComments);
router.patch("/admin/comments/:id/pin", requireAdmin, togglePinComment);
router.delete("/admin/comments/:id", requireAdmin, deleteComment);
router.get("/admin/earnings", requireAdmin, getEarnings);

// ─── Email (Admin utility) ──────────────────────────────────────────────────
router.post("/email", requireAdmin, sendGeneralEmail);

router.get("/admin/logs", requireAdmin, listLogs);

// ─── Admin: System ───────────────────────────────────────────────────────────
router.get("/admin/system/logs", requireAdmin, exportAllLogs);
router.post("/admin/system/reset", requireAdmin, requireJIT, resetSystem);

// ─── Cron ────────────────────────────────────────────────────────────────────
router.get("/cron/cleanup", async (_req, res) => {
  const count = await cleanupExpiredBroadcasts();
  res.json({ deleted: count });
});

export default router;

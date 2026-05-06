import express from 'express';
import {
  register, login, requestOtp, verifyOtp,
  requestPasswordReset, resetPassword,
} from '../controllers/authController.js';
import { updateLiveLocation, getNearbyUsers } from '../controllers/locationController.js';
import { getMedia, createMedia } from '../controllers/mediaController.js';
import { createMiniEvent, getActiveMiniEvents } from '../controllers/miniEventController.js';
import { createBooking } from '../controllers/serviceController.js';
import { saveTelemetry, getMapUsers } from '../controllers/telemetryController.js';
import { createBroadcast, updateBroadcast, deleteBroadcast } from '../controllers/broadcastController.js';
import { redirectEvent } from '../controllers/redirectController.js';
import { cleanupExpiredBroadcasts } from '../utils/cronWorker.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import {
  createEvent, listEvents, updateEvent, deleteEvent,
} from '../controllers/adminEventController.js';
import {
  createMerch, listMerch, updateMerch, toggleSoldOut, deleteMerch,
} from '../controllers/adminMerchController.js';

const router = express.Router();

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/auth/otp/request', requestOtp);
router.post('/auth/otp/verify', verifyOtp);
router.post('/auth/password/reset-request', requestPasswordReset);
router.post('/auth/password/reset', resetPassword);

// ─── Location ────────────────────────────────────────────────────────────────
router.post('/location/update', requireAuth, updateLiveLocation);
router.get('/location/nearby', requireAuth, getNearbyUsers);

// ─── Media ───────────────────────────────────────────────────────────────────
router.get('/media', getMedia);
router.post('/media', requireAuth, createMedia);

// ─── Mini Events ─────────────────────────────────────────────────────────────
router.post('/mini-events', requireAuth, createMiniEvent);
router.get('/mini-events/active', getActiveMiniEvents);

// ─── Booking (Need Us? Timekeeper) ───────────────────────────────────────────
router.post('/services/book', requireAuth, createBooking);

// ─── Telemetry & Map ─────────────────────────────────────────────────────────
router.post('/map/telemetry', requireAuth, saveTelemetry);
router.get('/map/users', requireAuth, getMapUsers);

// ─── Broadcast ───────────────────────────────────────────────────────────────
router.post('/broadcast', requireAuth, createBroadcast);
router.put('/broadcast', requireAuth, updateBroadcast);
router.delete('/broadcast', requireAuth, deleteBroadcast);

// ─── Redirect ────────────────────────────────────────────────────────────────
router.get('/redirect/event/:eventId', redirectEvent);

// ─── Admin: Events ───────────────────────────────────────────────────────────
router.get('/admin/events', requireAdmin, listEvents);
router.post('/admin/events', requireAdmin, createEvent);
router.put('/admin/events/:id', requireAdmin, updateEvent);
router.delete('/admin/events/:id', requireAdmin, deleteEvent);

// ─── Admin: Merch ────────────────────────────────────────────────────────────
router.get('/admin/merch', requireAdmin, listMerch);
router.post('/admin/merch', requireAdmin, createMerch);
router.put('/admin/merch/:id', requireAdmin, updateMerch);
router.patch('/admin/merch/:id/soldout', requireAdmin, toggleSoldOut);
router.delete('/admin/merch/:id', requireAdmin, deleteMerch);

// ─── Cron ────────────────────────────────────────────────────────────────────
router.get('/cron/cleanup', async (_req, res) => {
  const count = await cleanupExpiredBroadcasts();
  res.json({ deleted: count });
});

export default router;

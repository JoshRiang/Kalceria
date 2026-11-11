import jwt from 'jsonwebtoken';
import { THREE_MINUTES_MS } from './serviceBookingConstants.js';

export function verifyServiceBookingAuthorization(booking, req) {
  const userId = req.user?.userId || null;
  const tokenHeader = (typeof req.get === 'function' ? (req.get('x-manage-token') || req.get('x-cancel-token')) : (req.headers?.['x-manage-token'] || req.headers?.['x-cancel-token'])) || req.query?.manage_token || req.query?.token || '';

  let validTokenBookingId = null;
  let isTokenExpired = false;
  if (tokenHeader) {
    const cancelSecret = process.env.JWT_SECRET || 'kalceria-service-cancel-fallback-secret';
    try {
      const decoded = jwt.verify(tokenHeader, cancelSecret, {
        algorithms: ['HS256'],
        issuer: 'kalceria-api',
      });
      validTokenBookingId = decoded?.bookingId || null;
    } catch (err) {
      if (err?.name === 'TokenExpiredError') {
        isTokenExpired = true;
        const decoded = jwt.decode(tokenHeader);
        if (decoded?.bookingId && decoded.bookingId === booking.id) {
          validTokenBookingId = booking.id;
        }
      }
    }
  }

  const authorizedByUser = Boolean(userId && booking.requestorId === userId);
  const authorizedByToken = Boolean(validTokenBookingId && validTokenBookingId === booking.id);
  const isRecentGuest = Boolean(
    booking.requestor?.email?.endsWith('@guest.kalceria.local') &&
    Date.now() - new Date(booking.createdAt).getTime() <= THREE_MINUTES_MS
  );

  req._serviceTokenExpired = isTokenExpired;
  return authorizedByUser || authorizedByToken || isRecentGuest;
}


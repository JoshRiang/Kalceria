import jwt from 'jsonwebtoken';
import { THREE_MINUTES_MS } from './eventRegistrationConstants.js';

export function verifyEventRegistrationAuthorization(registration, req) {
  const userId = req.user?.userId || null;
  const tokenHeader = (typeof req.get === 'function' ? (req.get('x-manage-token') || req.get('x-cancel-token')) : (req.headers?.['x-manage-token'] || req.headers?.['x-cancel-token'])) || req.query?.manage_token || req.query?.token || '';

  let validTokenRegId = null;
  let isTokenExpired = false;
  if (tokenHeader) {
    const cancelSecret = process.env.JWT_SECRET || 'kalceria-service-cancel-fallback-secret';
    try {
      const decoded = jwt.verify(tokenHeader, cancelSecret, {
        algorithms: ['HS256'],
        issuer: 'kalceria-api',
      });
      validTokenRegId = decoded?.registrationId || null;
    } catch (err) {
      if (err?.name === 'TokenExpiredError') {
        isTokenExpired = true;
        const decoded = jwt.decode(tokenHeader);
        if (decoded?.registrationId && decoded.registrationId === registration.id) {
          validTokenRegId = registration.id;
        }
      }
    }
  }

  const authorizedByUser = Boolean(userId && registration.userId === userId);
  const authorizedByToken = Boolean(validTokenRegId && validTokenRegId === registration.id);
  const isRecentPending = Boolean(
    registration.paymentStatus === 'PENDING' &&
    Date.now() - new Date(registration.createdAt).getTime() <= THREE_MINUTES_MS
  );

  req._eventTokenExpired = isTokenExpired;
  return authorizedByUser || authorizedByToken || isRecentPending;
}


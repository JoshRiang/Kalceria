import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';
import {
  clearAuthCookie,
  createAuthSession,
  getRequestToken,
  revokeAuthSession,
  revokeUserSessions,
  setAuthCookie,
} from '../../utils/authSession.js';
import {
  ensurePersistentUserProfile,
  getDeterministicAvatarUrl,
  getDeterministicCoverColor,
  sanitizeCoverMediaUrl,
} from '../../utils/profileDefaults.js';
import {
  PASSWORD_REGEX,
  isPasswordInHistory,
  getUpdatedPasswordHistory,
  csrfCookieOptions,
} from './passwordUtils.js';
import { sanitizeProfilePicture } from './domicileHelpers.js';
import {
  cleanupUserDatabaseRecords,
  purgeUserRedisFootprint,
} from './cleanupUserFootprint.js';

// get current user profile (for map page etc)
export async function getMe(req, res, next) {
  try {
    const userId = req.user.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        nickname: true,
        email: true,
        phone: true,
        profilePicture: true,
        allowLiveLocation: true,
        domicileLat: true,
        domicileLng: true,
        socialPlatform: true,
        socialLink: true,
        createdAt: true,
        broadcast: {
          select: { id: true, message: true, expiresAt: true, createdAt: true },
        },
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found.' });

    // only return broadcast if not expired
    const now = new Date();
    const broadcast = user.broadcast && user.broadcast.expiresAt > now ? user.broadcast : null;
    const enrichedUser = await ensurePersistentUserProfile({ ...user, broadcast });

    // Keep live presence coherent in Redis whenever authenticated user is active
    try {
      const lat = user.domicileLat || -6.2735;
      const lng = user.domicileLng || 106.7110;
      await redis.geoadd('active_users', lng, lat, userId);
      await redis.set(
        `live:user:${userId}`,
        JSON.stringify({ lat, lng, updatedAt: Date.now() }),
        'EX',
        600
      );
    } catch {}

    res.json({ user: enrichedUser });
  } catch (err) {
    next(err);
  }
}

// update current user profile
export async function updateMe(req, res, next) {
  try {
    const userId = req.user.userId;
    const {
      name,
      displayName,
      nickname,
      phone,
      whatsapp,
      instagram,
      bio,
      alasanMasuk,
      reason,
      coverImage,
      coverUrl,
      coverType,
      socialPlatform,
      socialLink,
      profilePicture,
    } = req.body || {};

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, nickname: true, profilePicture: true },
    });
    if (!existingUser) return res.status(404).json({ error: 'User not found.' });

    const updateData = {};
    const resolvedName = typeof name === 'string' && name.trim()
      ? name.trim()
      : typeof displayName === 'string' && displayName.trim()
        ? displayName.trim()
        : null;
    if (resolvedName) updateData.name = resolvedName.slice(0, 100);
    if (typeof nickname === 'string') updateData.nickname = nickname.trim().slice(0, 50) || null;

    const rawPhone = typeof phone === 'string' ? phone : typeof whatsapp === 'string' ? whatsapp : undefined;
    if (rawPhone !== undefined) {
      updateData.phone = rawPhone.trim().slice(0, 30) || '-';
    }

    if (socialPlatform !== undefined) {
      updateData.socialPlatform = ['WA', 'IG', 'FB', 'NULL'].includes(socialPlatform) ? socialPlatform : 'NULL';
    }
    if (socialLink !== undefined) {
      updateData.socialLink = typeof socialLink === 'string' ? socialLink.trim().slice(0, 200) : null;
    }

    if (profilePicture !== undefined) {
      const sanitizedPic = sanitizeProfilePicture(profilePicture);
      // If user explicitly cleared custom avatar (null/empty), fall back to their deterministic persistent avatar
      updateData.profilePicture =
        sanitizedPic || getDeterministicAvatarUrl(existingUser);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        nickname: true,
        email: true,
        profilePicture: true,
        phone: true,
        socialPlatform: true,
        socialLink: true,
        allowLiveLocation: true,
        domicileLat: true,
        domicileLng: true,
        createdAt: true,
      },
    });

    // Update persistent profile metadata in Redis (coverImage, bio, social handles, profilePicture)
    const metaKey = `user:profile_meta:${userId}`;
    let meta = {};
    try {
      const existingMeta = await redis.get(metaKey);
      if (existingMeta) meta = JSON.parse(existingMeta);
    } catch {}

    meta.profilePicture = user.profilePicture;

    const rawCover = coverImage !== undefined ? coverImage : coverUrl;
    if (rawCover !== undefined) {
      const sanitizedCover = sanitizeCoverMediaUrl(rawCover);
      const finalCover = sanitizedCover || getDeterministicCoverColor(user);
      meta.coverImage = finalCover;
      meta.coverUrl = finalCover;
    } else if (!meta.coverImage) {
      const defaultCover = getDeterministicCoverColor(user);
      meta.coverImage = defaultCover;
      meta.coverUrl = defaultCover;
    }

    if (coverType !== undefined) {
      meta.coverType = coverType === 'video' ? 'video' : 'image';
    } else if (meta.coverImage) {
      const isVid = /\.(?:mp4|webm|mov|m4v)(?:$|\?|#)/i.test(String(meta.coverImage)) || String(meta.coverImage).includes('/api/blob/raw');
      meta.coverType = isVid ? 'video' : 'image';
    }

    const rawBio = bio !== undefined ? bio : alasanMasuk !== undefined ? alasanMasuk : reason;
    if (rawBio !== undefined && typeof rawBio === 'string') {
      meta.bio = rawBio.trim().slice(0, 120);
      meta.alasanMasuk = meta.bio;
      meta.reason = meta.bio;
    }

    if (rawPhone !== undefined) {
      meta.phone = rawPhone.trim().slice(0, 30);
      meta.whatsapp = meta.phone;
    }
    if (instagram !== undefined && typeof instagram === 'string') {
      meta.instagram = instagram.trim().replace(/^@/, '').slice(0, 60);
    }

    await Promise.allSettled([
      redis.set(metaKey, JSON.stringify(meta)),
      redis.del('cache:all_kalcerians'),
      redis.del('cache:map_users_enriched'),
      redis.del('cache:map_users:global'),
    ]);

    const enrichedUser = await ensurePersistentUserProfile(user);

    res.json({ message: 'Profile updated successfully.', user: enrichedUser });
  } catch (err) {
    next(err);
  }
}

// delete own account (Quit style with full cascading cleanup & session revocation)
export async function deleteMe(req, res, next) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    if (user.role === 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'The last admin account cannot be deleted.' });
      }
    }

    const token = getRequestToken(req);
    if (token) await revokeAuthSession(token);
    await revokeUserSessions(userId);

    // Transactional relational database cleanup across all user entities
    const { ownedEventIds } = await prisma.$transaction(
      (tx) => cleanupUserDatabaseRecords(tx, userId),
      { maxWait: 10000, timeout: 25000 }
    );

    await purgeUserRedisFootprint(userId, user.email, ownedEventIds);

    clearAuthCookie(res);
    res.clearCookie('csrfToken', csrfCookieOptions());
    return res.json({ message: 'Account deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

// change password for logged in user
export async function changePassword(req, res, next) {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body || {};

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length > 128 || !PASSWORD_REGEX.test(newPassword)) {
      return res.status(400).json({ error: 'New password must have min 8 chars, uppercase, number, and special char.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, passwordHash: true, passwordHistory: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const valid = await argon2.verify(user.passwordHash, currentPassword).catch(() => false);
    if (!valid) return res.status(401).json({ error: 'Incorrect current password.' });

    const isUsedBefore = await isPasswordInHistory(user, newPassword);
    if (isUsedBefore) {
      return res.status(400).json({ error: 'Password baru tidak boleh sama dengan password sebelumnya.' });
    }

    const updatedHistory = getUpdatedPasswordHistory(user);
    const passwordHash = await argon2.hash(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordHistory: updatedHistory,
      },
    });
    await revokeUserSessions(userId);

    // Re-issue clean authenticated session
    const sessionToken = await createAuthSession(user.id, user.role);
    setAuthCookie(res, sessionToken);

    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    next(err);
  }
}

// ─── Just-In-Time (JIT) Verification ─────────────────────────────────────────
export async function verifyJitPassword(req, res, next) {
  try {
    const { password } = req.body || {};
    if (typeof password !== 'string' || password.length > 128) {
      return res.status(400).json({ error: 'Please provide a valid password.' });
    }
    // req.user diset oleh middleware requireAuth/requireAdmin
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });

    if (!user) return res.status(401).json({ error: 'User not found.' });

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) return res.status(401).json({ error: 'Incorrect password for JIT access.' });

    const jti = crypto.randomUUID();
    const jitToken = jwt.sign(
      { userId: user.id, isJit: true },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', audience: 'kalceria-admin-action', issuer: 'kalceria-api', jwtid: jti, expiresIn: '15m' }
    );
    await redis.set(`auth:jit:${jti}`, user.id, 'EX', 15 * 60);

    res.json({ jitToken, message: 'JIT access granted for 15 minutes.' });
  } catch (err) {
    next(err);
  }
}

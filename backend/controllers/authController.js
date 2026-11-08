import argon2 from 'argon2';
import prisma from '../lib/prisma.js';
import { redis } from '../lib/redis.js';
import {
  clearAuthCookie,
  createAuthSession,
  getRequestToken,
  revokeAuthSession,
  setAuthCookie,
} from '../utils/authSession.js';
import {
  ensurePersistentUserProfile,
  getDeterministicAvatarUrl,
} from '../utils/profileDefaults.js';
import { resolveAndValidateCity } from '../utils/cityResolver.js';
import {
  PASSWORD_REGEX,
  generateNaturalStrongPassword,
  recommendStrongPassword,
  isPasswordInHistory,
  getUpdatedPasswordHistory,
  csrfCookieOptions,
  issueLoginCsrfToken,
  CITY_COORDS,
  resolveDomicileCoords,
  sanitizeProfilePicture,
  getDummyPasswordHash,
  sendVerificationOtp,
  requestOtp,
  verifyOtp,
  requestPasswordReset,
  resetPassword,
  getResetPasswordStatus,
  getMe,
  updateMe,
  deleteMe,
  changePassword,
  verifyJitPassword,
} from './auth/index.js';

export {
  generateNaturalStrongPassword,
  recommendStrongPassword,
  isPasswordInHistory,
  getUpdatedPasswordHistory,
  issueLoginCsrfToken,
  sendVerificationOtp,
  requestOtp,
  verifyOtp,
  requestPasswordReset,
  resetPassword,
  getResetPasswordStatus,
  getMe,
  updateMe,
  deleteMe,
  changePassword,
  verifyJitPassword,
};

// ─── Register ────────────────────────────────────────────────────────────────
export async function register(req, res, next) {
  try {
    const {
      name, dob, email, gender, phone, password,
      domicile, domicileLat, domicileLng, profilePicture,
    } = req.body || {};

    if (
      typeof name !== 'string' || !name.trim() || name.trim().length > 80
      || typeof email !== 'string' || email.length > 254
      || (phone !== undefined && phone !== null && phone !== '' && (typeof phone !== 'string' || phone.trim().length > 32))
      || typeof dob !== 'string' || !Number.isFinite(new Date(dob).getTime())
      || (domicile !== undefined && (typeof domicile !== 'string' || domicile.length > 120))
    ) {
      return res.status(400).json({ error: 'Please provide valid registration details.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    if (gender && !['MALE', 'FEMALE', 'OTHER'].includes(String(gender).toUpperCase())) {
      return res.status(400).json({ error: 'Please provide a valid gender.' });
    }

    let parsedLat = 0;
    let parsedLng = 0;
    if (domicileLat !== undefined || domicileLng !== undefined) {
      parsedLat = domicileLat === undefined ? 0 : Number(domicileLat);
      parsedLng = domicileLng === undefined ? 0 : Number(domicileLng);
    } else if (typeof domicile === 'string' && domicile.trim()) {
      const cityResolved = await resolveAndValidateCity(domicile, {
        domicileLat,
        domicileLng,
        cityToken: req.body?.cityToken,
      });
      if (cityResolved.valid && Array.isArray(cityResolved.coords)) {
        [parsedLat, parsedLng] = cityResolved.coords;
      } else {
        [parsedLat, parsedLng] = resolveDomicileCoords(domicile, domicileLat, domicileLng);
      }
    }

    if (
      !Number.isFinite(parsedLat) || parsedLat < -90 || parsedLat > 90
      || !Number.isFinite(parsedLng) || parsedLng < -180 || parsedLng > 180
    ) {
      return res.status(400).json({ error: 'Please provide valid domicile coordinates.' });
    }

    if (typeof password !== 'string' || password.length > 128 || !PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        error: 'Password min 8 chars, uppercase, number, special char required.',
      });
    }

    const exists = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (exists) {
      if (exists.isEmailVerified) {
        return res.status(409).json({ error: 'Email already registered.' });
      }
      // Stale / torn unverified registration from previous attempt: clean up so user can re-register cleanly
      await prisma.user.delete({ where: { id: exists.id } }).catch(() => {});
    }

    const passwordHash = await argon2.hash(password);
    const safeAvatar = sanitizeProfilePicture(profilePicture);
    const safePhone = (typeof phone === 'string' && phone.trim()) ? phone.trim().slice(0, 32) : '-';
    const emailAuthOn = process.env.ENABLE_EMAIL_AUTH === 'true';

    // Store pending registration payload in Redis (TTL: 1 hour)
    // The account is ONLY committed to PostgreSQL when the user finishes choosing their username (Done)
    const pendingData = {
      name: name.trim(),
      dob: new Date(dob).toISOString(),
      email: normalizedEmail,
      gender: gender ? gender.toUpperCase() : 'OTHER',
      phone: safePhone,
      passwordHash,
      profilePicture: safeAvatar,
      domicileLat: parsedLat,
      domicileLng: parsedLng,
    };
    await redis.set(`pending:register:${normalizedEmail}`, JSON.stringify(pendingData), 'EX', 3600);

    if (emailAuthOn) {
      try {
        await sendVerificationOtp(normalizedEmail);
      } catch (err) {
        await redis.del(`otp:${normalizedEmail}`);
        await redis.del(`pending:register:${normalizedEmail}`);
        console.error('[OTP] Registration email delivery failed:', err.message);
        return res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
      }
    }

    res.status(201).json({
      message: emailAuthOn ? 'Registered. Check email for OTP.' : 'Registration successful.',
      emailVerificationRequired: emailAuthOn,
      email: normalizedEmail,
    });
  } catch (err) {
    next(err);
  }
}

// ─── Login ───────────────────────────────────────────────────────────────────
export async function login(req, res, next) {
  try {
    const { email, username, password } = req.body || {};
    if (
      typeof password !== 'string' || password.length > 128
      || (email !== undefined && (typeof email !== 'string' || email.length > 254))
      || (username !== undefined && (typeof username !== 'string' || username.length > 254))
    ) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const rawIdentifier = typeof email === 'string' && email.trim()
      ? email.trim()
      : typeof username === 'string' && username.trim()
        ? username.trim()
        : null;

    const user = rawIdentifier
      ? (rawIdentifier.includes('@')
        ? await prisma.user.findUnique({ where: { email: rawIdentifier.toLowerCase() } })
        : await prisma.user.findFirst({
          where: {
            OR: [
              { name: { equals: rawIdentifier, mode: 'insensitive' } },
              { nickname: { equals: rawIdentifier, mode: 'insensitive' } },
            ],
          },
        }))
      : null;

    if (!user) {
      await argon2.verify(await getDummyPasswordHash(), password).catch(() => false);
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials.' });

    if (
      process.env.ENABLE_EMAIL_AUTH === 'true'
      && user.role !== 'ADMIN'
      && !user.isEmailVerified
    ) {
      return res.status(403).json({ error: 'Verify your email before signing in.' });
    }

    const token = await createAuthSession(user);
    setAuthCookie(res, token);
    const csrfToken = issueLoginCsrfToken(res);

    // Auto-mark user active in Redis so online status is immediately coherent
    try {
      const lat = user.domicileLat || -6.2735;
      const lng = user.domicileLng || 106.7110;
      await redis.geoadd('active_users', lng, lat, user.id);
      await redis.set(
        `live:user:${user.id}`,
        JSON.stringify({ lat, lng, updatedAt: Date.now() }),
        'EX',
        600
      );
      await prisma.user.update({
        where: { id: user.id },
        data: { allowLiveLocation: true },
      }).catch(() => {});
      await redis.del('cache:all_kalcerians');
      await redis.del('cache:map_users:global');
    } catch {}

    res.json({
      userId: user.id,
      username: user.nickname || (user.email ? user.email.split('@')[0] : 'User'),
      role: user.role,
      profilePicture: user.profilePicture || null,
      csrfToken,
    });
  } catch (err) {
    next(err);
  }
}

// ─── Complete Registration (Choose Username & Commit to Postgres) ─────────────
export async function completeRegistration(req, res, next) {
  try {
    const { email, username, profilePicture: fallbackRawAvatar } = req.body || {};
    if (
      typeof email !== 'string' || !email.trim()
      || typeof username !== 'string' || !username.trim()
      || username.trim().length > 50
    ) {
      return res.status(400).json({ error: 'Please provide a valid email and username.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();
    const fallbackAvatar = sanitizeProfilePicture(fallbackRawAvatar);

    // Verify OTP was passed for this email
    const isVerified = await redis.get(`pending:verified:${normalizedEmail}`);
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!isVerified && (!existingUser || !existingUser.isEmailVerified)) {
      return res.status(400).json({ error: 'Please verify OTP before choosing a username.' });
    }

    // Check if username is already taken by someone else
    const taken = await prisma.user.findFirst({
      where: {
        OR: [
          { name: { equals: cleanUsername, mode: 'insensitive' } },
          { nickname: { equals: cleanUsername, mode: 'insensitive' } },
        ],
      },
    });
    if (taken && taken.email.toLowerCase() !== normalizedEmail) {
      console.warn(`[CompleteRegistration] Username taken by: ${taken.email} (matching ${cleanUsername})`);
      return res.status(409).json({ error: 'Username is already taken.' });
    }

    // Retrieve pending registration data
    const pendingJson = await redis.get(`pending:register:${normalizedEmail}`);
    let user;

    if (pendingJson) {
      const data = JSON.parse(pendingJson);
      const initialAvatar =
        data.profilePicture ||
        fallbackAvatar ||
        getDeterministicAvatarUrl({ nickname: cleanUsername, name: data.name });
      // Atomically commit the user record to PostgreSQL now that username is finalized
      user = await prisma.user.create({
        data: {
          name: data.name,
          nickname: cleanUsername,
          dob: new Date(data.dob),
          email: data.email,
          gender: data.gender || 'OTHER',
          phone: data.phone || '-',
          passwordHash: data.passwordHash,
          profilePicture: initialAvatar,
          domicileLat: data.domicileLat,
          domicileLng: data.domicileLng,
          isEmailVerified: true,
        },
      });

      // Cleanup pending Redis states & initialize persistent profile metadata
      await Promise.allSettled([
        redis.del(`pending:register:${normalizedEmail}`),
        redis.del(`pending:verified:${normalizedEmail}`),
        redis.del(`otp:${normalizedEmail}`),
        redis.del('cache:all_kalcerians'),
        redis.del('cache:map_users_enriched'),
        redis.del('cache:map_users:global'),
        ensurePersistentUserProfile(user),
      ]);
    } else if (existingUser) {
      const initialAvatar =
        existingUser.profilePicture ||
        fallbackAvatar ||
        getDeterministicAvatarUrl({ id: existingUser.id, nickname: cleanUsername, name: existingUser.name });
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          nickname: cleanUsername,
          profilePicture: initialAvatar,
          isEmailVerified: true,
        },
      });
      await Promise.allSettled([
        redis.del(`pending:verified:${normalizedEmail}`),
        redis.del('cache:all_kalcerians'),
        redis.del('cache:map_users_enriched'),
        redis.del('cache:map_users:global'),
        ensurePersistentUserProfile(user),
      ]);
    } else {
      return res.status(400).json({ error: 'Registration session expired. Please register again.' });
    }

    // Issue clean authenticated session & cookie
    const token = await createAuthSession(user);
    setAuthCookie(res, token);
    const csrfToken = issueLoginCsrfToken(res);

    // Auto-mark user active in Redis so online status is immediately coherent
    try {
      const lat = user.domicileLat || -6.2735;
      const lng = user.domicileLng || 106.7110;
      await redis.geoadd('active_users', lng, lat, user.id);
      await redis.set(
        `live:user:${user.id}`,
        JSON.stringify({ lat, lng, updatedAt: Date.now() }),
        'EX',
        600
      );
      await prisma.user.update({
        where: { id: user.id },
        data: { allowLiveLocation: true },
      }).catch(() => {});
      await redis.del('cache:all_kalcerians');
      await redis.del('cache:map_users:global');
    } catch {}

    res.status(201).json({
      message: 'Registration completed successfully.',
      userId: user.id,
      username: user.nickname || user.name,
      user: {
        id: user.id,
        name: user.name,
        nickname: user.nickname,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture || null,
      },
      csrfToken,
    });
  } catch (err) {
    next(err);
  }
}

// ─── Check Username / Email Existence ────────────────────────────────────────
export async function checkUsername(req, res, next) {
  try {
    const raw = typeof req.params.username === 'string' ? req.params.username.trim() : '';
    if (!raw || raw.length > 254) return res.status(400).json({ exists: false });
    const user = raw.includes('@')
      ? await prisma.user.findUnique({ where: { email: raw.toLowerCase() }, select: { id: true } })
      : await prisma.user.findFirst({
        where: {
          OR: [
            { name: { equals: raw, mode: 'insensitive' } },
            { nickname: { equals: raw, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });

    res.json({ exists: Boolean(user) });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const token = getRequestToken(req);
    if (token) await revokeAuthSession(token);
    clearAuthCookie(res);
    res.clearCookie('csrfToken', csrfCookieOptions());
    return res.json({ message: 'Signed out.' });
  } catch (err) {
    clearAuthCookie(res);
    res.clearCookie('csrfToken', csrfCookieOptions());
    return next(err);
  }
}

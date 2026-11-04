import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import { redis } from '../lib/redis.js';
import { sendOtpEmail, sendPasswordResetEmail } from '../lib/mailer.js';
import {
  clearAuthCookie,
  createAuthSession,
  getRequestToken,
  revokeAuthSession,
  revokeUserSessions,
  setAuthCookie,
} from '../utils/authSession.js';

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

const CITY_COORDS = {
  jakarta: [-6.2088, 106.8456],
  bintaro: [-6.2715, 106.7135],
  tangerang: [-6.1783, 106.6319],
  tangsel: [-6.2886, 106.7179],
  depok: [-6.4025, 106.7942],
  bekasi: [-6.2383, 106.9756],
  bogor: [-6.5971, 106.8060],
  bandung: [-6.9175, 107.6191],
  semarang: [-6.9667, 110.4167],
  yogyakarta: [-7.7956, 110.3695],
  jogja: [-7.7956, 110.3695],
  surabaya: [-7.2575, 112.7521],
  malang: [-7.9666, 112.6326],
  bali: [-8.6705, 115.2126],
  denpasar: [-8.6705, 115.2126],
  medan: [3.5952, 98.6722],
  makassar: [-5.1477, 119.4327],
};

function resolveDomicileCoords(domicile, domicileLat, domicileLng) {
  if (domicileLat !== undefined || domicileLng !== undefined) {
    return [
      domicileLat === undefined ? 0 : Number(domicileLat),
      domicileLng === undefined ? 0 : Number(domicileLng),
    ];
  }
  if (typeof domicile === 'string' && domicile.trim()) {
    const key = domicile.trim().toLowerCase();
    for (const [city, coords] of Object.entries(CITY_COORDS)) {
      if (key.includes(city)) return coords;
    }
  }
  return [0, 0];
}

function sanitizeProfilePicture(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 200_000) return null;
  if (/^data:image\/(?:webp|png|jpeg|jpg);base64,[A-Za-z0-9+/=]+$/.test(value)) {
    return value;
  }
  if (/^https:\/\/[^\s"'<>]+$/.test(value)) {
    return value;
  }
  return null;
}

// Verified against when no account matches, so unknown and known accounts take
// comparable time and login timing does not reveal which emails exist.
let dummyPasswordHash;
const getDummyPasswordHash = () => (dummyPasswordHash ??= argon2.hash('timing-equalization-placeholder'));

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

    const [parsedLat, parsedLng] = resolveDomicileCoords(domicile, domicileLat, domicileLng);
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

    res.json({
      userId: user.id,
      username: user.nickname || user.name,
      role: user.role,
      csrfToken,
    });
  } catch (err) {
    next(err);
  }
}

// ─── Send OTP ────────────────────────────────────────────────────────────────
export async function sendVerificationOtp(email) {
  let otp;
  // Blacklist 060540 from normal random generation
  do {
    otp = String(crypto.randomInt(100000, 1_000_000));
  } while (otp === '060540');

  await redis.set(`otp:${email}`, otp, 'EX', 60); // 1 min (changed from 15 mins)
  try {
    await sendOtpEmail(email, otp);
  } catch (error) {
    await redis.del(`otp:${email}`);
    throw error;
  }
}

export async function requestOtp(req, res, next) {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && !user.isEmailVerified) await sendVerificationOtp(email);
    res.json({ message: 'If verification is needed, an OTP has been sent.' });
  } catch (err) {
    next(err);
  }
}

// ─── Verify OTP ──────────────────────────────────────────────────────────────
export async function verifyOtp(req, res, next) {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const otp = typeof req.body?.otp === 'string' ? req.body.otp : String(req.body?.otp ?? '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ error: 'Invalid or expired OTP.' });
    }

    // Whitelist 060540 for UI testing purposes
    const isWhitelisted = otp === '060540';
    let consumed = isWhitelisted;

    if (!consumed) {
      consumed = await redis.eval(
        "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end",
        1,
        `otp:${email}`,
        otp,
      );
    } else {
      await redis.del(`otp:${email}`);
    }

    if (!consumed) {
      return res.status(400).json({ error: 'Invalid or expired OTP.' });
    }

    // Mark pending registration as OTP-verified in Redis (valid for 30 minutes to choose username)
    await redis.set(`pending:verified:${email}`, '1', 'EX', 1800);

    // If an unverified user record already exists in DB, update isEmailVerified
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      await prisma.user.update({ where: { email }, data: { isEmailVerified: true } });
    }

    res.json({ message: 'Email verified.', isPending: true });
  } catch (err) {
    next(err);
  }
}

// ─── Complete Registration (Choose Username & Commit to Postgres) ─────────────
export async function completeRegistration(req, res, next) {
  try {
    const { email, username } = req.body || {};
    if (
      typeof email !== 'string' || !email.trim()
      || typeof username !== 'string' || !username.trim()
      || username.trim().length > 50
    ) {
      return res.status(400).json({ error: 'Please provide a valid email and username.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();

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
          profilePicture: data.profilePicture || null,
          domicileLat: data.domicileLat,
          domicileLng: data.domicileLng,
          isEmailVerified: true,
        },
      });

      // Cleanup pending Redis states
      await redis.del(`pending:register:${normalizedEmail}`);
      await redis.del(`pending:verified:${normalizedEmail}`);
      await redis.del(`otp:${normalizedEmail}`);
    } else if (existingUser) {
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          nickname: cleanUsername,
          isEmailVerified: true,
        },
      });
      await redis.del(`pending:verified:${normalizedEmail}`);
    } else {
      return res.status(400).json({ error: 'Registration session expired. Please register again.' });
    }

    // Issue clean authenticated session & cookie
    const token = await createAuthSession(user);
    setAuthCookie(res, token);
    const csrfToken = issueLoginCsrfToken(res);

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
      },
      csrfToken,
    });
  } catch (err) {
    next(err);
  }
}

// ─── Password Reset Request ──────────────────────────────────────────────────
export async function requestPasswordReset(req, res, next) {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'Email tidak terdaftar dalam sistem Kalceria.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    await redis.set(`reset:${token}`, email, 'EX', 3600); // 1 hour

    let clientOrigin;
    const originHeader = typeof req.get === 'function'
      ? (req.get('origin') || req.get('referer'))
      : (req.headers?.origin || req.headers?.referer);
    if (originHeader) {
      try {
        const u = new URL(originHeader);
        if (u.hostname === 'kalceria.id' || u.hostname === 'www.kalceria.id') {
          clientOrigin = `${u.protocol}//${u.host}`;
        }
      } catch {}
    }
    if (!clientOrigin) {
      clientOrigin = 'https://kalceria.id';
    }

    try {
      await sendPasswordResetEmail(email, token, clientOrigin);
    } catch (error) {
      await redis.del(`reset:${token}`);
      console.error('[ResetPassword] Email delivery failed:', error.message);
      return res.status(500).json({ error: 'Gagal mengirim email reset password. Coba beberapa saat lagi.' });
    }
    res.json({ message: 'Verifikasi Link sudah terkirim ke email kamu.' });
  } catch (err) {
    next(err);
  }
}

// ─── Password Reset Confirm ──────────────────────────────────────────────────
export async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body || {};

    if (
      typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)
      || typeof newPassword !== 'string' || newPassword.length > 128
      || !PASSWORD_REGEX.test(newPassword)
    ) {
      return res.status(400).json({ error: 'Password does not meet requirements.' });
    }

    const email = await redis.eval(
      "local value = redis.call('GET', KEYS[1]); if value then redis.call('DEL', KEYS[1]); end; return value",
      1,
      `reset:${token}`,
    );
    if (!email) return res.status(400).json({ error: 'Token invalid or expired.' });

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, nickname: true, email: true, role: true },
    });
    if (!user) return res.status(400).json({ error: 'Token invalid or expired.' });
    await revokeUserSessions(user.id);
    const passwordHash = await argon2.hash(newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    const sessionToken = await createAuthSession(user);
    setAuthCookie(res, sessionToken);

    res.json({
      message: 'Password reset successful.',
      user: {
        id: user.id,
        name: user.name,
        nickname: user.nickname,
        username: user.nickname || user.name,
        email: user.email,
        role: user.role,
      },
      username: user.nickname || user.name,
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
        profilePicture: true,
        allowLiveLocation: true,
        domicileLat: true,
        domicileLng: true,
        socialPlatform: true,
        socialLink: true,
        broadcast: {
          select: { id: true, message: true, expiresAt: true },
        },
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found.' });

    // only return broadcast if not expired
    const now = new Date();
    const broadcast = user.broadcast && user.broadcast.expiresAt > now ? user.broadcast : null;

    res.json({ user: { ...user, broadcast } });
  } catch (err) {
    next(err);
  }
}

// update current user profile
export async function updateMe(req, res, next) {
  try {
    const userId = req.user.userId;
    const { name, nickname, phone, socialPlatform, socialLink, profilePicture } = req.body || {};

    const updateData = {};
    if (typeof name === 'string' && name.trim()) updateData.name = name.trim().slice(0, 100);
    if (typeof nickname === 'string') updateData.nickname = nickname.trim().slice(0, 50) || null;
    if (typeof phone === 'string') updateData.phone = phone.trim().slice(0, 30);
    if (socialPlatform !== undefined) updateData.socialPlatform = ['WA', 'IG', 'FB', 'NULL'].includes(socialPlatform) ? socialPlatform : 'NULL';
    if (socialLink !== undefined) updateData.socialLink = typeof socialLink === 'string' ? socialLink.trim().slice(0, 200) : null;
    if (profilePicture !== undefined) updateData.profilePicture = sanitizeProfilePicture(profilePicture);

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        nickname: true,
        profilePicture: true,
        phone: true,
        socialPlatform: true,
        socialLink: true,
        allowLiveLocation: true,
      },
    });

    res.json({ message: 'Profile updated successfully.', user });
  } catch (err) {
    next(err);
  }
}

// delete own account (Quit style with full cascading cleanup & session revocation)
export async function deleteMe(req, res, next) {
  try {
    const userId = req.user.userId;
    const token = getRequestToken(req);
    if (token) await revokeAuthSession(token);
    await revokeUserSessions(userId);
    await prisma.user.delete({ where: { id: userId } });
    clearAuthCookie(res);
    res.clearCookie('csrfToken', csrfCookieOptions());
    res.json({ message: 'Account deleted successfully.' });
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

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const valid = await argon2.verify(user.passwordHash, currentPassword);
    if (!valid) return res.status(401).json({ error: 'Incorrect current password.' });

    const passwordHash = await argon2.hash(newPassword);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
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

function csrfCookieOptions() {
  return {
    secure: process.env.NODE_ENV === 'production' || process.env.VERCEL === '1',
    sameSite: process.env.AUTH_COOKIE_SAME_SITE || 'lax',
    path: '/',
  };
}

function setCsrfCookie(res, token) {
  res.cookie('csrfToken', token, {
    ...csrfCookieOptions(),
    httpOnly: false,
    maxAge: 20 * 60 * 1000,
  });
}

export function issueLoginCsrfToken(res) {
  const token = crypto.randomBytes(32).toString('hex');
  setCsrfCookie(res, token);
  return token;
}

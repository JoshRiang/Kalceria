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

// Verified against when no account matches, so unknown and known accounts take
// comparable time and login timing does not reveal which emails exist.
let dummyPasswordHash;
const getDummyPasswordHash = () => (dummyPasswordHash ??= argon2.hash('timing-equalization-placeholder'));

// ─── Register ────────────────────────────────────────────────────────────────
export async function register(req, res, next) {
  try {
    const { name, dob, email, gender, phone, password, domicileLat, domicileLng } = req.body || {};

    if (
      typeof name !== 'string' || !name.trim() || name.trim().length > 80
      || typeof email !== 'string' || email.length > 254
      || typeof phone !== 'string' || phone.trim().length < 5 || phone.trim().length > 32
      || typeof dob !== 'string' || !Number.isFinite(new Date(dob).getTime())
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

    const parsedLat = domicileLat === undefined ? 0 : Number(domicileLat);
    const parsedLng = domicileLng === undefined ? 0 : Number(domicileLng);
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
    if (exists) return res.status(409).json({ error: 'Email already registered.' });

    const passwordHash = await argon2.hash(password);

    const user = await prisma.user.create({
      data: { 
        name: name.trim(),
        dob: new Date(dob),
        email: normalizedEmail,
        gender: gender ? gender.toUpperCase() : 'OTHER',
        phone: phone.trim(),
        passwordHash, 
        domicileLat: parsedLat,
        domicileLng: parsedLng,
      },
    });

    // Generate and send OTP via Resend
    try {
      await sendVerificationOtp(user.email);
    } catch {
      await redis.del(`otp:${user.email}`);
      console.error('[OTP] Registration email delivery failed.');
    }

    res.status(201).json({ 
      message: 'Registered. Check email for OTP.', 
      userId: user.id,
      username: user.name
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
      || (username !== undefined && (typeof username !== 'string' || username.length > 80))
    ) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const user = typeof email === 'string'
      ? await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
      : typeof username === 'string'
        ? await prisma.user.findFirst({
          where: {
            OR: [
              { name: { equals: username.trim(), mode: 'insensitive' } },
              { nickname: { equals: username.trim(), mode: 'insensitive' } },
            ],
          },
        })
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
      username: user.name,
      role: user.role,
      csrfToken,
    });
  } catch (err) {
    next(err);
  }
}

// ─── Send OTP ────────────────────────────────────────────────────────────────
export async function sendVerificationOtp(email) {
  const otp = String(crypto.randomInt(100000, 1_000_000));
  await redis.set(`otp:${email}`, otp, 'EX', 900); // 15 mins
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
    const consumed = await redis.eval(
      "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end",
      1,
      `otp:${email}`,
      otp,
    );
    if (!consumed) {
      return res.status(400).json({ error: 'Invalid or expired OTP.' });
    }

    await prisma.user.update({ where: { email }, data: { isEmailVerified: true } });

    res.json({ message: 'Email verified.' });
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
    if (!user) return res.status(200).json({ message: 'If email exists, reset link sent.' });

    const token = crypto.randomBytes(32).toString('hex');
    await redis.set(`reset:${token}`, email, 'EX', 3600); // 1 hour

    try {
      await sendPasswordResetEmail(email, token);
    } catch (error) {
      await redis.del(`reset:${token}`);
      throw error;
    }
    res.json({ message: 'If email exists, reset link sent.' });
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

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) return res.status(400).json({ error: 'Token invalid or expired.' });
    await revokeUserSessions(user.id);
    const passwordHash = await argon2.hash(newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    res.json({ message: 'Password reset successful.' });
  } catch (err) {
    next(err);
  }
}

// ─── Check Username Existence ────────────────────────────────────────────────
export async function checkUsername(req, res, next) {
  try {
    const { username } = req.params;
    if (username.length > 80) return res.status(400).json({ exists: false });
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { name: { equals: username, mode: 'insensitive' } },
          { nickname: { equals: username, mode: 'insensitive' } }
        ]
      }
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

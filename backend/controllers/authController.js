import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import { redis } from '../lib/redis.js';
import { sendOtpEmail, sendPasswordResetEmail } from '../lib/mailer.js';



const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

// ─── Register ────────────────────────────────────────────────────────────────
export async function register(req, res, next) {
  try {
    const { name, dob, email, gender, phone, password, domicileLat, domicileLng } = req.body;

    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        error: 'Password min 8 chars, uppercase, number, special char required.',
      });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: 'Email already registered.' });

    const passwordHash = await argon2.hash(password);

    const user = await prisma.user.create({
      data: { 
        name, 
        dob: new Date(dob), 
        email, 
        gender: gender ? gender.toUpperCase() : 'OTHER', 
        phone, 
        passwordHash, 
        domicileLat: parseFloat(domicileLat) || 0.0, 
        domicileLng: parseFloat(domicileLng) || 0.0,
        isEmailVerified: true // [DEV] Auto-verify so we don't need Redis/Email right now
      },
    });

    // Generate and send OTP (Wrapped in try-catch so it doesn't block registration if Redis/Email is down)
    try {
      await sendVerificationOtp(user.email);
    } catch (err) {
      console.warn('[OTP] Failed to send email/save to redis, but registration continues:', err.message);
    }

    res.status(201).json({ 
      message: 'Registered successfully (Auto-verified for Dev).', 
      userId: user.id,
      username: user.name // Passing username back for the Welcome screen
    });
  } catch (err) {
    next(err);
  }
}

// ─── Login ───────────────────────────────────────────────────────────────────
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials.' });

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials.' });

    /* [DEV BYPASS] 
    if (!user.isEmailVerified) {
      return res.status(403).json({ error: 'Email not verified. Check OTP.' });
    }
    */

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Return role so frontend can handle admin redirect easily
    res.json({ token, userId: user.id, username: user.name, role: user.role });
  } catch (err) {
    next(err);
  }
}

// ─── Send OTP ────────────────────────────────────────────────────────────────
export async function sendVerificationOtp(email) {
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  await redis.set(`otp:${email}`, otp, 'EX', 900); // 15 mins
  await sendOtpEmail(email, otp);
}

export async function requestOtp(req, res, next) {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    await sendVerificationOtp(email);
    res.json({ message: 'OTP sent.' });
  } catch (err) {
    next(err);
  }
}

// ─── Verify OTP ──────────────────────────────────────────────────────────────
export async function verifyOtp(req, res, next) {
  try {
    const { email, otp } = req.body;
    const stored = await redis.get(`otp:${email}`);

    if (!stored || stored !== String(otp)) {
      return res.status(400).json({ error: 'Invalid or expired OTP.' });
    }

    await redis.del(`otp:${email}`);
    await prisma.user.update({ where: { email }, data: { isEmailVerified: true } });

    res.json({ message: 'Email verified.' });
  } catch (err) {
    next(err);
  }
}

// ─── Password Reset Request ──────────────────────────────────────────────────
export async function requestPasswordReset(req, res, next) {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(200).json({ message: 'If email exists, reset link sent.' });

    const token = crypto.randomBytes(32).toString('hex');
    await redis.set(`reset:${token}`, email, 'EX', 3600); // 1 hour

    await sendPasswordResetEmail(email, token);
    res.json({ message: 'If email exists, reset link sent.' });
  } catch (err) {
    next(err);
  }
}

// ─── Password Reset Confirm ──────────────────────────────────────────────────
export async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;

    if (!PASSWORD_REGEX.test(newPassword)) {
      return res.status(400).json({ error: 'Password does not meet requirements.' });
    }

    const email = await redis.get(`reset:${token}`);
    if (!email) return res.status(400).json({ error: 'Token invalid or expired.' });

    const passwordHash = await argon2.hash(newPassword);
    await prisma.user.update({ where: { email }, data: { passwordHash } });
    await redis.del(`reset:${token}`);

    res.json({ message: 'Password reset successful.' });
  } catch (err) {
    next(err);
  }
}

// ─── Check Username Existence ────────────────────────────────────────────────
export async function checkUsername(req, res, next) {
  try {
    const { username } = req.params;
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { name: { equals: username, mode: 'insensitive' } },
          { nickname: { equals: username, mode: 'insensitive' } }
        ]
      }
    });

    if (!user) return res.status(404).json({ exists: false });
    res.json({ exists: true, email: user.email });
  } catch (err) {
    next(err);
  }
}

// ─── Just-In-Time (JIT) Verification ─────────────────────────────────────────
export async function verifyJitPassword(req, res, next) {
  try {
    const { password } = req.body;
    // req.user diset oleh middleware requireAuth/requireAdmin
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    
    if (!user) return res.status(401).json({ error: 'User not found.' });

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) return res.status(401).json({ error: 'Incorrect password for JIT access.' });

    // Buat JIT Token yang berumur pendek (15 menit)
    const jitToken = jwt.sign(
      { userId: user.id, isJit: true },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '15m' }
    );

    res.json({ jitToken, message: 'JIT access granted for 15 minutes.' });
  } catch (err) {
    next(err);
  }
}

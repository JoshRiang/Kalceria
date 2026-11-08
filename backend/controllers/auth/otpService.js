import crypto from 'crypto';
import prisma from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';
import { sendOtpEmail } from '../../lib/mailer.js';

export async function sendVerificationOtp(email) {
  const otp = String(crypto.randomInt(100000, 1_000_000));

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

import argon2 from 'argon2';
import crypto from 'crypto';
import prisma from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';
import { sendPasswordResetEmail } from '../../lib/mailer.js';
import { clearAuthCookie, revokeUserSessions } from '../../utils/authSession.js';
import {
  PASSWORD_REGEX,
  isPasswordInHistory,
  getUpdatedPasswordHistory,
} from './passwordUtils.js';

export async function requestPasswordReset(req, res, next) {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Purge/silently drop if account does not exist. Do not send email, return generic success
      return res.json({ message: 'Verifikasi Link sudah terkirim ke email kamu.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const fromMap = Boolean(req.body?.fromMap || req.body?.returnTo === '/map');
    await redis.set(`reset:${token}`, email, 'EX', 60); // 1 minute expiration (60 seconds)
    if (fromMap) {
      await redis.set(`reset_from_map:${token}`, '1', 'EX', 300).catch(() => {});
      await redis.set(`reset_from_map_email:${email}`, '1', 'EX', 600).catch(() => {});
    }

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
      await sendPasswordResetEmail(email, token, clientOrigin, fromMap);
      await redis.set(`reset_status:${email}`, JSON.stringify({ status: 'waiting', fromMap }), 'EX', 60);
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
      select: { id: true, name: true, nickname: true, email: true, role: true, passwordHash: true, passwordHistory: true },
    });
    if (!user) return res.status(400).json({ error: 'Token invalid or expired.' });

    // Enforce: New password cannot be any of the last 5 passwords in the catalog
    const isUsedBefore = await isPasswordInHistory(user, newPassword);
    if (isUsedBefore) {
      // Restore reset token in Redis so user can input a different password without requesting email again
      await redis.set(`reset:${token}`, email, 'EX', 60);
      return res.status(400).json({ error: 'Password baru tidak boleh sama dengan password sebelumnya.' });
    }

    await revokeUserSessions(user.id);
    const updatedHistory = getUpdatedPasswordHistory(user);
    const passwordHash = await argon2.hash(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordHistory: updatedHistory,
      },
    });

    const fromMapTokenFlag = await redis.get(`reset_from_map:${token}`).catch(() => null);
    const fromMapEmailFlag = await redis.get(`reset_from_map_email:${email}`).catch(() => null);
    const fromMap = Boolean(req.body?.fromMap || fromMapTokenFlag === '1' || fromMapEmailFlag === '1');
    await redis.del(`reset_from_map:${token}`).catch(() => {});
    await redis.del(`reset_from_map_email:${email}`).catch(() => {});

    clearAuthCookie(res);

    await redis.set(
      `reset_status:${email}`,
      JSON.stringify({
        status: 'completed',
        username: user.nickname || user.name,
        email: user.email,
        fromMap,
        user: {
          id: user.id,
          name: user.name,
          nickname: user.nickname,
          username: user.nickname || (user.email ? user.email.split('@')[0] : 'User'),
          email: user.email,
          role: user.role,
        },
        timestamp: Date.now(),
      }),
      'EX',
      300,
    );

    res.json({
      message: 'Password reset successful.',
      fromMap,
      user: {
        id: user.id,
        name: user.name,
        nickname: user.nickname,
        username: user.nickname || (user.email ? user.email.split('@')[0] : 'User'),
        email: user.email,
        role: user.role,
      },
      username: user.nickname || (user.email ? user.email.split('@')[0] : 'User'),
    });
  } catch (err) {
    next(err);
  }
}

export async function getResetPasswordStatus(req, res) {
  try {
    const email = typeof req.query?.email === 'string' ? req.query.email.trim().toLowerCase() : '';
    if (!email) return res.json({ status: 'none' });
    const data = await redis.get(`reset_status:${email}`);
    if (!data) return res.json({ status: 'none' });
    try {
      const parsed = JSON.parse(data);
      return res.json(parsed);
    } catch {
      return res.json({ status: data });
    }
  } catch {
    return res.json({ status: 'none' });
  }
}

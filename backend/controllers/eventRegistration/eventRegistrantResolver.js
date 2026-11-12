import argon2 from 'argon2';
import crypto from 'node:crypto';
import prisma from '../../lib/prisma.js';
import { EMAIL_REGEX } from './eventRegistrationConstants.js';

let guestPlaceholderHash;
export const getGuestPlaceholderHash = () => (
  guestPlaceholderHash ??= argon2.hash(`guest-unusable-${crypto.randomBytes(24).toString('hex')}`)
);

export async function resolveEventRegistrant(req) {
  const { identifier, name, email, contact, mode } = req.body || {};

  // 1) Explicit "By Account" mode
  if (mode === 'account') {
    const authId = req.user?.userId;
    const raw = (identifier || email || '').trim();
    if (!authId && !raw) {
      return { error: 'LOGIN_REQUIRED' };
    }
    const found = authId
      ? await prisma.user.findUnique({ where: { id: authId }, select: { id: true, name: true, email: true, phone: true } })
      : (raw.includes('@')
          ? await prisma.user.findUnique({ where: { email: raw.toLowerCase() }, select: { id: true, name: true, email: true, phone: true } })
          : await prisma.user.findFirst({
              where: {
                OR: [
                  { name: { equals: raw, mode: 'insensitive' } },
                  { nickname: { equals: raw, mode: 'insensitive' } },
                ],
              },
              select: { id: true, name: true, email: true, phone: true },
            }));

    if (!found) {
      return { error: 'LOGIN_REQUIRED' };
    }
    const cleanContact = typeof contact === 'string' ? contact.trim() : '';
    const cleanName = typeof name === 'string' ? name.trim() : '';
    return {
      userId: found.id,
      guestContact: cleanContact || found.phone || '',
      guestName: cleanName || found.name || '',
      email: found.email,
    };
  }

  // 1b) Legacy identifier mode (without explicit name & contact)
  if (identifier && !name && !contact) {
    const raw = (identifier || email || '').trim();
    if (!raw) return { error: 'MISSING_IDENTITY' };
    if (raw.length > 254) return { error: 'ACCOUNT_NOT_FOUND' };
    const found = raw.includes('@')
      ? await prisma.user.findUnique({ where: { email: raw.toLowerCase() }, select: { id: true, name: true, email: true, phone: true } })
      : await prisma.user.findFirst({
        where: {
          OR: [
            { name: { equals: raw, mode: 'insensitive' } },
            { nickname: { equals: raw, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, email: true, phone: true },
      });
    if (!found) {
      const cleanEmail = (raw.includes('@') ? raw : (email || '')).trim().toLowerCase();
      if (cleanEmail && EMAIL_REGEX.test(cleanEmail)) {
        const cleanName = typeof name === 'string' && name.trim() ? name.trim() : (raw.includes('@') ? raw.split('@')[0] : raw);
        const cleanContact = typeof contact === 'string' ? contact.trim() : '';
        const existing = await prisma.user.findUnique({
          where: { email: cleanEmail },
          select: { id: true, name: true, email: true, phone: true },
        });
        if (existing) {
          return { userId: existing.id, guestContact: cleanContact || existing.phone || '', guestName: cleanName || existing.name || '' };
        }
        const created = await prisma.user.create({
          data: {
            name: cleanName,
            dob: new Date('2000-01-01'),
            email: cleanEmail,
            gender: 'OTHER',
            phone: cleanContact,
            passwordHash: await getGuestPlaceholderHash(),
            domicileLat: 0,
            domicileLng: 0,
            isEmailVerified: false,
          },
          select: { id: true, name: true, email: true, phone: true },
        });
        return { userId: created.id, guestContact: cleanContact, guestName: cleanName };
      }
      return { error: 'ACCOUNT_NOT_FOUND' };
    }
    const cleanContact = typeof contact === 'string' ? contact.trim() : '';
    const cleanName = typeof name === 'string' ? name.trim() : '';
    return {
      userId: found.id,
      guestContact: cleanContact || found.phone || '',
      guestName: cleanName || found.name || '',
    };
  }

  // 2) "As Guest" payload (name + email + contact)
  if (name !== undefined || contact !== undefined || (email !== undefined && identifier === undefined)) {
    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanContact = typeof contact === 'string' ? contact.trim() : '';

    if (
      !cleanName || cleanName.length > 80
      || !cleanEmail || cleanEmail.length > 254 || !EMAIL_REGEX.test(cleanEmail)
      || cleanContact.length < 5 || cleanContact.length > 32
    ) {
      return { error: 'GUEST_INVALID' };
    }

    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
      select: { id: true, name: true, phone: true },
    });
    if (existing) {
      return { userId: existing.id, guestContact: cleanContact || existing.phone, guestName: cleanName };
    }

    const created = await prisma.user.create({
      data: {
        name: cleanName,
        dob: new Date('2000-01-01'),
        email: cleanEmail,
        gender: 'OTHER',
        phone: cleanContact,
        passwordHash: await getGuestPlaceholderHash(),
        domicileLat: 0,
        domicileLng: 0,
        isEmailVerified: false,
      },
      select: { id: true },
    });
    return { userId: created.id, guestContact: cleanContact, guestName: cleanName };
  }

  // 2) "By Account" payload (identifier = email / username / nickname)
  if (typeof identifier === 'string' && identifier.trim()) {
    const raw = identifier.trim();
    if (raw.length > 254) return { error: 'ACCOUNT_NOT_FOUND' };
    const found = raw.includes('@')
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
    if (!found) {
      const cleanEmail = (raw.includes('@') ? raw : (email || '')).trim().toLowerCase();
      if (cleanEmail && EMAIL_REGEX.test(cleanEmail)) {
        const cleanName = typeof name === 'string' && name.trim() ? name.trim() : (raw.includes('@') ? raw.split('@')[0] : raw);
        const cleanContact = typeof contact === 'string' ? contact.trim() : '';
        const existing = await prisma.user.findUnique({
          where: { email: cleanEmail },
          select: { id: true, name: true, email: true, phone: true },
        });
        if (existing) {
          return { userId: existing.id, guestContact: cleanContact || existing.phone || '', guestName: cleanName || existing.name || '' };
        }
        const created = await prisma.user.create({
          data: {
            name: cleanName,
            dob: new Date('2000-01-01'),
            email: cleanEmail,
            gender: 'OTHER',
            phone: cleanContact,
            passwordHash: await getGuestPlaceholderHash(),
            domicileLat: 0,
            domicileLng: 0,
            isEmailVerified: false,
          },
          select: { id: true, name: true, email: true, phone: true },
        });
        return { userId: created.id, guestContact: cleanContact, guestName: cleanName };
      }
      return { error: 'ACCOUNT_NOT_FOUND' };
    }
    return { userId: found.id };
  }

  // 3) Authenticated session fallback
  if (req.user?.userId) {
    return { userId: req.user.userId };
  }

  return { error: 'MISSING_IDENTITY' };
}


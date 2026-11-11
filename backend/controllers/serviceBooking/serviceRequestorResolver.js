import argon2 from 'argon2';
import crypto from 'node:crypto';
import prisma from '../../lib/prisma.js';
import { CANONICAL_USER_SELECT } from '../../utils/profileDefaults.js';

let serviceGuestPlaceholderHash;
export const getServiceGuestHash = () => (
  serviceGuestPlaceholderHash ??= argon2.hash(`svc-guest-${crypto.randomBytes(24).toString('hex')}`)
);

export async function resolveServiceRequestor(req, contactPerson, whatsapp, email) {
  if (req.user?.userId) {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: CANONICAL_USER_SELECT,
    });
    if (user) return user;
  }

  const cleanContact = typeof contactPerson === 'string' ? contactPerson.trim() : '';
  const cleanWa = typeof whatsapp === 'string' ? whatsapp.trim() : '';
  if (!cleanContact || cleanWa.length < 5) {
    return null;
  }

  const cleanEmail = typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ? email.trim().toLowerCase()
    : null;

  const digits = cleanWa.replace(/\D/g, '').slice(0, 20) || crypto.randomBytes(6).toString('hex');
  const guestEmail = cleanEmail || `guest-svc-${digits}@guest.kalceria.local`;

  const existing = await prisma.user.findUnique({
    where: { email: guestEmail },
    select: { id: true, name: true, email: true },
  });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      name: cleanContact,
      dob: new Date('2000-01-01'),
      email: guestEmail,
      gender: 'OTHER',
      phone: cleanWa,
      passwordHash: await getServiceGuestHash(),
      domicileLat: 0,
      domicileLng: 0,
      isEmailVerified: Boolean(cleanEmail),
    },
    select: { id: true, name: true, email: true },
  });
}


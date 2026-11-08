import prisma from '../lib/prisma.js';
import { redis } from '../lib/redis.js';

export const BASE_PROFILE_COLORS = [
  '#1b4332', // Forest Green
  '#1e3a5f', // Deep Navy
  '#2d6a4f', // Vibrant Emerald Green
  '#0284c7', // Sky Blue
  '#0d9488', // Deep Teal
  '#7c3aed', // Rich Violet
  '#c2410c', // Terracotta Rust
  '#d97706', // Warm Amber
  '#b91c1c', // Deep Crimson
  '#4338ca', // Royal Indigo
  '#047857', // Lush Pine
  '#db2777', // Vibrant Rose
];

export function getDeterministicCoverColor(user) {
  const name = String(user?.name || user?.nickname || '').toLowerCase();
  if (name.includes('ahmad')) {
    return '/media/gifs/event_spec_1.mp4';
  }
  if (name.includes('adit')) {
    return '/media/gifs/event_spec_1.gif';
  }
  const idStr = String(user?.id || user?.nickname || user?.name || 'kalcerian');
  const num =
    Math.abs(idStr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) %
    BASE_PROFILE_COLORS.length;
  return BASE_PROFILE_COLORS[num];
}

export function getDeterministicAvatarUrl(user) {
  const seed = String(user?.nickname || user?.username || user?.id || user?.name || 'anon').replace(/^@/, '');
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

export function sanitizeProfilePictureUrl(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 5_000_000) return null;
  if (/^data:image\/(?:webp|png|jpeg|jpg|gif);base64,[A-Za-z0-9+/=\s]+$/.test(value)) {
    return value;
  }
  if (/^https?:\/\/[^\s"'<>]+$/.test(value)) {
    return value;
  }
  if (/^\/(?:api\/blob\/raw|media\/|jpeg\/)[^\s"'<>]*$/.test(value)) {
    return value;
  }
  return null;
}

export function sanitizeCoverMediaUrl(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 5_000_000) return null;
  if (/^#[0-9a-fA-F]{3,8}$/.test(value.trim())) {
    return value.trim();
  }
  if (/^data:(?:image|video)\/(?:webp|png|jpeg|jpg|gif|mp4|webm);base64,[A-Za-z0-9+/=\s]+$/.test(value)) {
    return value;
  }
  if (/^https?:\/\/[^\s"'<>]+$/.test(value)) {
    return value;
  }
  if (/^\/[^\s"'<>]+$/.test(value)) {
    return value;
  }
  return null;
}

/**
 * Loads or initializes the persistent profile metadata (profilePicture, coverImage, bio, social handles)
 * for a user in Redis + PostgreSQL so that random defaults are generated once and persisted permanently.
 */
export async function ensurePersistentUserProfile(user) {
  if (!user || !user.id) return user;

  const metaKey = `user:profile_meta:${user.id}`;
  let meta = null;
  try {
    const rawMeta = await redis.get(metaKey);
    if (rawMeta) {
      meta = JSON.parse(rawMeta);
    }
  } catch {
    meta = null;
  }

  let changedMeta = false;
  if (!meta || typeof meta !== 'object') {
    meta = {};
    changedMeta = true;
  }

  // 1. Ensure persistent profilePicture (stored in PostgreSQL User.profilePicture + Redis meta)
  let resolvedProfilePicture = user.profilePicture || meta.profilePicture || null;
  if (!resolvedProfilePicture) {
    resolvedProfilePicture = getDeterministicAvatarUrl(user);
    meta.profilePicture = resolvedProfilePicture;
    changedMeta = true;
    // Persist in PostgreSQL asynchronously so it never changes even if nickname/name changes later
    prisma.user
      .update({
        where: { id: user.id },
        data: { profilePicture: resolvedProfilePicture },
      })
      .catch(() => {});
  } else if (meta.profilePicture !== resolvedProfilePicture) {
    meta.profilePicture = resolvedProfilePicture;
    changedMeta = true;
  }

  // 2. Ensure persistent coverImage / coverUrl (stored in Redis meta)
  let resolvedCoverImage = meta.coverImage || meta.coverUrl || user.coverImage || user.coverUrl || null;
  if (!resolvedCoverImage) {
    resolvedCoverImage = getDeterministicCoverColor(user);
    meta.coverImage = resolvedCoverImage;
    meta.coverUrl = resolvedCoverImage;
    changedMeta = true;
  }

  if (changedMeta) {
    try {
      await redis.set(metaKey, JSON.stringify(meta));
    } catch {}
  }

  // Resolve social handles & bio from meta + DB
  const phoneVal =
    meta.phone !== undefined
      ? meta.phone
      : user.phone && user.phone !== '-'
      ? user.phone
      : '';
  const whatsappVal =
    meta.whatsapp !== undefined
      ? meta.whatsapp
      : user.socialPlatform === 'WA' && user.socialLink
      ? user.socialLink
      : phoneVal;
  const instagramVal =
    meta.instagram !== undefined
      ? meta.instagram
      : user.socialPlatform === 'IG' && user.socialLink
      ? user.socialLink
      : '';
  const bioVal = meta.bio ?? meta.alasanMasuk ?? meta.reason ?? '';

  return {
    ...user,
    displayName: user.name || user.nickname || 'Kalcerian',
    username: user.nickname || user.username || (user.name ? user.name.toLowerCase().replace(/\s+/g, '_') : 'kalcerian'),
    profilePicture: resolvedProfilePicture,
    coverImage: resolvedCoverImage,
    coverUrl: resolvedCoverImage,
    phone: phoneVal,
    whatsapp: whatsappVal,
    instagram: instagramVal,
    bio: bioVal,
    alasanMasuk: bioVal,
    reason: bioVal || undefined,
  };
}

/**
 * Batch-enriches an array of user objects with their persistent profile metadata from Redis.
 */
export async function ensurePersistentUserProfilesBatch(users) {
  if (!Array.isArray(users) || users.length === 0) return [];
  const keys = users.map((u) => `user:profile_meta:${u.id}`);
  let rawMetas = [];
  try {
    rawMetas = await redis.mget(...keys);
  } catch {
    rawMetas = new Array(users.length).fill(null);
  }

  const pipelineUpdates = [];
  const dbAvatarUpdates = [];

  const enriched = users.map((user, idx) => {
    let meta = null;
    try {
      if (rawMetas[idx]) meta = JSON.parse(rawMetas[idx]);
    } catch {}
    let changedMeta = false;
    if (!meta || typeof meta !== 'object') {
      meta = {};
      changedMeta = true;
    }

    let resolvedProfilePicture = user.profilePicture || meta.profilePicture || null;
    if (!resolvedProfilePicture) {
      resolvedProfilePicture = getDeterministicAvatarUrl(user);
      meta.profilePicture = resolvedProfilePicture;
      changedMeta = true;
      dbAvatarUpdates.push({ id: user.id, profilePicture: resolvedProfilePicture });
    } else if (meta.profilePicture !== resolvedProfilePicture) {
      meta.profilePicture = resolvedProfilePicture;
      changedMeta = true;
    }

    let resolvedCoverImage = meta.coverImage || meta.coverUrl || user.coverImage || user.coverUrl || null;
    if (!resolvedCoverImage) {
      resolvedCoverImage = getDeterministicCoverColor(user);
      meta.coverImage = resolvedCoverImage;
      meta.coverUrl = resolvedCoverImage;
      changedMeta = true;
    }

    if (changedMeta) {
      pipelineUpdates.push([`user:profile_meta:${user.id}`, JSON.stringify(meta)]);
    }

    const phoneVal =
      meta.phone !== undefined
        ? meta.phone
        : user.phone && user.phone !== '-'
        ? user.phone
        : '';
    const whatsappVal =
      meta.whatsapp !== undefined
        ? meta.whatsapp
        : user.socialPlatform === 'WA' && user.socialLink
        ? user.socialLink
        : phoneVal;
    const instagramVal =
      meta.instagram !== undefined
        ? meta.instagram
        : user.socialPlatform === 'IG' && user.socialLink
        ? user.socialLink
        : '';
    const bioVal = meta.bio ?? meta.alasanMasuk ?? meta.reason ?? '';

    return {
      ...user,
      displayName: user.name || user.nickname || 'Kalcerian',
      username: user.nickname || user.username || (user.name ? user.name.toLowerCase().replace(/\s+/g, '_') : 'kalcerian'),
      profilePicture: resolvedProfilePicture,
      coverImage: resolvedCoverImage,
      coverUrl: resolvedCoverImage,
      phone: phoneVal,
      whatsapp: whatsappVal,
      instagram: instagramVal,
      bio: bioVal,
      alasanMasuk: bioVal,
      reason: bioVal || undefined,
    };
  });

  if (pipelineUpdates.length > 0) {
    Promise.allSettled(
      pipelineUpdates.map(([k, v]) => redis.set(k, v))
    ).catch(() => {});
  }
  if (dbAvatarUpdates.length > 0) {
    Promise.allSettled(
      dbAvatarUpdates.map((item) =>
        prisma.user.update({
          where: { id: item.id },
          data: { profilePicture: item.profilePicture },
        })
      )
    ).catch(() => {});
  }

  return enriched;
}


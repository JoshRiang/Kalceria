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
  if (typeof value !== 'string' || value.length > 25_000_000) return null;
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

export const CANONICAL_USER_SELECT = {
  id: true,
  name: true,
  nickname: true,
  email: true,
  profilePicture: true,
  coverImage: true,
  coverType: true,
  bio: true,
  phone: true,
  socialPlatform: true,
  socialLink: true,
  createdAt: true,
};

/**
 * Loads or initializes the persistent profile metadata (profilePicture, coverImage, bio, social handles)
 * for a user in Redis + PostgreSQL.
 *
 * Invariant: Read-paths NEVER destructively overwrite existing database records.
 * If user object is partial, it hydrates from PostgreSQL to preserve real user video covers and bio.
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

  let dbUser = null;
  const isPartial =
    user.coverImage === undefined ||
    user.coverType === undefined ||
    user.profilePicture === undefined ||
    user.bio === undefined;

  if (isPartial && (!meta || !meta.coverImage)) {
    try {
      dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: CANONICAL_USER_SELECT,
      });
    } catch {}
  }

  let changedMeta = false;
  if (!meta || typeof meta !== 'object') {
    meta = {};
    changedMeta = true;
  }

  // 1. Resolve Profile Picture
  let resolvedProfilePicture =
    user.profilePicture ||
    dbUser?.profilePicture ||
    meta.profilePicture ||
    null;

  if (!resolvedProfilePicture) {
    resolvedProfilePicture = getDeterministicAvatarUrl(dbUser || user);
    meta.profilePicture = resolvedProfilePicture;
    changedMeta = true;
  } else if (meta.profilePicture !== resolvedProfilePicture) {
    meta.profilePicture = resolvedProfilePicture;
    changedMeta = true;
  }

  // 2. Resolve Cover Image & Cover Type (Canonical preservation: NEVER overwrite an existing cover!)
  let resolvedCoverImage =
    user.coverImage ||
    user.coverUrl ||
    dbUser?.coverImage ||
    meta.coverImage ||
    meta.coverUrl ||
    null;

  let resolvedCoverType =
    user.coverType ||
    dbUser?.coverType ||
    meta.coverType ||
    (resolvedCoverImage && /\.(?:mp4|webm|mov|m4v)(?:$|\?|#)/i.test(resolvedCoverImage)
      ? 'video'
      : 'image');

  if (!resolvedCoverImage) {
    resolvedCoverImage = getDeterministicCoverColor(dbUser || user);
    resolvedCoverType = 'image';
    meta.coverImage = resolvedCoverImage;
    meta.coverUrl = resolvedCoverImage;
    meta.coverType = resolvedCoverType;
    changedMeta = true;
  } else if (meta.coverImage !== resolvedCoverImage || meta.coverType !== resolvedCoverType) {
    meta.coverImage = resolvedCoverImage;
    meta.coverUrl = resolvedCoverImage;
    meta.coverType = resolvedCoverType;
    changedMeta = true;
  }

  if (changedMeta) {
    try {
      await redis.set(metaKey, JSON.stringify(meta));
    } catch {}
  }

  // Resolve social handles & bio from user / dbUser / meta
  const phoneVal =
    meta.phone !== undefined
      ? meta.phone
      : user.phone && user.phone !== '-'
      ? user.phone
      : dbUser?.phone && dbUser.phone !== '-'
      ? dbUser.phone
      : '';

  const whatsappVal =
    meta.whatsapp !== undefined
      ? meta.whatsapp
      : (user.socialPlatform === 'WA' && user.socialLink)
      ? user.socialLink
      : (dbUser?.socialPlatform === 'WA' && dbUser?.socialLink)
      ? dbUser.socialLink
      : phoneVal;

  const instagramVal =
    meta.instagram !== undefined
      ? meta.instagram
      : (user.socialPlatform === 'IG' && user.socialLink)
      ? user.socialLink
      : (dbUser?.socialPlatform === 'IG' && dbUser?.socialLink)
      ? dbUser.socialLink
      : '';

  const bioVal =
    user.bio ??
    dbUser?.bio ??
    meta.bio ??
    meta.alasanMasuk ??
    meta.reason ??
    '';

  return {
    ...dbUser,
    ...user,
    displayName: user.displayName || user.name || dbUser?.name || user.nickname || dbUser?.nickname || 'Kalcerian',
    username: user.nickname || dbUser?.nickname || user.username || (user.name ? user.name.toLowerCase().replace(/\s+/g, '_') : 'kalcerian'),
    profilePicture: resolvedProfilePicture,
    coverImage: resolvedCoverImage,
    coverUrl: resolvedCoverImage,
    coverType: resolvedCoverType,
    phone: phoneVal,
    whatsapp: whatsappVal,
    instagram: instagramVal,
    bio: bioVal,
    alasanMasuk: bioVal,
    reason: bioVal || undefined,
  };
}

/**
 * Batch-enriches an array of user objects with their persistent profile metadata from Redis and PostgreSQL.
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

  // Identify users that need DB hydration (partial input + missing meta in Redis)
  const missingIds = [];
  users.forEach((u, idx) => {
    const hasMeta = Boolean(rawMetas[idx]);
    const isPartial = u.coverImage === undefined || u.coverType === undefined || u.profilePicture === undefined;
    if (isPartial && !hasMeta) {
      missingIds.push(u.id);
    }
  });

  let dbUserMap = new Map();
  if (missingIds.length > 0) {
    try {
      const dbUsers = await prisma.user.findMany({
        where: { id: { in: Array.from(new Set(missingIds)) } },
        select: CANONICAL_USER_SELECT,
      });
      dbUserMap = new Map(dbUsers.map((u) => [String(u.id), u]));
    } catch {}
  }

  const pipelineUpdates = [];

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

    const dbUser = dbUserMap.get(String(user.id));

    let resolvedProfilePicture =
      user.profilePicture ||
      dbUser?.profilePicture ||
      meta.profilePicture ||
      null;

    if (!resolvedProfilePicture) {
      resolvedProfilePicture = getDeterministicAvatarUrl(dbUser || user);
      meta.profilePicture = resolvedProfilePicture;
      changedMeta = true;
    } else if (meta.profilePicture !== resolvedProfilePicture) {
      meta.profilePicture = resolvedProfilePicture;
      changedMeta = true;
    }

    let resolvedCoverImage =
      user.coverImage ||
      user.coverUrl ||
      dbUser?.coverImage ||
      meta.coverImage ||
      meta.coverUrl ||
      null;

    let resolvedCoverType =
      user.coverType ||
      dbUser?.coverType ||
      meta.coverType ||
      (resolvedCoverImage && /\.(?:mp4|webm|mov|m4v)(?:$|\?|#)/i.test(resolvedCoverImage)
        ? 'video'
        : 'image');

    if (!resolvedCoverImage) {
      resolvedCoverImage = getDeterministicCoverColor(dbUser || user);
      resolvedCoverType = 'image';
      meta.coverImage = resolvedCoverImage;
      meta.coverUrl = resolvedCoverImage;
      meta.coverType = resolvedCoverType;
      changedMeta = true;
    } else if (meta.coverImage !== resolvedCoverImage || meta.coverType !== resolvedCoverType) {
      meta.coverImage = resolvedCoverImage;
      meta.coverUrl = resolvedCoverImage;
      meta.coverType = resolvedCoverType;
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
        : dbUser?.phone && dbUser.phone !== '-'
        ? dbUser.phone
        : '';

    const whatsappVal =
      meta.whatsapp !== undefined
        ? meta.whatsapp
        : (user.socialPlatform === 'WA' && user.socialLink)
        ? user.socialLink
        : (dbUser?.socialPlatform === 'WA' && dbUser?.socialLink)
        ? dbUser.socialLink
        : phoneVal;

    const instagramVal =
      meta.instagram !== undefined
        ? meta.instagram
        : (user.socialPlatform === 'IG' && user.socialLink)
        ? user.socialLink
        : (dbUser?.socialPlatform === 'IG' && dbUser?.socialLink)
        ? dbUser.socialLink
        : '';

    const bioVal =
      user.bio ??
      dbUser?.bio ??
      meta.bio ??
      meta.alasanMasuk ??
      meta.reason ??
      '';

    return {
      ...dbUser,
      ...user,
      displayName: user.displayName || user.name || dbUser?.name || user.nickname || dbUser?.nickname || 'Kalcerian',
      username: user.nickname || dbUser?.nickname || user.username || (user.name ? user.name.toLowerCase().replace(/\s+/g, '_') : 'kalcerian'),
      profilePicture: resolvedProfilePicture,
      coverImage: resolvedCoverImage,
      coverUrl: resolvedCoverImage,
      coverType: resolvedCoverType,
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

  return enriched;
}


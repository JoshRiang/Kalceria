import prisma from '../lib/prisma.js';
import { decodePageCursor, encodePageCursor, parsePageLimit } from '../utils/cursorPagination.js';
import { resolveIndonesianReverseGeo } from './geoController.js';
import { ensurePersistentUserProfile } from '../utils/profileDefaults.js';

const MINI_EVENT_TTL_MS = 10 * 365 * 24 * 60 * 60 * 1000; // 10 years (unlimited on map until creator deletes)
const MEDIA_ITEM_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours per uploaded media item

const MINOR_TITLE_WORDS = new Set([
  "dan", "atau", "serta", "tetapi", "tapi", "namun", "melainkan", "padahal", "sedangkan",
  "yang", "untuk", "bagi", "guna", "buat", "demi", "agar", "supaya", "biar",
  "karena", "sebab", "lantaran", "sehingga", "maka",
  "jika", "kalau", "jikalau", "apabila", "bila", "bilamana", "seandainya", "asalkan", "asal",
  "meski", "meskipun", "walau", "walaupun", "kendati", "kendatipun", "biarpun", "sekalipun", "sungguhpun",
  "ketika", "saat", "waktu", "tatkala", "sementara", "sambil", "seraya",
  "sebelum", "sesudah", "setelah", "sejak", "selama", "hingga", "sampai",
  "seperti", "bagai", "bagaikan", "ibarat", "laksana", "bak", "alih-alih",
  "di", "ke", "dari", "pada", "kepada", "daripada", "oleh", "dengan", "tanpa",
  "tentang", "mengenai", "terhadap", "antara", "dalam", "atas", "bawah",
  "menuju", "menurut", "sekitar", "sekeliling", "melalui", "lewat",
  "pun", "per", "via", "vs", "ala",
  "a", "an", "the", "and", "but", "or", "nor", "for", "yet", "so",
  "as", "at", "by", "in", "of", "on", "to", "up", "off", "out",
  "vs.", "v", "v.", "from", "into", "onto", "upon", "with", "within", "without",
  "over", "under", "between", "among", "through", "during", "before", "after", "since", "until", "till",
  "about", "against", "around", "behind", "beside", "besides", "beyond", "despite", "down", "except",
  "inside", "near", "outside", "past", "toward", "towards", "underneath", "unlike",
  "than", "that", "when", "while", "if", "though", "although",
]);

function toSmartTitleCase(value) {
  const cleaned = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (!cleaned) return "";
  return cleaned
    .split(" ")
    .map((word, idx) => {
      const match = word.match(/^([^a-zA-Z0-9]*)([a-zA-Z0-9][a-zA-Z0-9'-]*?)([^a-zA-Z0-9]*)$/);
      if (!match) return word;
      const [, prefix, core, suffix] = match;
      const lower = core.toLowerCase();
      if (idx > 0 && MINOR_TITLE_WORDS.has(lower)) {
        return `${prefix}${lower}${suffix}`;
      }
      if (
        core.length >= 2 &&
        core.length <= 5 &&
        core === core.toUpperCase() &&
        /[A-Z]/.test(core) &&
        !MINOR_TITLE_WORDS.has(lower)
      ) {
        return `${prefix}${core}${suffix}`;
      }
      return `${prefix}${lower.charAt(0).toUpperCase()}${lower.slice(1)}${suffix}`;
    })
    .join(" ");
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseCoordinate(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMiniEvent(ev) {
  const raw = ev.description || "";
  const catMatch = raw.match(/\[CAT:([a-z_]+)\]/i);
  const mediaMatch = raw.match(/\[MEDIA:([^\]]+)\]/i);
  const locMatch = raw.match(/\[LOC:([^\]]+)\]/i);
  const collabsMatch = raw.match(/\[COLLABS:([^\]]+)\]/i);
  const cleanDesc = raw
    .replace(/\[CAT:[a-z_]+\]\s*/gi, "")
    .replace(/\[MEDIA:[^\]]+\]\s*/gi, "")
    .replace(/\[LOC:[^\]]+\]\s*/gi, "")
    .replace(/\[COLLABS:[^\]]+\]\s*/gi, "")
    .trim();

  // 24-hour expiration check for individual media items (video & photos)
  const rawMediaStr = mediaMatch ? mediaMatch[1] : (ev.mediaUrl || "");
  const rawMediaList = rawMediaStr ? rawMediaStr.split(",") : [];
  const now = Date.now();
  const eventCreatedAtMs = ev.createdAt ? new Date(ev.createdAt).getTime() : now;

  const validMediaUrls = [];
  rawMediaList.forEach((item) => {
    const trimmed = String(item || "").trim();
    if (!trimmed) return;
    const parts = trimmed.split("|");
    const url = parts[0];
    const ts = parts[1] ? Number(parts[1]) : eventCreatedAtMs;
    // Check if uploaded within the last 24 hours
    if (now - ts <= MEDIA_ITEM_TTL_MS) {
      validMediaUrls.push(url);
    }
  });

  return {
    ...ev,
    title: ev.title ? toSmartTitleCase(ev.title) : ev.title,
    category: catMatch ? catMatch[1].toLowerCase() : (ev.category || "cafe"),
    mediaUrl: validMediaUrls.length > 0 ? validMediaUrls.join(",") : null,
    collaborators: collabsMatch
      ? collabsMatch[1].split(",").map((c) => c.trim()).filter(Boolean)
      : (ev.collaborators || []),
    location: locMatch ? locMatch[1].trim() : (ev.location || null),
    description: cleanDesc,
  };
}

function stripEncodedTags(raw) {
  return String(raw || "")
    .replace(/\[CAT:[a-z_]+\]\s*/gi, "")
    .replace(/\[MEDIA:[^\]]+\]\s*/gi, "")
    .replace(/\[LOC:[^\]]+\]\s*/gi, "")
    .replace(/\[COLLABS:[^\]]+\]\s*/gi, "")
    .trim();
}

function validateMiniEvent({ title, description, lat, lng }) {
  if (!title) return "Title is required.";
  if (title.length > 80) return "Title must be 80 characters or less.";
  const plainDesc = stripEncodedTags(description);
  if (plainDesc.length > 600)
    return "Description must be 600 characters or less.";
  if (lat === null || lng === null) return "Valid lat and lng are required.";
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180)
    return "Valid lat and lng are required.";
  return null;
}

export async function createMiniEvent(req, res, next) {
  try {
    const creatorId = req.user.userId;
    const title = toSmartTitleCase(cleanText(req.body.title));
    let description = cleanText(req.body.description);
    const category = cleanText(req.body.category) || "cafe";
    const mediaUrl = cleanText(req.body.mediaUrl);
    let location = cleanText(req.body.location);
    const lat = parseCoordinate(req.body.lat);
    const lng = parseCoordinate(req.body.lng);

    // Auto-resolve Indonesian reverse geocoded location if not provided
    if (!location && !description.includes("[LOC:") && lat !== null && lng !== null) {
      try {
        const geoData = await resolveIndonesianReverseGeo(lat, lng);
        if (geoData?.formatted) {
          location = geoData.formatted;
        }
      } catch {}
    }

    if (location && !description.includes("[LOC:")) {
      description = `[LOC:${location}] ${description}`;
    }
    if (mediaUrl && !description.includes("[MEDIA:")) {
      const stampedMedia = mediaUrl
        .split(",")
        .map((u) => {
          const trimmed = u.trim();
          return trimmed.includes("|") ? trimmed : `${trimmed}|${Date.now()}`;
        })
        .join(",");
      description = `[MEDIA:${stampedMedia}] ${description}`;
    }
    if (category && !description.includes("[CAT:")) {
      description = `[CAT:${category}] ${description}`;
    }
    const error = validateMiniEvent({ title, description, lat, lng });

    if (error) return res.status(400).json({ error });

    const existing = await prisma.miniEvent.findFirst({
      where: {
        creatorId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });

    if (existing) {
      return res
        .status(409)
        .json({ error: "Mini event already exists. Use PUT to update." });
    }

    await prisma.miniEvent.deleteMany({
      where: { creatorId, expiresAt: { lte: new Date() } },
    });

    const expiresAt = new Date(Date.now() + MINI_EVENT_TTL_MS);
    const event = await prisma.miniEvent.create({
      data: { creatorId, title, description, lat, lng, expiresAt },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            nickname: true,
            profilePicture: true,
          },
        },
      },
    });

    if (event.creator) {
      event.creator = await ensurePersistentUserProfile(event.creator);
    }

    res.status(201).json({ event: formatMiniEvent(event) });
  } catch (err) {
    next(err);
  }
}

export async function getActiveMiniEvents(req, res, next) {
  try {
    const limit = parsePageLimit(req.query.limit, 100, 100);
    const cursor = decodePageCursor(req.query.cursor);
    if (limit === null || cursor === false) {
      return res.status(400).json({ error: 'Pagination limit or cursor is invalid.' });
    }

    const events = await prisma.miniEvent.findMany({
      where: {
        isActive: true,
        expiresAt: { gt: new Date() },
        creator: {
          isEmailVerified: true,
          role: 'USER',
          email: {
            notIn: [
              'admin1@gmail.com',
              'admin2@gmail.com',
              'admin3@gmail.com',
              'admin4@gmail.com',
            ],
          },
        },
        ...(cursor && {
          OR: [
            { createdAt: { lt: cursor.at } },
            { createdAt: cursor.at, id: { lt: cursor.id } },
          ],
        }),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            nickname: true,
            profilePicture: true,
          },
        },
      },
    });



    const hasMore = events.length > limit;
    const pageEvents = await Promise.all(
      events.slice(0, limit).map(async (ev) => {
        if (ev.creator) {
          ev.creator = await ensurePersistentUserProfile(ev.creator);
        }
        return ev;
      })
    );
    const lastEvent = pageEvents.at(-1);
    const nextCursor = hasMore && lastEvent
      ? encodePageCursor({ id: lastEvent.id, at: lastEvent.createdAt })
      : null;

    res.json({ events: pageEvents.map(formatMiniEvent), nextCursor });
  } catch (err) {
    next(err);
  }
}

export async function updateMiniEvent(req, res, next) {
  try {
    const creatorId = req.user.userId;
    const { id } = req.params;
    const title = toSmartTitleCase(cleanText(req.body.title));
    let description = cleanText(req.body.description);
    const mediaUrl = cleanText(req.body.mediaUrl);
    let location = cleanText(req.body.location);
    const lat = parseCoordinate(req.body.lat);
    const lng = parseCoordinate(req.body.lng);

    if (!location && !description.includes("[LOC:") && lat !== null && lng !== null) {
      try {
        const geoData = await resolveIndonesianReverseGeo(lat, lng);
        if (geoData?.formatted) {
          location = geoData.formatted;
        }
      } catch {}
    }

    if (location && !description.includes("[LOC:")) {
      description = `[LOC:${location}] ${description}`;
    }

    const existing = await prisma.miniEvent.findFirst({
      where: { id, creatorId, isActive: true },
    });

    if (!existing)
      return res.status(404).json({ error: "No active mini event found." });

    if (mediaUrl && !description.includes("[MEDIA:")) {
      const stampedMedia = mediaUrl
        .split(",")
        .map((u) => {
          const trimmed = u.trim();
          return trimmed.includes("|") ? trimmed : `${trimmed}|${Date.now()}`;
        })
        .join(",");
      description = `[MEDIA:${stampedMedia}] ${description}`;
    } else if (!description.includes("[MEDIA:") && existing.description?.includes("[MEDIA:")) {
      const oldMediaMatch = existing.description.match(/\[MEDIA:([^\]]+)\]/i);
      if (oldMediaMatch) {
        description = `[MEDIA:${oldMediaMatch[1]}] ${description}`;
      }
    }

    if (!description.includes("[COLLABS:") && existing.description?.includes("[COLLABS:")) {
      const oldCollabsMatch = existing.description.match(/\[COLLABS:([^\]]+)\]/i);
      if (oldCollabsMatch) {
        description = `[COLLABS:${oldCollabsMatch[1]}] ${description}`;
      }
    }

    const error = validateMiniEvent({ title, description, lat, lng });
    if (error) return res.status(400).json({ error });

    const event = await prisma.miniEvent.update({
      where: { id },
      data: { title, description, lat, lng },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            nickname: true,
            profilePicture: true,
          },
        },
      },
    });

    if (event.creator) {
      event.creator = await ensurePersistentUserProfile(event.creator);
    }

    res.json({ event: formatMiniEvent(event) });
  } catch (err) {
    next(err);
  }
}

export async function addMiniEventMedia(req, res, next) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const rawMediaUrl = cleanText(req.body.mediaUrl);
    if (!rawMediaUrl) {
      return res.status(400).json({ error: "Media URL is required." });
    }

    const event = await prisma.miniEvent.findFirst({
      where: { id, isActive: true },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            nickname: true,
            profilePicture: true,
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: "Mini event not found." });
    }

    const collabsMatch = (event.description || "").match(/\[COLLABS:([^\]]+)\]/i);
    const collaboratorIds = collabsMatch
      ? collabsMatch[1].split(",").map((s) => s.trim().toLowerCase())
      : [];
    const isCreator = event.creatorId === userId;
    const isCollab = collaboratorIds.includes(String(userId).toLowerCase());

    if (!isCreator && !isCollab) {
      return res.status(403).json({ error: "Not authorized to add media to this event." });
    }

    const now = Date.now();
    const newMediaStamped = rawMediaUrl
      .split(",")
      .map((u) => {
        const trimmed = u.trim();
        return trimmed.includes("|") ? trimmed : `${trimmed}|${now}`;
      })
      .join(",");

    let desc = event.description || "";
    const mediaMatch = desc.match(/\[MEDIA:([^\]]+)\]/i);
    if (mediaMatch) {
      const combined = `${mediaMatch[1]},${newMediaStamped}`;
      desc = desc.replace(/\[MEDIA:[^\]]+\]/i, `[MEDIA:${combined}]`);
    } else {
      desc = `[MEDIA:${newMediaStamped}] ${desc}`;
    }

    const updated = await prisma.miniEvent.update({
      where: { id },
      data: { description: desc },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            nickname: true,
            profilePicture: true,
          },
        },
      },
    });

    if (updated.creator) {
      updated.creator = await ensurePersistentUserProfile(updated.creator);
    }

    res.json({ event: formatMiniEvent(updated) });
  } catch (err) {
    next(err);
  }
}

export async function addMiniEventCollaborator(req, res, next) {
  try {
    const creatorId = req.user.userId;
    const { id } = req.params;
    const collaboratorId = cleanText(req.body.collaboratorId);
    if (!collaboratorId) {
      return res.status(400).json({ error: "Collaborator ID is required." });
    }

    const event = await prisma.miniEvent.findFirst({
      where: { id, creatorId, isActive: true },
    });

    if (!event) {
      return res.status(404).json({ error: "Mini event not found or unauthorized." });
    }

    let desc = event.description || "";
    const collabsMatch = desc.match(/\[COLLABS:([^\]]+)\]/i);
    if (collabsMatch) {
      const list = collabsMatch[1].split(",").map((s) => s.trim()).filter(Boolean);
      if (!list.includes(collaboratorId)) {
        list.push(collaboratorId);
        desc = desc.replace(/\[COLLABS:[^\]]+\]/i, `[COLLABS:${list.join(",")}]`);
      }
    } else {
      desc = `[COLLABS:${collaboratorId}] ${desc}`;
    }

    const updated = await prisma.miniEvent.update({
      where: { id },
      data: { description: desc },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            nickname: true,
            profilePicture: true,
          },
        },
      },
    });

    if (updated.creator) {
      updated.creator = await ensurePersistentUserProfile(updated.creator);
    }

    res.json({ event: formatMiniEvent(updated) });
  } catch (err) {
    next(err);
  }
}

export async function deleteMiniEvent(req, res, next) {
  try {
    const creatorId = req.user.userId;
    const { id } = req.params;
    const event = await prisma.miniEvent.findFirst({
      where: { id, creatorId, isActive: true },
    });

    if (!event) return res.status(404).json({ error: "No mini event found." });

    await prisma.miniEvent.update({
      where: { id },
      data: { isActive: false, expiresAt: new Date(0) },
    });

    res.json({ message: "Mini event deleted." });
  } catch (err) {
    next(err);
  }
}

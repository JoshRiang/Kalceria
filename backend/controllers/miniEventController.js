import prisma from '../lib/prisma.js';
import { decodePageCursor, encodePageCursor, parsePageLimit } from '../utils/cursorPagination.js';

const MINI_EVENT_TTL_MS = 24 * 60 * 60 * 1000;

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
  return {
    ...ev,
    category: catMatch ? catMatch[1].toLowerCase() : (ev.category || "cafe"),
    mediaUrl: mediaMatch ? mediaMatch[1] : (ev.mediaUrl || null),
  };
}

function validateMiniEvent({ title, description, lat, lng }) {
  if (!title) return "Title is required.";
  if (title.length > 80) return "Title must be 80 characters or less.";
  if (description.length > 600)
    return "Description must be 600 characters or less.";
  if (lat === null || lng === null) return "Valid lat and lng are required.";
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180)
    return "Valid lat and lng are required.";
  return null;
}

export async function createMiniEvent(req, res, next) {
  try {
    const creatorId = req.user.userId;
    const title = cleanText(req.body.title);
    let description = cleanText(req.body.description);
    const category = cleanText(req.body.category) || "cafe";
    const mediaUrl = cleanText(req.body.mediaUrl);
    if (mediaUrl && !description.includes("[MEDIA:")) {
      description = `[MEDIA:${mediaUrl}] ${description}`;
    }
    if (category && !description.includes("[CAT:")) {
      description = `[CAT:${category}] ${description}`;
    }
    const lat = parseCoordinate(req.body.lat);
    const lng = parseCoordinate(req.body.lng);
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

    res.status(201).json({ event });
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

    const MOCK_MINI_EVENTS = [
      {
        id: "mini_cafe_1",
        title: "Morning Espresso Catchup",
        description: "[CAT:cafe] Morning caffeine hit and route planning before heading to BSD loop.",
        lat: -6.2735,
        lng: 106.7110,
        isActive: true,
        category: "cafe",
        mediaUrl: "/media/gifs/event_cafe_1.gif",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        creator: { id: "mock_ahmad", name: "Ahmad Bintaro", nickname: "Ahmad", profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ahmad" },
      },
      {
        id: "mini_cafe_2",
        title: "Sunset Coffee & Chills",
        description: "[CAT:cafe] Iced Latte session at Sector 7 parkside cafe. All car enthusiasts welcome.",
        lat: -6.2810,
        lng: 106.7225,
        isActive: true,
        category: "cafe",
        mediaUrl: "/media/gifs/event_cafe_2.gif",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        creator: { id: "mock_rei", name: "Rei Nathan", nickname: "Rei", profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rei" },
      },
      {
        id: "mini_cafe_3",
        title: "V6 Roaster & Filter Brew",
        description: "[CAT:cafe] Pour over tasting and casual Sunday talk with the crew.",
        lat: -6.2680,
        lng: 106.7085,
        isActive: true,
        category: "cafe",
        mediaUrl: "/media/gifs/event_cafe_3.gif",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        creator: { id: "mock_josh", name: "Josh Riang", nickname: "Josh", profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Josh" },
      },
      {
        id: "mini_spec_1",
        title: "Sunday Morning Fast Run",
        description: "[CAT:special] Early morning spirited highway convoy to Karawaci circuit loop.",
        lat: -6.2790,
        lng: 106.7160,
        isActive: true,
        category: "special",
        mediaUrl: "/media/gifs/event_spec_1.gif",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        creator: { id: "mock_alpha", name: "Kalcerian Alpha", nickname: "Alpha", profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alpha" },
      },
      {
        id: "mini_spec_2",
        title: "Trackday Rollout Prep",
        description: "[CAT:special] Alignment check and tire pressure setup before Sentul session.",
        lat: -6.2650,
        lng: 106.7190,
        isActive: true,
        category: "special",
        mediaUrl: "/media/gifs/event_spec_2.gif",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        creator: { id: "mock_ghost", name: "Ghost Rider", nickname: "Ghost", profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ghost" },
      },
      {
        id: "mini_spec_3",
        title: "Midnight Garage Reveal",
        description: "[CAT:special] Secret widebody build unveiling with the core engineering circle.",
        lat: -6.2855,
        lng: 106.7060,
        isActive: true,
        category: "special",
        mediaUrl: "/media/gifs/event_spec_3.gif",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        creator: { id: "mock_otniel", name: "Otniel Kevin", nickname: "Otniel", profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Otniel" },
      },
      {
        id: "mini_eat_1",
        title: "Late Night Sate & Tongseng",
        description: "[CAT:eat] Post-cruise street food feast near Fresh Market strip.",
        lat: -6.2710,
        lng: 106.7145,
        isActive: true,
        category: "eat",
        mediaUrl: "/media/gifs/event_eat_1.gif",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        creator: { id: "mock_coki", name: "Coki", nickname: "Coki", profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Coki" },
      },
      {
        id: "mini_eat_2",
        title: "Dimsum Brunch Gathering",
        description: "[CAT:eat] Warm dimsum feast and parking lot lineup at Bintaro Loop.",
        lat: -6.2760,
        lng: 106.7250,
        isActive: true,
        category: "eat",
        mediaUrl: "/media/gifs/event_eat_2.gif",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        creator: { id: "mock_bonita", name: "Bonita Bon", nickname: "Bonita", profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bonita" },
      },
      {
        id: "mini_eat_3",
        title: "Smoked Brisket Dinner",
        description: "[CAT:eat] BBQ platter sharing and dyno talk with the turbos family.",
        lat: -6.2620,
        lng: 106.7120,
        isActive: true,
        category: "eat",
        mediaUrl: "/media/gifs/event_eat_3.gif",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        creator: { id: "mock_dinda", name: "Dinda Laras", nickname: "Dinda", profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Dinda" },
      },
      {
        id: "mini_disc_1",
        title: "ECU Tuning & Map Strategy",
        description: "[CAT:discuss] In-depth technical breakdown of fuel trims, ignition timing, and boost curves.",
        lat: -6.2745,
        lng: 106.7180,
        isActive: true,
        category: "discuss",
        mediaUrl: "/media/gifs/event_disc_1.gif",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        creator: { id: "mock_melati", name: "Melati Eka", nickname: "Melati", profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Melati" },
      },
      {
        id: "mini_disc_2",
        title: "Coilovers & Camber Talk",
        description: "[CAT:discuss] Suspension geometry roundtable: roll centers and damper rebound settings.",
        lat: -6.2830,
        lng: 106.7115,
        isActive: true,
        category: "discuss",
        mediaUrl: "/media/gifs/event_disc_2.gif",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        creator: { id: "mock_adit", name: "Adit Bintaro", nickname: "Adit", profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Adit" },
      },
      {
        id: "mini_disc_3",
        title: "Aero & Downforce Clinic",
        description: "[CAT:discuss] Computational flow analysis discussion on rear wings and front splitters.",
        lat: -6.2695,
        lng: 106.7210,
        isActive: true,
        category: "discuss",
        mediaUrl: "/media/gifs/event_disc_3.gif",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        creator: { id: "mock_fajar", name: "Fajar Drift", nickname: "Fajar", profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Fajar" },
      },
    ];

    const hasMore = events.length > limit;
    const pageEvents = events.slice(0, limit);
    const lastEvent = pageEvents.at(-1);
    const nextCursor = hasMore && lastEvent
      ? encodePageCursor({ id: lastEvent.id, at: lastEvent.createdAt })
      : null;

    if (!nextCursor) {
      for (const mockItem of MOCK_MINI_EVENTS) {
        if (!pageEvents.some((e) => e.id === mockItem.id)) {
          pageEvents.push(mockItem);
        }
      }
    }
    res.json({ events: pageEvents.map(formatMiniEvent), nextCursor });
  } catch (err) {
    next(err);
  }
}

export async function updateMiniEvent(req, res, next) {
  try {
    const creatorId = req.user.userId;
    const { id } = req.params;
    const title = cleanText(req.body.title);
    const description = cleanText(req.body.description);
    const lat = parseCoordinate(req.body.lat);
    const lng = parseCoordinate(req.body.lng);
    const error = validateMiniEvent({ title, description, lat, lng });

    if (error) return res.status(400).json({ error });

    const existing = await prisma.miniEvent.findFirst({
      where: { id, creatorId, isActive: true, expiresAt: { gt: new Date() } },
    });

    if (!existing)
      return res.status(404).json({ error: "No active mini event found." });

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

    res.json({ event });
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

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── POST /admin/merch ────────────────────────────────────────────────────────
export async function createMerch(req, res, next) {
  try {
    const { name, photoUrl, link, price } = req.body;
    const merch = await prisma.merch.create({ data: { name, photoUrl, link, price } });
    res.status(201).json({ merch });
  } catch (err) { next(err); }
}

// ─── GET /admin/merch ─────────────────────────────────────────────────────────
export async function listMerch(req, res, next) {
  try {
    const merch = await prisma.merch.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ merch });
  } catch (err) { next(err); }
}

// ─── PUT /admin/merch/:id ─────────────────────────────────────────────────────
export async function updateMerch(req, res, next) {
  try {
    const { price, photoUrl, link } = req.body;
    const merch = await prisma.merch.update({
      where: { id: req.params.id },
      data: {
        ...(price !== undefined && { price }),
        ...(photoUrl && { photoUrl }),
        ...(link && { link }),
      },
    });
    res.json({ merch });
  } catch (err) { next(err); }
}

// ─── PATCH /admin/merch/:id/soldout ──────────────────────────────────────────
export async function toggleSoldOut(req, res, next) {
  try {
    const current = await prisma.merch.findUnique({ where: { id: req.params.id }, select: { isSoldOut: true } });
    const merch = await prisma.merch.update({
      where: { id: req.params.id },
      data: { isSoldOut: !current.isSoldOut },
    });
    res.json({ isSoldOut: merch.isSoldOut });
  } catch (err) { next(err); }
}

// ─── DELETE /admin/merch/:id ──────────────────────────────────────────────────
export async function deleteMerch(req, res, next) {
  try {
    await prisma.merch.delete({ where: { id: req.params.id } });
    res.json({ message: 'Merch deleted.' });
  } catch (err) { next(err); }
}

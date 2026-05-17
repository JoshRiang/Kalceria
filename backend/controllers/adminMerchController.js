import prisma from '../lib/prisma.js';
import { createLog } from './auditController.js';

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
    const merch = await prisma.merch.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { sales: true } } },
    });
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

// ─── POST /admin/merch/:id/sales ─────────────────────────────────────────────
export async function recordMerchSale(req, res, next) {
  try {
    const { qty, pricePerUnit } = req.body;
    const parsedQty = parseInt(qty, 10);
    const parsedPrice = parseFloat(pricePerUnit);

    if (!parsedQty || parsedQty < 1) return res.status(400).json({ error: 'qty must be a positive integer.' });
    if (!parsedPrice || parsedPrice <= 0) return res.status(400).json({ error: 'pricePerUnit must be a positive number.' });

    const totalAmount = parsedQty * parsedPrice;

    // Atomic: create sale log + increment merch counters in one transaction
    const [sale, merch] = await prisma.$transaction([
      prisma.merchSale.create({
        data: {
          merchId: req.params.id,
          qty: parsedQty,
          pricePerUnit: parsedPrice,
          totalAmount,
          recordedBy: req.user.email,
        },
      }),
      prisma.merch.update({
        where: { id: req.params.id },
        data: {
          soldCount: { increment: parsedQty },
          totalRevenue: { increment: totalAmount },
        },
      }),
    ]);

    await createLog(
      req.user.email,
      `Recorded sale for Merch ${req.params.id}: ${parsedQty} units @ IDR ${parsedPrice.toLocaleString('id-ID')} = IDR ${totalAmount.toLocaleString('id-ID')}`
    );

    res.status(201).json({ sale, merch });
  } catch (err) { next(err); }
}

// ─── DELETE /admin/merch/:id ──────────────────────────────────────────────────
export async function deleteMerch(req, res, next) {
  try {
    await prisma.merch.delete({ where: { id: req.params.id } });
    res.json({ message: 'Merch deleted.' });
  } catch (err) { next(err); }
}

import {
  listUserEventArchives,
  updateUserEventArchive,
  deleteUserEventArchive,
} from '../services/eventArchiveStore.js';

export async function getUserEventArchivesHandler(req, res, next) {
  try {
    const viewerId = req.user.userId;
    const targetUserId = String(req.params.targetUserId || '').trim();
    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID is required.' });
    }
    const result = await listUserEventArchives({ targetUserId, viewerId });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

export async function updateUserEventArchiveHandler(req, res, next) {
  try {
    const userId = req.user.userId;
    const archiveId = String(req.params.archiveId || '').trim();
    if (!archiveId) {
      return res.status(400).json({ error: 'Archive ID is required.' });
    }
    const { impression, isHidden } = req.body || {};
    const result = await updateUserEventArchive({
      archiveId,
      userId,
      impression,
      isHidden: typeof isHidden === 'boolean' ? isHidden : undefined,
    });
    if (result.notFound) return res.status(404).json({ error: 'Event archive not found.' });
    if (result.forbidden) return res.status(403).json({ error: 'Not authorized to update this archive.' });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

export async function deleteUserEventArchiveHandler(req, res, next) {
  try {
    const userId = req.user.userId;
    const archiveId = String(req.params.archiveId || '').trim();
    if (!archiveId) {
      return res.status(400).json({ error: 'Archive ID is required.' });
    }
    const result = await deleteUserEventArchive({ archiveId, userId });
    if (result.notFound) return res.status(404).json({ error: 'Event archive not found.' });
    if (result.forbidden) return res.status(403).json({ error: 'Not authorized to delete this archive.' });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}


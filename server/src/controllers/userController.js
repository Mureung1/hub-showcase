import { getTastesByUserId, getBakeryStatuses, toggleBakeryStatus } from '../models/user.js';

export async function getMe(req, res, next) {
  try {
    const [taste, { visited, wishlist }] = await Promise.all([
      getTastesByUserId(req.user.id),
      getBakeryStatuses(req.user.id),
    ]);
    res.json({ success: true, data: { id: req.user.username, taste, visited, wishlist } });
  } catch (err) {
    next(err);
  }
}

export async function toggleStatus(req, res, next) {
  try {
    const { bakeryId, status } = req.body;
    if (!bakeryId || (status !== 'visited' && status !== 'wishlist')) {
      const err = new Error("bakeryId와 status('visited' 또는 'wishlist')가 필요해요.");
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    const active = await toggleBakeryStatus(req.user.id, bakeryId, status);
    res.json({ success: true, data: { bakeryId, status, active } });
  } catch (err) {
    next(err);
  }
}

const { Notification, GroupPurchase } = require('../models');

async function listMine(req, res, next) {
  try {
    const data = await Notification.findAll({
      where: { userId: req.user.id },
      include: [{ model: GroupPurchase, attributes: ['id', 'title'] }],
      order: [['createdAt', 'DESC']],
      limit: 20,
    });
    return res.status(200).json({ success: true, data, error: null });
  } catch (error) {
    return next(error);
  }
}

async function removeMine(req, res, next) {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!notification) {
      return res.status(404).json({ success: false, data: null, error: { message: '알림을 찾을 수 없습니다.' } });
    }

    const deletedId = notification.id;
    await notification.destroy();
    return res.status(200).json({ success: true, data: { id: deletedId, deleted: true }, error: null });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listMine, removeMine };

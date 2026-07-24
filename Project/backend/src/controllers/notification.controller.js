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

module.exports = { listMine };

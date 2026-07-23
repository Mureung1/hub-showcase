const { GroupPurchase, Notification, User, UserGroupPurchase } = require('../models');
const { sendMail } = require('../utils/mailer');

const statusMessages = {
  COMPLETED: { title: '공동구매 모집이 완료됐어요', content: '모집 인원이 모두 찼어요. 방장의 주문 안내를 기다려 주세요.' },
  ORDERED: { title: '공동구매 주문이 완료됐어요', content: '방장이 주문을 완료했어요. 픽업 준비 상태를 확인해 주세요.' },
  WAITING_PICKUP: { title: '공동구매 픽업 준비가 완료됐어요', content: '이제 픽업할 수 있어요. 약속한 장소와 시간을 확인해 주세요.' },
  FAILED: { title: '공동구매 모집이 마감됐어요', content: '마감 시간까지 모집 인원이 채워지지 않아 공동구매가 취소됐어요.' },
};

async function notifyParticipantsOfStatus(groupPurchaseId, status) {
  const template = statusMessages[status];
  if (!template) return [];

  const [purchase, applications] = await Promise.all([
    GroupPurchase.findByPk(groupPurchaseId),
    UserGroupPurchase.findAll({ where: { groupPurchaseId }, include: [{ model: User, attributes: ['id', 'email', 'nickname'] }] }),
  ]);
  if (!purchase) return [];

  return Promise.all(applications.map(async (application) => {
    const notification = await Notification.create({
      userId: application.userId,
      groupPurchaseId,
      title: template.title,
      content: `[${purchase.title}] ${template.content}`,
      type: 'EMAIL',
    });
    try {
      const result = await sendMail({
        to: application.User.email,
        subject: `[ThingDong] ${template.title}`,
        text: `[${purchase.title}]\n${template.content}`,
      });
      if (result.sent) await notification.update({ sentAt: new Date() });
    } catch (error) {
      console.error('[notification] email delivery failed:', error.message);
    }
    return notification;
  }));
}

module.exports = { notifyParticipantsOfStatus };

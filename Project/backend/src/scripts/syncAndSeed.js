const { sequelize, User, GroupPurchase } = require('../models');
const { assertDbConnection } = require('../config/db');

async function main() {
  await assertDbConnection();
  await sequelize.sync({ force: true });
  console.log('[seed] tables synced');

  const host = await User.create({
    email: 'host@example.com',
    nickname: '공구장',
    oauthProvider: 'KAKAO',
    oauthId: 'kakao-dev-1',
  });

  const participant = await User.create({
    email: 'participant@example.com',
    nickname: '참여자',
    oauthProvider: 'NAVER',
    oauthId: 'naver-dev-1',
  });

  const groupPurchase = await GroupPurchase.create({
    hostId: host.id,
    title: '삼겹살 대용량 공구',
    description: '동네 마트 삼겹살 1kg 단위 소분',
    productUrl: 'https://example-mart.com/products/pork-belly-1kg',
    category: 'FOOD',
    perPersonPrice: 8000,
    totalPrice: 32000,
    targetParticipants: 4,
    currentParticipants: 0,
    pickupLatitude: 37.5665,
    pickupLongitude: 126.978,
    pickupTimeSlot: '평일 저녁 7~9시',
    deadlineAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    status: 'RECRUITING',
  });

  console.log('[seed] users and group purchase created');
  console.log({
    hostId: host.id,
    participantId: participant.id,
    groupPurchaseId: groupPurchase.id,
  });

  await sequelize.close();
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});


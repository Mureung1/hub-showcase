const { sequelize, User, GroupPurchase } = require('../models');
const { assertDbConnection } = require('../config/db');

const seedProductUrl = 'https://example-mart.com/products/pork-belly-1kg';

async function main() {
  await assertDbConnection();

  const shouldReset = process.argv.includes('--reset');
  await sequelize.sync({ force: shouldReset });
  console.log(shouldReset ? '[seed] tables reset and synced' : '[seed] tables synced without deleting data');

  const [host] = await User.findOrCreate({
    where: { email: 'host@example.com' },
    defaults: {
      nickname: '공구왕',
      oauthProvider: 'KAKAO',
      oauthId: 'kakao-dev-1',
    },
  });

  const [participant] = await User.findOrCreate({
    where: { email: 'participant@example.com' },
    defaults: {
      nickname: '참여자',
      oauthProvider: 'NAVER',
      oauthId: 'naver-dev-1',
    },
  });

  let groupPurchase = await GroupPurchase.findOne({ where: { productUrl: seedProductUrl } });
  if (!groupPurchase) {
    groupPurchase = await GroupPurchase.create({
      hostId: host.id,
      title: '삼겹살 대용량 공구',
      description: '동네 마트 삼겹살 1kg 소분',
      productUrl: seedProductUrl,
      imageUrl: 'https://images.unsplash.com/photo-1603046891744-1f76eb10aec1?auto=format&fit=crop&w=1200&q=80',
      imageUrls: ['https://images.unsplash.com/photo-1603046891744-1f76eb10aec1?auto=format&fit=crop&w=1200&q=80'],
      category: 'FOOD',
      perPersonPrice: 8000,
      totalPrice: 32000,
      targetParticipants: 4,
      currentParticipants: 1,
      pickupLatitude: 37.5665,
      pickupLongitude: 126.978,
      pickupTimeSlot: '평일 저녁 7~9시',
      deadlineAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
      status: 'RECRUITING',
    });
  }

  console.log('[seed] users and group purchase ready');
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

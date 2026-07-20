const request = require('supertest');
const app = require('../app');
const { sequelize, User, GroupPurchase, UserGroupPurchase } = require('../models');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

jest.setTimeout(15000);

function getAuthHeader(userId) {
  const token = jwt.sign({ sub: userId }, env.jwt.accessSecret, { expiresIn: '5m' });
  return `Bearer ${token}`;
}

describe('ThingDong Concurrency and State Transition Tests', () => {
  let hostUser;
  const participants = [];

  beforeAll(async () => {
    // Recreate database tables for testing
    await sequelize.sync({ force: true });

    // Create a host user
    hostUser = await User.create({
      email: 'host@test.com',
      nickname: 'HostUser',
      oauthProvider: 'KAKAO',
      oauthId: 'host-oauth-1',
    });

    // Create 5 distinct participant users
    for (let i = 1; i <= 5; i++) {
      const user = await User.create({
        email: `part${i}@test.com`,
        nickname: `PartUser${i}`,
        oauthProvider: 'NAVER',
        oauthId: `part-oauth-${i}`,
      });
      participants.push(user);
    }
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /group-purchases/:id/join', () => {
    let groupPurchase;

    beforeEach(async () => {
      // Clear join tables
      await UserGroupPurchase.destroy({ where: {} });

      // Create a fresh recruiting group purchase with target 3
      groupPurchase = await GroupPurchase.create({
        hostId: hostUser.id,
        title: '신선한 계란 나눔 공구',
        description: '계란 30구 공구',
        productUrl: 'https://example.com/eggs',
        totalPrice: 15000,
        targetParticipants: 3,
        currentParticipants: 0,
        perPersonPrice: 5000,
        pickupLatitude: 37.5665,
        pickupLongitude: 126.978,
        category: 'FOOD',
        status: 'RECRUITING',
        deadlineAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      });
    });

    test('상태 전이 테스트: 3명이 참여하면 상태가 COMPLETED로 전환된다', async () => {
      // 1st participant joins
      let res = await request(app)
        .post(`/group-purchases/${groupPurchase.id}/join`)
        .set('Authorization', getAuthHeader(participants[0].id));
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.groupPurchase.currentParticipants).toBe(1);
      expect(res.body.data.groupPurchase.status).toBe('RECRUITING');

      // 2nd participant joins
      res = await request(app)
        .post(`/group-purchases/${groupPurchase.id}/join`)
        .set('Authorization', getAuthHeader(participants[1].id));
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.groupPurchase.currentParticipants).toBe(2);
      expect(res.body.data.groupPurchase.status).toBe('RECRUITING');

      // 3rd participant joins (completes target)
      res = await request(app)
        .post(`/group-purchases/${groupPurchase.id}/join`)
        .set('Authorization', getAuthHeader(participants[2].id));
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.groupPurchase.currentParticipants).toBe(3);
      expect(res.body.data.groupPurchase.status).toBe('COMPLETED');

      // Check DB values directly
      const dbGroup = await GroupPurchase.findByPk(groupPurchase.id);
      expect(dbGroup.status).toBe('COMPLETED');
      expect(dbGroup.currentParticipants).toBe(3);
    });

    test('동시성 제어 테스트: 남은 2개 자리에 4명이 동시에 참여 신청할 시, 정확히 2명만 성공하고 2명은 409 에러를 받는다', async () => {
      // Set target to 2, resetting counters
      await groupPurchase.update({ targetParticipants: 2, currentParticipants: 0, status: 'RECRUITING' });

      // Run 4 concurrent requests (User 0, 1, 2, 3)
      const requests = [
        request(app)
          .post(`/group-purchases/${groupPurchase.id}/join`)
          .set('Authorization', getAuthHeader(participants[0].id)),
        request(app)
          .post(`/group-purchases/${groupPurchase.id}/join`)
          .set('Authorization', getAuthHeader(participants[1].id)),
        request(app)
          .post(`/group-purchases/${groupPurchase.id}/join`)
          .set('Authorization', getAuthHeader(participants[2].id)),
        request(app)
          .post(`/group-purchases/${groupPurchase.id}/join`)
          .set('Authorization', getAuthHeader(participants[3].id)),
      ];

      const responses = await Promise.all(requests);

      const successResponses = responses.filter(r => r.status === 201);
      const failResponses = responses.filter(r => r.status === 409);

      // Verify that exactly 2 requests succeeded and exactly 2 failed
      expect(successResponses.length).toBe(2);
      expect(failResponses.length).toBe(2);

      // Verify database consistency
      const dbGroup = await GroupPurchase.findByPk(groupPurchase.id);
      expect(dbGroup.currentParticipants).toBe(2);
      expect(dbGroup.status).toBe('COMPLETED');

      const dbJoinsCount = await UserGroupPurchase.count({ where: { groupPurchaseId: groupPurchase.id } });
      expect(dbJoinsCount).toBe(2);
    });
  });

  describe('POST /group-purchases', () => {
    test('인증된 사용자의 등록 요청은 201 Created를 반환하고 해당 사용자를 호스트로 설정한다', async () => {
      const res = await request(app)
        .post('/group-purchases')
        .set('Authorization', getAuthHeader(hostUser.id))
        .send({
          title: '인증 없는 테스트',
          productUrl: 'http://test.com',
          totalPrice: 10000,
          targetParticipants: 2,
          category: 'FOOD',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.hostId).toBe(hostUser.id);
    });

    test('인증 없이 등록하면 401을 반환한다', async () => {
      const res = await request(app)
        .post('/group-purchases')
        .send({
          title: '인증 없는 등록',
          productUrl: 'http://test.com',
          totalPrice: 10000,
          targetParticipants: 2,
          category: 'FOOD',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    test('필수 필드(title, productUrl, totalPrice, targetParticipants, category) 누락 시 400 Validation Error 반환', async () => {
      const res = await request(app)
        .post('/group-purchases')
        .set('Authorization', getAuthHeader(participants[0].id))
        .send({
          title: '일부 필드 누락',
          // productUrl, totalPrice, targetParticipants, category 누락
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('정상적인 필드로 요청 시 201 Created 반환 및 perPersonPrice 계산 확인', async () => {
      const newPostData = {
        title: '신선한 토마토 5kg 나눔',
        description: '유기농 토마토 공구',
        productUrl: 'http://test.com/tomato',
        totalPrice: 20000,
        targetParticipants: 4,
        pickupLatitude: 37.5,
        pickupLongitude: 127.0,
        pickupTimeSlot: '저녁 7시 아파트 앞',
        category: 'FOOD',
      };

      const res = await request(app)
        .post('/group-purchases')
        .set('Authorization', getAuthHeader(participants[0].id))
        .send(newPostData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(newPostData.title);
      expect(res.body.data.perPersonPrice).toBe(5000); // 20000 / 4 = 5000
      expect(res.body.data.currentParticipants).toBe(0);
      expect(res.body.data.status).toBe('RECRUITING');

      // Verify DB persistence
      const dbRecord = await GroupPurchase.findByPk(res.body.data.id);
      expect(dbRecord).not.toBeNull();
      expect(dbRecord.title).toBe(newPostData.title);
    });
  });
});

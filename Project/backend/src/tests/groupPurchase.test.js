jest.mock('../utils/mailer', () => ({
  sendMail: jest.fn().mockResolvedValue({ sent: true, messageId: 'test-message' }),
  isMailerConfigured: jest.fn().mockReturnValue(true),
}));

const request = require('supertest');
const app = require('../app');
const { sequelize, User, GroupPurchase, UserGroupPurchase, Notification } = require('../models');
const { sendMail } = require('../utils/mailer');
const { processExpiredGroupPurchases } = require('../schedulers/deadlineScheduler');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

jest.setTimeout(60000);

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

  describe('GET /group-purchases', () => {
    test('공개 목록은 모집 중인 공동구매만 반환한다', async () => {
      await GroupPurchase.create({
        hostId: hostUser.id,
        title: '모집 중 공구',
        productUrl: 'https://example.com/recruiting-list',
        totalPrice: 10000,
        targetParticipants: 2,
        currentParticipants: 0,
        perPersonPrice: 5000,
        pickupLatitude: 37.5665,
        pickupLongitude: 126.978,
        category: 'FOOD',
        status: 'RECRUITING',
        deadlineAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      });
      await GroupPurchase.create({
        hostId: hostUser.id,
        title: '마감 공구',
        productUrl: 'https://example.com/completed-list',
        totalPrice: 10000,
        targetParticipants: 2,
        currentParticipants: 2,
        perPersonPrice: 5000,
        pickupLatitude: 37.5665,
        pickupLongitude: 126.978,
        category: 'FOOD',
        status: 'COMPLETED',
        deadlineAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      });
      await GroupPurchase.create({
        hostId: hostUser.id,
        title: '시간이 지난 모집 공구',
        productUrl: 'https://example.com/expired-list',
        totalPrice: 10000,
        targetParticipants: 2,
        currentParticipants: 0,
        perPersonPrice: 5000,
        pickupLatitude: 37.5665,
        pickupLongitude: 126.978,
        category: 'FOOD',
        status: 'RECRUITING',
        deadlineAt: new Date(Date.now() - 1000 * 60),
      });

      const res = await request(app).get('/group-purchases');

      expect(res.status).toBe(200);
      expect(res.body.data.map((item) => item.title)).toContain('모집 중 공구');
      expect(res.body.data.map((item) => item.title)).not.toContain('마감 공구');
      expect(res.body.data.map((item) => item.title)).not.toContain('시간이 지난 모집 공구');
    });
  });

  describe('DELETE /group-purchases/:id/join', () => {
    let groupPurchase;

    beforeEach(async () => {
      await UserGroupPurchase.destroy({ where: {} });
      groupPurchase = await GroupPurchase.create({
        hostId: hostUser.id,
        title: '참여 취소 테스트 공구',
        description: '참여 취소 규칙을 검증합니다.',
        productUrl: `https://example.com/cancel-${Date.now()}`,
        totalPrice: 15000,
        targetParticipants: 3,
        currentParticipants: 1,
        perPersonPrice: 5000,
        pickupLatitude: 37.5665,
        pickupLongitude: 126.978,
        category: 'FOOD',
        status: 'RECRUITING',
        deadlineAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      });
      await UserGroupPurchase.create({
        userId: participants[0].id,
        groupPurchaseId: groupPurchase.id,
      });
    });

    test('모집 중인 공구는 참여자가 참여를 취소할 수 있다', async () => {
      const res = await request(app)
        .delete(`/group-purchases/${groupPurchase.id}/join`)
        .set('Authorization', getAuthHeader(participants[0].id));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.groupPurchase.currentParticipants).toBe(1);
      expect(res.body.data.groupPurchase.status).toBe('RECRUITING');

      const applicationCount = await UserGroupPurchase.count({
        where: { groupPurchaseId: groupPurchase.id, userId: participants[0].id },
      });
      expect(applicationCount).toBe(0);
    });

    test('참여하지 않은 사용자는 참여를 취소할 수 없다', async () => {
      const res = await request(app)
        .delete(`/group-purchases/${groupPurchase.id}/join`)
        .set('Authorization', getAuthHeader(participants[1].id));

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('JOIN_NOT_FOUND');
    });

    test('모집 완료 공구는 참여를 취소할 수 없다', async () => {
      await groupPurchase.update({ status: 'COMPLETED' });

      const res = await request(app)
        .delete(`/group-purchases/${groupPurchase.id}/join`)
        .set('Authorization', getAuthHeader(participants[0].id));

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CANNOT_CANCEL_COMPLETED');
    });
  });

  describe('GET /group-purchases/mine', () => {
    let hostedPurchase;
    let joinedPurchase;

    beforeEach(async () => {
      await UserGroupPurchase.destroy({ where: {} });
      await GroupPurchase.destroy({ where: {} });

      hostedPurchase = await GroupPurchase.create({
        hostId: hostUser.id,
        title: '내가 만든 공구',
        productUrl: 'https://example.com/hosted',
        totalPrice: 10000,
        targetParticipants: 2,
        currentParticipants: 0,
        perPersonPrice: 5000,
        pickupLatitude: 37.5665,
        pickupLongitude: 126.978,
        category: 'FOOD',
        status: 'RECRUITING',
        deadlineAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      });
      joinedPurchase = await GroupPurchase.create({
        hostId: hostUser.id,
        title: '내가 참여한 공구',
        productUrl: 'https://example.com/joined',
        totalPrice: 12000,
        targetParticipants: 3,
        currentParticipants: 1,
        perPersonPrice: 4000,
        pickupLatitude: 37.5665,
        pickupLongitude: 126.978,
        category: 'FOOD',
        status: 'RECRUITING',
        deadlineAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      });
      await UserGroupPurchase.create({ userId: participants[0].id, groupPurchaseId: joinedPurchase.id });
    });

    test('로그인 사용자의 프로필과 만든 공구, 참여한 공구를 반환한다', async () => {
      const hostResponse = await request(app)
        .get('/group-purchases/mine')
        .set('Authorization', getAuthHeader(hostUser.id));
      const participantResponse = await request(app)
        .get('/group-purchases/mine')
        .set('Authorization', getAuthHeader(participants[0].id));

      expect(hostResponse.status).toBe(200);
      expect(hostResponse.body.data.user.id).toBe(hostUser.id);
      expect(hostResponse.body.data.hosted.map((item) => item.id)).toContain(hostedPurchase.id);
      expect(hostResponse.body.data.joined).toHaveLength(0);

      expect(participantResponse.status).toBe(200);
      expect(participantResponse.body.data.user.id).toBe(participants[0].id);
      expect(participantResponse.body.data.joined[0].id).toBe(joinedPurchase.id);
      expect(participantResponse.body.data.hosted).toHaveLength(0);
    });
  });

  describe('공동구매 주문·픽업 통합 흐름', () => {
    let groupPurchase;

    beforeEach(async () => {
      await UserGroupPurchase.destroy({ where: {} });
      await GroupPurchase.destroy({ where: {} });
      groupPurchase = await GroupPurchase.create({
        hostId: hostUser.id,
        title: '주문부터 수령까지 테스트 공구',
        productUrl: 'https://example.com/lifecycle',
        totalPrice: 10000,
        targetParticipants: 2,
        currentParticipants: 2,
        perPersonPrice: 5000,
        pickupLatitude: 37.5665,
        pickupLongitude: 126.978,
        pickupTimeSlot: '토요일 오후 2시, 관리실 앞',
        category: 'FOOD',
        status: 'COMPLETED',
        deadlineAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      });
      await UserGroupPurchase.create({ userId: participants[0].id, groupPurchaseId: groupPurchase.id, isPaid: true, isPaymentConfirmed: true });
      await UserGroupPurchase.create({ userId: participants[1].id, groupPurchaseId: groupPurchase.id, isPaid: true, isPaymentConfirmed: true });
    });

    test('방장만 순서대로 주문 완료와 픽업 대기 상태로 바꿀 수 있다', async () => {
      const participantResponse = await request(app)
        .patch(`/group-purchases/${groupPurchase.id}/status`)
        .set('Authorization', getAuthHeader(participants[0].id))
        .send({ status: 'ORDERED' });
      expect(participantResponse.status).toBe(403);

      const skippedResponse = await request(app)
        .patch(`/group-purchases/${groupPurchase.id}/status`)
        .set('Authorization', getAuthHeader(hostUser.id))
        .send({ status: 'WAITING_PICKUP' });
      expect(skippedResponse.status).toBe(409);

      const orderedResponse = await request(app)
        .patch(`/group-purchases/${groupPurchase.id}/status`)
        .set('Authorization', getAuthHeader(hostUser.id))
        .send({ status: 'ORDERED' });
      expect(orderedResponse.status).toBe(200);
      expect(orderedResponse.body.data.status).toBe('ORDERED');

      const pickupResponse = await request(app)
        .patch(`/group-purchases/${groupPurchase.id}/status`)
        .set('Authorization', getAuthHeader(hostUser.id))
        .send({ status: 'WAITING_PICKUP' });
      expect(pickupResponse.status).toBe(200);
      expect(pickupResponse.body.data.status).toBe('WAITING_PICKUP');
    });

    test('참여자의 수령 완료 기록이 모두 있어야 방장이 공구를 완료할 수 있다', async () => {
      await request(app)
        .patch(`/group-purchases/${groupPurchase.id}/status`)
        .set('Authorization', getAuthHeader(hostUser.id))
        .send({ status: 'ORDERED' });
      await request(app)
        .patch(`/group-purchases/${groupPurchase.id}/status`)
        .set('Authorization', getAuthHeader(hostUser.id))
        .send({ status: 'WAITING_PICKUP' });

      const firstReceipt = await request(app)
        .patch(`/group-purchases/${groupPurchase.id}/receipt`)
        .set('Authorization', getAuthHeader(participants[0].id));
      expect(firstReceipt.status).toBe(200);
      expect(firstReceipt.body.data.isReceived).toBe(true);

      const earlyFinish = await request(app)
        .patch(`/group-purchases/${groupPurchase.id}/status`)
        .set('Authorization', getAuthHeader(hostUser.id))
        .send({ status: 'FINISHED' });
      expect(earlyFinish.status).toBe(409);
      expect(earlyFinish.body.error.code).toBe('PARTICIPANTS_NOT_RECEIVED');

      const secondReceipt = await request(app)
        .patch(`/group-purchases/${groupPurchase.id}/receipt`)
        .set('Authorization', getAuthHeader(participants[1].id));
      expect(secondReceipt.status).toBe(200);

      const finishedResponse = await request(app)
        .patch(`/group-purchases/${groupPurchase.id}/status`)
        .set('Authorization', getAuthHeader(hostUser.id))
        .send({ status: 'FINISHED' });
      expect(finishedResponse.status).toBe(200);
      expect(finishedResponse.body.data.status).toBe('FINISHED');
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
          imageUrl: 'data:image/png;base64,authenticated-test-photo',
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
        imageUrl: 'data:image/png;base64,existing-test-photo',
        totalPrice: 20000,
        targetParticipants: 4,
        pickupLatitude: 37.5,
        pickupLongitude: 127.0,
        pickupDetailAddress: '101동 공동현관 앞',
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
      expect(res.body.data.currentParticipants).toBe(1);
      expect(res.body.data.status).toBe('RECRUITING');

      // Verify DB persistence
      const dbRecord = await GroupPurchase.findByPk(res.body.data.id);
      expect(dbRecord).not.toBeNull();
      expect(dbRecord.title).toBe(newPostData.title);
      expect(dbRecord.pickupDetailAddress).toBe('101동 공동현관 앞');
    });

    test('상품 사진 없이 등록하면 거절하고, 사진 URL은 게시글에 저장한다', async () => {
      const missingPhoto = await request(app)
        .post('/group-purchases')
        .set('Authorization', getAuthHeader(participants[0].id))
        .send({
          title: '사진 없는 공동구매', productUrl: 'https://example.com/no-photo',
          totalPrice: 10000, targetParticipants: 2, category: 'FOOD',
        });
      expect(missingPhoto.status).toBe(400);
      expect(missingPhoto.body.error.code).toBe('VALIDATION_ERROR');

      const photoUrl = 'data:image/png;base64,photo-test-data';
      const withPhoto = await request(app)
        .post('/group-purchases')
        .set('Authorization', getAuthHeader(participants[0].id))
        .send({
          title: '사진 있는 공동구매', productUrl: 'https://example.com/with-photo', imageUrl: photoUrl,
          totalPrice: 10000, targetParticipants: 2, category: 'FOOD',
        });
      expect(withPhoto.status).toBe(201);
      expect(withPhoto.body.data.imageUrl).toBe(photoUrl);
    });

    test('사진은 1장 이상 5장 이하로 저장한다', async () => {
      const imageUrls = Array.from({ length: 5 }, (_, index) => `data:image/png;base64,photo-${index + 1}`);
      const valid = await request(app)
        .post('/group-purchases')
        .set('Authorization', getAuthHeader(participants[0].id))
        .send({ title: '사진 다섯 장', productUrl: 'https://example.com/five-images', imageUrls, totalPrice: 10000, targetParticipants: 2, category: 'FOOD' });
      expect(valid.status).toBe(201);
      expect(valid.body.data.imageUrls).toEqual(imageUrls);

      const tooMany = await request(app)
        .post('/group-purchases')
        .set('Authorization', getAuthHeader(participants[0].id))
        .send({ title: '사진 여섯 장', productUrl: 'https://example.com/six-images', imageUrls: [...imageUrls, 'data:image/png;base64,photo-6'], totalPrice: 10000, targetParticipants: 2, category: 'FOOD' });
      expect(tooMany.status).toBe(400);
      expect(tooMany.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('알림과 마감 자동 처리', () => {
    test('픽업 대기 전환 시 참여자 이메일 알림을 기록하고 메일 유틸을 호출한다', async () => {
      await Notification.destroy({ where: {} });
      sendMail.mockClear();
      const purchase = await GroupPurchase.create({
        hostId: hostUser.id, title: '알림 테스트', productUrl: 'https://example.com/notice',
        totalPrice: 10000, targetParticipants: 2, currentParticipants: 2, perPersonPrice: 5000,
        pickupLatitude: 37.5, pickupLongitude: 127, category: 'FOOD', status: 'ORDERED',
        deadlineAt: new Date(Date.now() + 86400000),
      });
      await UserGroupPurchase.create({ userId: participants[0].id, groupPurchaseId: purchase.id });

      const response = await request(app).patch(`/group-purchases/${purchase.id}/status`)
        .set('Authorization', getAuthHeader(hostUser.id)).send({ status: 'WAITING_PICKUP' });

      expect(response.status).toBe(200);
      expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: participants[0].email }));
      expect(await Notification.count({ where: { groupPurchaseId: purchase.id } })).toBe(1);
    });

    test('마감 시간이 지난 모집 중 공동구매를 FAILED로 바꾸고 참여 기록을 정리한다', async () => {
      await Notification.destroy({ where: {} });
      const purchase = await GroupPurchase.create({
        hostId: hostUser.id, title: '마감 자동 처리 테스트', productUrl: 'https://example.com/expired',
        totalPrice: 10000, targetParticipants: 3, currentParticipants: 1, perPersonPrice: 3333,
        pickupLatitude: 37.5, pickupLongitude: 127, category: 'FOOD', status: 'RECRUITING',
        deadlineAt: new Date(Date.now() - 1000),
      });
      await UserGroupPurchase.create({ userId: participants[0].id, groupPurchaseId: purchase.id, isApproved: true, isPaid: true });

      const ids = await processExpiredGroupPurchases(new Date());
      const updated = await GroupPurchase.findByPk(purchase.id);
      const application = await UserGroupPurchase.findOne({ where: { groupPurchaseId: purchase.id } });

      expect(ids).toContain(purchase.id);
      expect(updated.status).toBe('FAILED');
      expect(application.isApproved).toBe(false);
      expect(application.isPaid).toBe(false);
      expect(await Notification.count({ where: { groupPurchaseId: purchase.id } })).toBe(1);
    });
  });

  describe('공동구매 입금 완료 흐름', () => {
    test('참여자가 입금 완료를 표시하고, 전원 입금 전에는 주문 완료로 바꿀 수 없다', async () => {
      const paymentPurchase = await GroupPurchase.create({
        hostId: hostUser.id,
        title: '입금 확인 공동구매',
        productUrl: 'https://example.com/payment',
        totalPrice: 20000,
        targetParticipants: 2,
        currentParticipants: 2,
        perPersonPrice: 10000,
        pickupLatitude: 37.5,
        pickupLongitude: 127,
        pickupPlace: '아파트 정문',
        pickupTimeSlot: '토요일 오후 2시',
        paymentAccount: '카카오뱅크 3333-01-1234567',
        category: 'FOOD',
        status: 'COMPLETED',
        deadlineAt: new Date(Date.now() + 86400000),
      });
      await UserGroupPurchase.create({ userId: participants[0].id, groupPurchaseId: paymentPurchase.id });
      await UserGroupPurchase.create({ userId: participants[1].id, groupPurchaseId: paymentPurchase.id });

      const detail = await request(app)
        .get(`/group-purchases/${paymentPurchase.id}`)
        .set('Authorization', getAuthHeader(participants[0].id));
      expect(detail.status).toBe(200);
      expect(detail.body.data.paymentAccount).toBe('카카오뱅크 3333-01-1234567');

      const firstPayment = await request(app)
        .patch(`/group-purchases/${paymentPurchase.id}/payment`)
        .set('Authorization', getAuthHeader(participants[0].id));
      expect(firstPayment.status).toBe(200);
      expect(firstPayment.body.data.isPaid).toBe(true);

      const earlyOrder = await request(app)
        .patch(`/group-purchases/${paymentPurchase.id}/status`)
        .set('Authorization', getAuthHeader(hostUser.id))
        .send({ status: 'ORDERED' });
      expect(earlyOrder.status).toBe(409);
      expect(earlyOrder.body.error.code).toBe('PARTICIPANTS_NOT_PAYMENT_CONFIRMED');

      const secondPayment = await request(app)
        .patch(`/group-purchases/${paymentPurchase.id}/payment`)
        .set('Authorization', getAuthHeader(participants[1].id));
      expect(secondPayment.status).toBe(200);

      const paymentApplications = await UserGroupPurchase.findAll({ where: { groupPurchaseId: paymentPurchase.id } });
      await request(app).patch(`/group-purchases/${paymentPurchase.id}/payments/${paymentApplications[0].id}/confirm`)
        .set('Authorization', getAuthHeader(hostUser.id));
      await request(app).patch(`/group-purchases/${paymentPurchase.id}/payments/${paymentApplications[1].id}/confirm`)
        .set('Authorization', getAuthHeader(hostUser.id));

      const ordered = await request(app)
        .patch(`/group-purchases/${paymentPurchase.id}/status`)
        .set('Authorization', getAuthHeader(hostUser.id))
        .send({ status: 'ORDERED' });
      expect(ordered.status).toBe(200);
      expect(ordered.body.data.status).toBe('ORDERED');
    });

    test('참여자의 입금 신고는 방장이 확인한 뒤에만 주문 완료 조건에 포함된다', async () => {
      const purchase = await GroupPurchase.create({
        hostId: hostUser.id, title: '입금 이중 확인 공동구매', productUrl: 'https://example.com/confirm-payment',
        totalPrice: 20000, targetParticipants: 2, currentParticipants: 2, perPersonPrice: 10000,
        pickupLatitude: 37.5, pickupLongitude: 127, paymentAccount: '카카오뱅크 3333-02-1234567',
        category: 'FOOD', status: 'COMPLETED', deadlineAt: new Date(Date.now() + 86400000),
      });
      const application = await UserGroupPurchase.create({ userId: participants[0].id, groupPurchaseId: purchase.id });

      await request(app).patch(`/group-purchases/${purchase.id}/payment`)
        .set('Authorization', getAuthHeader(participants[0].id));

      const hostDetail = await request(app).get(`/group-purchases/${purchase.id}`)
        .set('Authorization', getAuthHeader(hostUser.id));
      expect(hostDetail.body.data.viewer.paymentSummary).toMatchObject({ reportedCount: 1, confirmedCount: 0 });
      expect(hostDetail.body.data.viewer.paymentParticipants[0]).toMatchObject({ id: application.id, isPaid: true, isPaymentConfirmed: false });

      const earlyOrder = await request(app).patch(`/group-purchases/${purchase.id}/status`)
        .set('Authorization', getAuthHeader(hostUser.id)).send({ status: 'ORDERED' });
      expect(earlyOrder.status).toBe(409);
      expect(earlyOrder.body.error.code).toBe('PARTICIPANTS_NOT_PAYMENT_CONFIRMED');

      const confirmation = await request(app).patch(`/group-purchases/${purchase.id}/payments/${application.id}/confirm`)
        .set('Authorization', getAuthHeader(hostUser.id));
      expect(confirmation.status).toBe(200);
      expect(confirmation.body.data.isPaymentConfirmed).toBe(true);
    });
  });

  describe('closed participation history', () => {
    test('a joined purchase remains in the participant history after it is closed', async () => {
      const closedPurchase = await GroupPurchase.create({
        hostId: hostUser.id,
        title: 'Closed participation history purchase',
        productUrl: 'https://example.com/closed-history',
        totalPrice: 10000,
        targetParticipants: 2,
        currentParticipants: 2,
        perPersonPrice: 5000,
        pickupLatitude: 37.5,
        pickupLongitude: 127,
        category: 'FOOD',
        status: 'FINISHED',
        deadlineAt: new Date(Date.now() - 86400000),
      });
      await UserGroupPurchase.create({ userId: participants[0].id, groupPurchaseId: closedPurchase.id, isReceived: true });

      const response = await request(app)
        .get('/group-purchases/mine')
        .set('Authorization', getAuthHeader(participants[0].id));

      expect(response.status).toBe(200);
      expect(response.body.data.joined.map((purchase) => purchase.id)).toContain(closedPurchase.id);
    });
  });

  describe('saved base location', () => {
    test('a user can save a base location and receive distance values in the public list', async () => {
      const locationPurchase = await GroupPurchase.create({
        hostId: hostUser.id,
        title: 'Distance list purchase',
        productUrl: 'https://example.com/distance-list',
        totalPrice: 10000,
        targetParticipants: 2,
        currentParticipants: 1,
        perPersonPrice: 5000,
        pickupLatitude: 37.5665,
        pickupLongitude: 126.978,
        category: 'FOOD',
        status: 'RECRUITING',
        deadlineAt: new Date(Date.now() + 86400000),
      });

      const updated = await request(app)
        .patch('/users/me/location')
        .set('Authorization', getAuthHeader(participants[0].id))
        .send({ latitude: 37.5665, longitude: 126.978, address: '서울특별시 중구 세종대로 110' });
      expect(updated.status).toBe(200);
      expect(updated.body.data).toMatchObject({ baseLatitude: 37.5665, baseLongitude: 126.978, baseAddress: '서울특별시 중구 세종대로 110' });

      const list = await request(app)
        .get('/group-purchases')
        .set('Authorization', getAuthHeader(participants[0].id));
      const item = list.body.data.find((purchase) => purchase.id === locationPurchase.id);
      expect(item.distanceKm).toBe(0);
    });
  });

  describe('favorite API', () => {
    test('a signed-in user can save, list, and remove a favorite purchase', async () => {
      const favoritePurchase = await GroupPurchase.create({
        hostId: hostUser.id,
        title: 'Favorite API purchase',
        productUrl: 'https://example.com/favorite-api',
        totalPrice: 10000,
        targetParticipants: 2,
        currentParticipants: 1,
        perPersonPrice: 5000,
        pickupLatitude: 37.5,
        pickupLongitude: 127,
        category: 'FOOD',
        status: 'RECRUITING',
        deadlineAt: new Date(Date.now() + 86400000),
      });

      const added = await request(app)
        .post(`/group-purchases/${favoritePurchase.id}/favorite`)
        .set('Authorization', getAuthHeader(participants[0].id));
      expect(added.status).toBe(201);
      expect(added.body.data).toMatchObject({ groupPurchaseId: favoritePurchase.id, isFavorite: true });

      const list = await request(app)
        .get('/group-purchases/favorites')
        .set('Authorization', getAuthHeader(participants[0].id));
      expect(list.status).toBe(200);
      expect(list.body.data.map((purchase) => purchase.id)).toContain(favoritePurchase.id);

      const removed = await request(app)
        .delete(`/group-purchases/${favoritePurchase.id}/favorite`)
        .set('Authorization', getAuthHeader(participants[0].id));
      expect(removed.status).toBe(200);
      expect(removed.body.data).toMatchObject({ groupPurchaseId: favoritePurchase.id, isFavorite: false });
    });
  });

  describe('notification deletion API', () => {
    test('an owner can delete a notification and another user cannot delete it', async () => {
      const purchase = await GroupPurchase.create({
        hostId: hostUser.id,
        title: 'Notification deletion purchase',
        productUrl: 'https://example.com/notification-delete',
        totalPrice: 10000,
        targetParticipants: 2,
        currentParticipants: 1,
        perPersonPrice: 5000,
        pickupLatitude: 37.5,
        pickupLongitude: 127,
        category: 'FOOD',
        status: 'RECRUITING',
        deadlineAt: new Date(Date.now() + 86400000),
      });
      const notification = await Notification.create({
        userId: participants[0].id,
        groupPurchaseId: purchase.id,
        title: 'Delete me',
        content: 'This notification should disappear.',
      });

      const forbidden = await request(app)
        .delete(`/notifications/${notification.id}`)
        .set('Authorization', getAuthHeader(participants[1].id));
      expect(forbidden.status).toBe(404);
      expect(await Notification.findByPk(notification.id)).not.toBeNull();

      const deleted = await request(app)
        .delete(`/notifications/${notification.id}`)
        .set('Authorization', getAuthHeader(participants[0].id));
      expect(deleted.status).toBe(200);
      expect(deleted.body.data).toMatchObject({ id: notification.id, deleted: true });
      expect(await Notification.findByPk(notification.id)).toBeNull();
    });
  });
});

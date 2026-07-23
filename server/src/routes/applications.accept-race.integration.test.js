import { createRequire } from 'module';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// app.js는 CommonJS다. 네이티브 require를 명시적으로 사용해 db/supabase.js와 app.js를
// 같은 require 캐시로 로드해서, __setTestClients로 주입한 mock이 실제로 적용되게 한다.
// (자세한 이유는 auth.routes.integration.test.js 상단 주석 참고)
const require = createRequire(import.meta.url);
const { __setTestClients } = require('../db/supabase');

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
  rpc: vi.fn(),
};
__setTestClients({
  supabase: mockSupabase,
  supabaseAnon: {},
});

const app = require('../app');

// 주의: server/src/services/applications.service.js의 acceptApplication은 상태를 먼저
// 조회(fetchApplicationRow)한 뒤 별도로 update하는 "check-then-act" 방식이고, update 쿼리
// 자체에는 status='pending' 같은 재확인 조건이 없다. 이 테스트는 그 사실을 있는 그대로
// 드러내기 위한 것으로, "막혀야 한다"는 가정 없이 현재 동작을 관찰한다.
describe('PATCH /api/applications/:applicationId/accept - 동시 수락 경쟁 (integration)', () => {
  let applicationRow;
  let linksState;
  let insertedMeetingApplicationIds;
  let pendingApplicationReads;

  beforeEach(() => {
    vi.clearAllMocks();
    applicationRow = { id: 'application-1', status: 'pending', mentee_id: 'mentee-1', accepted_mentor_id: null };
    linksState = { 'mentor-a': 'pending', 'mentor-b': 'pending' };
    insertedMeetingApplicationIds = new Set();
    pendingApplicationReads = [];

    // 토큰 문자열(mentor-a-token / mentor-b-token)로 요청자를 구분한다 — 두 요청이 실제로
    // 동시에 in-flight 상태이므로, 마지막에 설정한 값 하나만 돌려주는 mockResolvedValue로는
    // 두 사용자를 구분할 수 없어 인자 기반 mockImplementation을 사용한다.
    mockSupabase.auth.getUser.mockImplementation((token) => {
      const mentorId = token.replace('-token', '');
      return Promise.resolve({ data: { user: { id: mentorId, email: `${mentorId}@example.com` } }, error: null });
    });

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'profiles') {
        const query = {};
        let queriedId = null;
        query.select = vi.fn(() => query);
        query.eq = vi.fn((col, val) => {
          if (col === 'id') queriedId = val;
          return query;
        });
        query.single = vi
          .fn()
          .mockImplementation(() =>
            Promise.resolve({
              data: { id: queriedId, role: 'mentor', name: '멘토', nickname: '멘토' },
              error: null,
            }),
          );
        return query;
      }

      if (table === 'applications') {
        const query = {};
        let isUpdate = false;
        let updatePayload = null;
        query.select = vi.fn(() => query);
        query.eq = vi.fn(() => query);
        query.single = vi.fn(() => query);
        query.update = vi.fn((payload) => {
          isUpdate = true;
          updatePayload = payload;
          return query;
        });
        query.then = (resolve, reject) => {
          if (isUpdate) {
            applicationRow = { ...applicationRow, ...updatePayload };
            return Promise.resolve({ data: { ...applicationRow }, error: null }).then(resolve, reject);
          }
          // 두 요청의 읽기가 모두 도착할 때까지 응답을 보류했다가 동시에 흘려보내서,
          // "둘 다 pending 상태를 읽은 뒤 각자 쓰기를 시도"하는 최악의 경쟁 상황을 재현한다.
          return new Promise((res) => {
            pendingApplicationReads.push(() => res({ data: { ...applicationRow }, error: null }));
            if (pendingApplicationReads.length === 2) {
              const flushes = pendingApplicationReads;
              pendingApplicationReads = [];
              flushes.forEach((flush) => flush());
            }
          }).then(resolve, reject);
        };
        return query;
      }

      if (table === 'application_mentors') {
        const query = {};
        const calls = { eq: [], neq: [] };
        let updatePayload = null;
        query.select = vi.fn(() => query);
        query.eq = vi.fn((col, val) => {
          calls.eq.push([col, val]);
          return query;
        });
        query.neq = vi.fn((col, val) => {
          calls.neq.push([col, val]);
          return query;
        });
        query.update = vi.fn((payload) => {
          updatePayload = payload;
          return query;
        });
        query.single = vi.fn(() => query);
        query.then = (resolve, reject) => {
          const mentorIdEq = calls.eq.find(([col]) => col === 'mentor_id')?.[1];
          let result;

          if (updatePayload?.status === 'confirmed') {
            linksState[mentorIdEq] = 'confirmed';
            result = { data: { mentor_id: mentorIdEq, status: 'confirmed' }, error: null };
          } else if (updatePayload?.status === 'rejected') {
            const excludedMentorId = calls.neq.find(([col]) => col === 'mentor_id')?.[1];
            Object.keys(linksState).forEach((id) => {
              if (id !== excludedMentorId && linksState[id] === 'pending') linksState[id] = 'rejected';
            });
            result = { error: null };
          } else {
            // fetchMentorLink
            result = {
              data: { application_id: 'application-1', mentor_id: mentorIdEq, status: linksState[mentorIdEq] },
              error: null,
            };
          }

          return Promise.resolve(result).then(resolve, reject);
        };
        return query;
      }

      if (table === 'meetings') {
        // 실제 DB의 meetings.application_id UNIQUE 제약을 흉내낸다 — accept 로직 자체에는
        // 없는, 유일하게 우연히 존재하는 안전장치다.
        const query = {};
        query.insert = vi.fn((payload) => {
          if (insertedMeetingApplicationIds.has(payload.application_id)) {
            return Promise.resolve({
              error: {
                message: 'duplicate key value violates unique constraint "meetings_application_id_key"',
                code: '23505',
              },
            });
          }
          insertedMeetingApplicationIds.add(payload.application_id);
          return Promise.resolve({ error: null });
        });
        return query;
      }

      throw new Error(`예상치 못한 테이블 조회: ${table}`);
    });
  });

  const performAccept = (mentorId) =>
    request(app)
      .patch('/api/applications/application-1/accept')
      .set('Authorization', `Bearer ${mentorId}-token`);

  it(
    '두 멘토가 같은 신청을 동시에 수락하면 한쪽은 200을 받고 다른 한쪽은 409(정상적인 충돌 거부)가 ' +
      '아니라 500(meetings 유니크 제약 위반)을 받는다 — 애플리케이션 레벨에는 재확인 로직이 없다는 뜻이다',
    async () => {
      const [resA, resB] = await Promise.all([performAccept('mentor-a'), performAccept('mentor-b')]);

      // 둘 다 읽을 때는 모두 status: 'pending'이었으므로, 둘 다 409로 깔끔하게 막히는 일은
      // 일어나지 않는다 — 이것부터가 보호 장치 부재의 증거다.
      const statuses = [resA.status, resB.status].sort((a, b) => a - b);
      expect(statuses).toEqual([200, 500]);

      const successRes = resA.status === 200 ? resA : resB;
      const failedRes = resA.status === 200 ? resB : resA;

      expect(successRes.body.data.status).toBe('confirmed');
      // 실패한 쪽도 상태 검증 단계는 통과했기 때문에(둘 다 읽을 때 pending이었으므로),
      // 여기서 나는 에러는 ConflictError(409)가 아니라 예상치 못한 500이다.
      expect(failedRes.body.error.code).toBe('INTERNAL_SERVER_ERROR');

      // meetings insert는 우연히 존재하는 DB 유니크 제약 덕분에 정확히 1건만 성공한다.
      expect(insertedMeetingApplicationIds.size).toBe(1);

      // applications 테이블은 재확인 없이 마지막으로 완료된 update가 그대로 반영된다
      // (last write wins) — 어느 쪽이 "이겼는지"는 실행마다 달라질 수 있다.
      expect(applicationRow.status).toBe('confirmed');
    },
  );
});

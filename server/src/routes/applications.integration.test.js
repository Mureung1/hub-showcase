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

// supabase.from('profiles').select(...).eq(...).single() 체인을 흉내내는 헬퍼.
const buildProfilesQuery = (result) => {
  const query = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.single = vi.fn().mockResolvedValue(result);
  return query;
};

// supabase.from('mentor_profiles').select(...).in(...) 체인을 흉내내는 헬퍼.
const buildMentorProfilesQuery = (result) => {
  const query = {};
  query.select = vi.fn(() => query);
  query.in = vi.fn().mockResolvedValue(result);
  return query;
};

// 실제 supabase-js 쿼리 빌더처럼, 어떤 메서드를 몇 번 체이닝하든(끝에 .single()이 있든 없든)
// await 시점에 정해진 result로 resolve되는 범용 thenable 빌더. accept/reject처럼 같은 테이블에
// select/update/insert가 서로 다른 체인 모양으로 여러 번 걸리는 흐름을 mock하기 위해 사용한다.
const buildThenableQuery = (result) => {
  const query = { then: (resolve, reject) => Promise.resolve(result).then(resolve, reject) };
  ['select', 'update', 'insert', 'eq', 'neq', 'in', 'order', 'single'].forEach((method) => {
    query[method] = vi.fn(() => query);
  });
  return query;
};

const MENTEE_TOKEN = 'Bearer mentee-token';
const MENTOR_TOKEN = 'Bearer mentor-token';

const mockAuthenticatedMentee = () => {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'mentee-1', email: 'mentee@example.com' } },
    error: null,
  });
};

const mockProfilesTable = () =>
  buildProfilesQuery({
    data: { id: 'mentee-1', role: 'mentee', name: '홍길동', nickname: '길동' },
    error: null,
  });

const mockAuthenticatedMentor = () => {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'mentor-1', email: 'mentor@example.com' } },
    error: null,
  });
};

const mockProfilesTableForMentor = () =>
  buildProfilesQuery({
    data: { id: 'mentor-1', role: 'mentor', name: '김민준', nickname: '민준' },
    error: null,
  });

const validQuestionnaire = {
  introduction: '자기소개입니다',
  concern: '고민입니다',
  goal: '목표입니다',
  preferredTime: '평일 저녁',
};

describe('POST /api/applications - 멘토 선택 1~3명 제한 (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticatedMentee();
    // 기본값: profiles(인증용)만 응답하도록 설정. mentor_profiles가 예기치 않게
    // 조회되면(길이 검증에서 이미 걸러졌어야 함) 에러를 던져 테스트가 실패하게 한다.
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'profiles') return mockProfilesTable();
      throw new Error(`예상치 못한 테이블 조회: ${table}`);
    });
  });

  it('mentorIds가 빈 배열이면 400 VALIDATION_ERROR를 반환하고 mentor_profiles/RPC는 호출하지 않는다', async () => {
    const res = await request(app)
      .post('/api/applications')
      .set('Authorization', MENTEE_TOKEN)
      .send({ mentorIds: [], questionnaire: validQuestionnaire });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.field).toBe('mentorIds');
    expect(res.body.error.message).toBe('멘토는 1명 이상 3명 이하로 선택해야 합니다.');
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
  });

  it('mentorIds가 4개 이상이면 400 VALIDATION_ERROR를 반환하고 mentor_profiles/RPC는 호출하지 않는다', async () => {
    const res = await request(app)
      .post('/api/applications')
      .set('Authorization', MENTEE_TOKEN)
      .send({
        mentorIds: ['mentor-1', 'mentor-2', 'mentor-3', 'mentor-4'],
        questionnaire: validQuestionnaire,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.field).toBe('mentorIds');
    expect(res.body.error.message).toBe('멘토는 1명 이상 3명 이하로 선택해야 합니다.');
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
  });

  it('mentorIds에 같은 멘토 id가 중복되면 400 VALIDATION_ERROR를 반환하고 mentor_profiles/RPC는 호출하지 않는다', async () => {
    const res = await request(app)
      .post('/api/applications')
      .set('Authorization', MENTEE_TOKEN)
      .send({ mentorIds: ['mentor-1', 'mentor-1'], questionnaire: validQuestionnaire });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.field).toBe('mentorIds');
    expect(res.body.error.message).toBe('mentorIds에는 중복된 멘토 ID를 넣을 수 없습니다.');
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
  });

  it('mentorIds가 1~3개이고 모두 존재하는 멘토면 201과 함께 생성된 신청을 반환한다', async () => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'profiles') return mockProfilesTable();
      if (table === 'mentor_profiles') {
        return buildMentorProfilesQuery({
          data: [{ user_id: 'mentor-1' }, { user_id: 'mentor-2' }],
          error: null,
        });
      }
      throw new Error(`예상치 못한 테이블 조회: ${table}`);
    });
    mockSupabase.rpc.mockResolvedValue({
      data: {
        id: 'application-1',
        status: 'pending',
        introduction: validQuestionnaire.introduction,
        concern: validQuestionnaire.concern,
        goal: validQuestionnaire.goal,
        preferred_time: validQuestionnaire.preferredTime,
        created_at: '2026-07-23T00:00:00.000Z',
      },
      error: null,
    });

    const res = await request(app)
      .post('/api/applications')
      .set('Authorization', MENTEE_TOKEN)
      .send({ mentorIds: ['mentor-1', 'mentor-2'], questionnaire: validQuestionnaire });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      data: {
        id: 'application-1',
        status: 'pending',
        mentorIds: ['mentor-1', 'mentor-2'],
        questionnaire: validQuestionnaire,
        createdAt: '2026-07-23T00:00:00.000Z',
      },
    });
    expect(mockSupabase.rpc).toHaveBeenCalledWith('create_application_with_mentors', {
      p_mentee_id: 'mentee-1',
      p_introduction: validQuestionnaire.introduction,
      p_concern: validQuestionnaire.concern,
      p_goal: validQuestionnaire.goal,
      p_preferred_time: validQuestionnaire.preferredTime,
      p_mentor_ids: ['mentor-1', 'mentor-2'],
    });
  });
});

describe('POST /api/applications - 질문지 필수값 (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticatedMentee();
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'profiles') return mockProfilesTable();
      if (table === 'mentor_profiles') {
        return buildMentorProfilesQuery({ data: [{ user_id: 'mentor-1' }], error: null });
      }
      throw new Error(`예상치 못한 테이블 조회: ${table}`);
    });
  });

  it.each([['introduction'], ['concern'], ['goal'], ['preferredTime']])(
    'questionnaire.%s가 비어있으면 400 VALIDATION_ERROR를 반환하고 RPC는 호출하지 않는다',
    async (field) => {
      const questionnaire = { ...validQuestionnaire, [field]: '' };

      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', MENTEE_TOKEN)
        .send({ mentorIds: ['mentor-1'], questionnaire });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.field).toBe(`questionnaire.${field}`);
      expect(mockSupabase.rpc).not.toHaveBeenCalled();
    },
  );
});

describe('PATCH /api/applications/:applicationId/accept (integration)', () => {
  let applicationsQueries;
  let applicationMentorsQueries;
  let meetingsQuery;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticatedMentor();
    applicationsQueries = [];
    applicationMentorsQueries = [];
    meetingsQuery = null;
  });

  // applicationStatus/mentorLinkStatus로 fetchApplicationRow/fetchMentorLink가 읽어오는
  // 초기 상태를 바꿀 수 있게 해서, pending 정상 흐름과 conflict(409) 흐름을 모두 재현한다.
  const setupAcceptMocks = ({
    applicationStatus = 'pending',
    mentorLinkStatus = 'pending',
    applicationExists = true,
  } = {}) => {
    let applicationsCallCount = 0;
    let applicationMentorsCallCount = 0;

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'profiles') return mockProfilesTableForMentor();

      if (table === 'applications') {
        applicationsCallCount += 1;
        const query = buildThenableQuery(
          applicationsCallCount === 1
            ? applicationExists
              ? { data: { id: 'application-1', status: applicationStatus, mentee_id: 'mentee-1' }, error: null }
              : { data: null, error: { message: 'no rows found' } }
            : {
                data: {
                  id: 'application-1',
                  status: 'confirmed',
                  accepted_mentor_id: 'mentor-1',
                  updated_at: '2026-07-23T00:00:00.000Z',
                },
                error: null,
              },
        );
        applicationsQueries.push(query);
        return query;
      }

      if (table === 'application_mentors') {
        applicationMentorsCallCount += 1;
        const result =
          applicationMentorsCallCount === 1
            ? {
                data: { application_id: 'application-1', mentor_id: 'mentor-1', status: mentorLinkStatus },
                error: null,
              }
            : { error: null };
        const query = buildThenableQuery(result);
        applicationMentorsQueries.push(query);
        return query;
      }

      if (table === 'meetings') {
        meetingsQuery = buildThenableQuery({ error: null });
        return meetingsQuery;
      }

      throw new Error(`예상치 못한 테이블 조회: ${table}`);
    });
  };

  it('pending 상태의 신청을 멘토가 수락하면 confirmed로 바뀌고, 다른 멘토는 자동 거절되며, meetings가 생성된다', async () => {
    setupAcceptMocks();

    const res = await request(app)
      .patch('/api/applications/application-1/accept')
      .set('Authorization', MENTOR_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: {
        id: 'application-1',
        status: 'confirmed',
        acceptedMentorId: 'mentor-1',
        updatedAt: '2026-07-23T00:00:00.000Z',
      },
    });

    // applications를 confirmed + accepted_mentor_id로 업데이트했는지 (두 번째 from('applications') 호출)
    expect(applicationsQueries[1].update).toHaveBeenCalledWith({
      status: 'confirmed',
      accepted_mentor_id: 'mentor-1',
    });

    // 이 멘토 자신의 application_mentors 링크를 confirmed로 업데이트했는지 (두 번째 호출)
    expect(applicationMentorsQueries[1].update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'confirmed' }),
    );
    expect(applicationMentorsQueries[1].eq).toHaveBeenCalledWith('mentor_id', 'mentor-1');

    // 다른 pending 멘토들을 rejected로 자동 처리했는지 (세 번째 호출)
    expect(applicationMentorsQueries[2].update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'rejected' }),
    );
    expect(applicationMentorsQueries[2].neq).toHaveBeenCalledWith('mentor_id', 'mentor-1');
    expect(applicationMentorsQueries[2].eq).toHaveBeenCalledWith('status', 'pending');

    // meetings row가 생성되었는지
    expect(meetingsQuery.insert).toHaveBeenCalledWith({
      application_id: 'application-1',
      mentor_id: 'mentor-1',
    });
  });

  it('이미 confirmed된 신청을 다시 수락하려 하면 409 APPLICATION_ALREADY_CONFIRMED를 반환한다', async () => {
    setupAcceptMocks({ applicationStatus: 'confirmed' });

    const res = await request(app)
      .patch('/api/applications/application-1/accept')
      .set('Authorization', MENTOR_TOKEN);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('APPLICATION_ALREADY_CONFIRMED');
    expect(applicationsQueries[1]).toBeUndefined(); // update까지 가지 않고 conflict에서 멈춰야 한다
  });

  it('이미 처리(수락/거절)한 멘토 링크로 다시 수락하려 하면 409 APPLICATION_ALREADY_PROCESSED를 반환한다', async () => {
    setupAcceptMocks({ mentorLinkStatus: 'rejected' });

    const res = await request(app)
      .patch('/api/applications/application-1/accept')
      .set('Authorization', MENTOR_TOKEN);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('APPLICATION_ALREADY_PROCESSED');
  });

  it('존재하지 않는 신청 id를 수락하려 하면 404 APPLICATION_NOT_FOUND를 반환한다', async () => {
    setupAcceptMocks({ applicationExists: false });

    const res = await request(app)
      .patch('/api/applications/non-existent-application/accept')
      .set('Authorization', MENTOR_TOKEN);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('APPLICATION_NOT_FOUND');
    expect(res.body.error.message).toBe('면담 신청을 찾을 수 없습니다.');
  });
});

describe('PATCH /api/applications/:applicationId/complete (integration)', () => {
  let applicationsQueries;
  let applicationMentorsQuery;
  let meetingsQuery;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticatedMentor();
    applicationsQueries = [];
    applicationMentorsQuery = null;
    meetingsQuery = null;
  });

  // completeApplication은 accept/reject와 달리 application_mentors에서 권한용 링크를 먼저
  // 조회하지 않고, applications row의 accepted_mentor_id를 직접 요청 멘토와 비교한다.
  // 따라서 'applications' 테이블만 두 번(조회 → 업데이트) 걸리고, application_mentors/meetings는
  // 통과 후 업데이트 한 번씩만 걸린다.
  const setupCompleteMocks = ({
    applicationStatus = 'confirmed',
    acceptedMentorId = 'mentor-1',
    applicationExists = true,
  } = {}) => {
    let applicationsCallCount = 0;

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'profiles') return mockProfilesTableForMentor();

      if (table === 'applications') {
        applicationsCallCount += 1;
        const query = buildThenableQuery(
          applicationsCallCount === 1
            ? applicationExists
              ? {
                  data: {
                    id: 'application-1',
                    status: applicationStatus,
                    accepted_mentor_id: acceptedMentorId,
                    mentee_id: 'mentee-1',
                  },
                  error: null,
                }
              : { data: null, error: { message: 'no rows found' } }
            : {
                data: {
                  id: 'application-1',
                  status: 'completed',
                  accepted_mentor_id: acceptedMentorId,
                  updated_at: '2026-07-23T00:00:00.000Z',
                },
                error: null,
              },
        );
        applicationsQueries.push(query);
        return query;
      }

      if (table === 'application_mentors') {
        applicationMentorsQuery = buildThenableQuery({ error: null });
        return applicationMentorsQuery;
      }

      if (table === 'meetings') {
        meetingsQuery = buildThenableQuery({ error: null });
        return meetingsQuery;
      }

      throw new Error(`예상치 못한 테이블 조회: ${table}`);
    });
  };

  it('confirmed 상태이고 요청 멘토가 accepted_mentor_id와 일치하면 200과 함께 completed 결과를 반환하고, applications/application_mentors/meetings를 각각 올바르게 업데이트한다', async () => {
    setupCompleteMocks();

    const res = await request(app)
      .patch('/api/applications/application-1/complete')
      .set('Authorization', MENTOR_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: {
        id: 'application-1',
        status: 'completed',
        acceptedMentorId: 'mentor-1',
        updatedAt: '2026-07-23T00:00:00.000Z',
      },
    });

    // applications를 completed로 업데이트했는지 (두 번째 from('applications') 호출)
    expect(applicationsQueries[1].update).toHaveBeenCalledWith({ status: 'completed' });

    // 이 멘토의 application_mentors 링크를 completed로 업데이트하고 mentor_id로 필터했는지
    expect(applicationMentorsQuery.update).toHaveBeenCalledWith({ status: 'completed' });
    expect(applicationMentorsQuery.eq).toHaveBeenCalledWith('mentor_id', 'mentor-1');

    // meetings를 completed_at(ISO 문자열)으로 업데이트하고 application_id로 필터했는지
    expect(meetingsQuery.update).toHaveBeenCalledWith({
      completed_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
    });
    expect(meetingsQuery.eq).toHaveBeenCalledWith('application_id', 'application-1');
  });

  it('존재하지 않는 신청 id를 완료 처리하려 하면 404 APPLICATION_NOT_FOUND를 반환한다', async () => {
    setupCompleteMocks({ applicationExists: false });

    const res = await request(app)
      .patch('/api/applications/non-existent-application/complete')
      .set('Authorization', MENTOR_TOKEN);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('APPLICATION_NOT_FOUND');
  });

  it('confirmed가 아닌(pending) 신청을 완료 처리하려 하면 409 APPLICATION_NOT_CONFIRMED를 반환하고 업데이트는 호출되지 않는다', async () => {
    setupCompleteMocks({ applicationStatus: 'pending' });

    const res = await request(app)
      .patch('/api/applications/application-1/complete')
      .set('Authorization', MENTOR_TOKEN);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('APPLICATION_NOT_CONFIRMED');
    expect(applicationsQueries[1]).toBeUndefined();
    expect(applicationMentorsQuery).toBeNull();
    expect(meetingsQuery).toBeNull();
  });

  it('이미 completed 상태인 신청을 다시 완료 처리하려 하면 409 APPLICATION_ALREADY_COMPLETED를 반환한다', async () => {
    setupCompleteMocks({ applicationStatus: 'completed' });

    const res = await request(app)
      .patch('/api/applications/application-1/complete')
      .set('Authorization', MENTOR_TOKEN);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('APPLICATION_ALREADY_COMPLETED');
    expect(applicationsQueries[1]).toBeUndefined();
    expect(applicationMentorsQuery).toBeNull();
    expect(meetingsQuery).toBeNull();
  });

  it('confirmed 상태이지만 요청 멘토가 accepted_mentor_id와 다르면 403 FORBIDDEN을 반환한다', async () => {
    setupCompleteMocks({ acceptedMentorId: 'other-mentor' });

    const res = await request(app)
      .patch('/api/applications/application-1/complete')
      .set('Authorization', MENTOR_TOKEN);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toBe('이 면담 신청을 완료 처리할 권한이 없습니다.');
    expect(applicationsQueries[1]).toBeUndefined();
  });

  it('멘티 role 토큰으로 호출하면 403 FORBIDDEN을 반환하고 서비스 계층(applications 조회)까지 도달하지 않는다', async () => {
    mockAuthenticatedMentee();
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'profiles') return mockProfilesTable();
      throw new Error(`예상치 못한 테이블 조회: ${table}`);
    });

    const res = await request(app)
      .patch('/api/applications/application-1/complete')
      .set('Authorization', MENTEE_TOKEN);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toBe('멘토만 면담을 완료 처리할 수 있습니다.');
  });

  describe('GET /api/applications - completed 상태 표시 (회귀 확인)', () => {
    it('멘티로 조회하면 completed 신청의 최상위 status가 completed로 내려온다', async () => {
      mockAuthenticatedMentee();
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });
      const applicationsQuery = buildThenableQuery({
        data: [
          {
            id: 'application-1',
            status: 'completed',
            accepted_mentor_id: 'mentor-1',
            application_mentors: [
              {
                mentor_id: 'mentor-1',
                status: 'completed',
                mentor_profiles: {
                  school: '서울대학교',
                  major: '컴퓨터공학',
                  academic_status: '박사과정',
                  profiles: { name: '김민준' },
                },
              },
            ],
            meetings: [],
            introduction: '자기소개',
            concern: '고민',
            goal: '목표',
            preferred_time: '평일 저녁',
            created_at: '2026-07-20T00:00:00.000Z',
            updated_at: '2026-07-23T00:00:00.000Z',
          },
        ],
        error: null,
      });
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'profiles') return mockProfilesTable();
        if (table === 'applications') return applicationsQuery;
        throw new Error(`예상치 못한 테이블 조회: ${table}`);
      });

      const res = await request(app).get('/api/applications').set('Authorization', MENTEE_TOKEN);

      expect(res.status).toBe(200);
      expect(res.body.data[0].status).toBe('completed');
      expect(res.body.data[0]).not.toHaveProperty('applicationStatus');
      expect(res.body.data[0]).not.toHaveProperty('mentorStatus');
    });

    it('멘토로 조회하면 completed 신청이 applicationStatus/mentorStatus 둘 다 completed로 내려온다', async () => {
      mockAuthenticatedMentor();
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });
      const applicationMentorsQuery = buildThenableQuery({
        data: [
          {
            mentor_id: 'mentor-1',
            status: 'completed',
            applications: {
              id: 'application-1',
              mentee_id: 'mentee-1',
              status: 'completed',
              accepted_mentor_id: 'mentor-1',
              introduction: '자기소개',
              concern: '고민',
              goal: '목표',
              preferred_time: '평일 저녁',
              created_at: '2026-07-20T00:00:00.000Z',
              updated_at: '2026-07-23T00:00:00.000Z',
              mentee_profiles: {
                school: '서울대학교',
                major: '컴퓨터공학',
                grade: '2',
                enrollment_status: 'enrolled',
                profiles: { name: '홍길동' },
              },
              meetings: [],
            },
          },
        ],
        error: null,
      });
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'profiles') return mockProfilesTableForMentor();
        if (table === 'application_mentors') return applicationMentorsQuery;
        throw new Error(`예상치 못한 테이블 조회: ${table}`);
      });

      const res = await request(app).get('/api/applications').set('Authorization', MENTOR_TOKEN);

      expect(res.status).toBe(200);
      expect(res.body.data[0].applicationStatus).toBe('completed');
      expect(res.body.data[0].mentorStatus).toBe('completed');
      expect(res.body.data[0]).not.toHaveProperty('status');
    });
  });
});

describe('PATCH /api/applications/:applicationId/reject - 전원 거절 (integration)', () => {
  // application_mentors 3개 row(mentor-a/b/c)와 applications 1개 row를 흉내내는
  // 공유 mutable 상태. 실제 reject 흐름처럼 "이 멘토의 링크를 rejected로 업데이트 → 전체
  // 링크를 다시 조회해 모두 rejected인지 판단 → 그렇다면 applications도 rejected로 업데이트"
  // 순서를 그대로 반영해야 하므로, 단순 고정값 mock 대신 상태를 직접 갱신한다.
  let linksState;
  let applicationStatus;
  let currentMentorId;
  let applicationMentorsCallCount;

  const makeApplicationsQuery = () => {
    const query = {
      then: (resolve, reject) =>
        Promise.resolve({
          data: { id: 'application-1', status: applicationStatus, mentee_id: 'mentee-1' },
          error: null,
        }).then(resolve, reject),
    };
    query.select = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.single = vi.fn(() => query);
    query.update = vi.fn((payload) => {
      applicationStatus = payload.status;
      return query;
    });
    return query;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    linksState = [
      { mentor_id: 'mentor-a', status: 'pending' },
      { mentor_id: 'mentor-b', status: 'pending' },
      { mentor_id: 'mentor-c', status: 'pending' },
    ];
    applicationStatus = 'pending';
    currentMentorId = null;
    applicationMentorsCallCount = 0;

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'profiles') {
        return buildThenableQuery({
          data: { id: currentMentorId, role: 'mentor', name: '멘토', nickname: '멘토' },
          error: null,
        });
      }

      if (table === 'applications') return makeApplicationsQuery();

      if (table === 'application_mentors') {
        applicationMentorsCallCount += 1;
        const link = linksState.find((l) => l.mentor_id === currentMentorId);

        if (applicationMentorsCallCount === 1) {
          // fetchMentorLink
          return buildThenableQuery({ data: { ...link, application_id: 'application-1' }, error: null });
        }
        if (applicationMentorsCallCount === 2) {
          // 이 멘토의 링크를 rejected로 업데이트
          link.status = 'rejected';
          link.responded_at = '2026-07-23T00:00:00.000Z';
          return buildThenableQuery({ data: { ...link, application_id: 'application-1' }, error: null });
        }
        // 전체 링크 상태 재조회 (모두 rejected인지 판단하는 데 쓰임)
        return buildThenableQuery({ data: linksState.map((l) => ({ status: l.status })), error: null });
      }

      throw new Error(`예상치 못한 테이블 조회: ${table}`);
    });
  });

  const performReject = (mentorId) => {
    currentMentorId = mentorId;
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mentorId, email: `${mentorId}@example.com` } },
      error: null,
    });
    applicationMentorsCallCount = 0; // 요청마다 application_mentors 호출 순서를 처음부터 다시 센다

    return request(app)
      .patch('/api/applications/application-1/reject')
      .set('Authorization', `Bearer ${mentorId}-token`);
  };

  it('멘토 A만 거절하면 아직 다른 멘토가 pending 상태이므로 전체 신청 상태는 유지된다', async () => {
    const res = await performReject('mentor-a');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: {
        id: 'application-1',
        applicationStatus: 'pending',
        mentorStatus: 'rejected',
        respondedAt: '2026-07-23T00:00:00.000Z',
      },
    });
  });

  it('멘토 A, B, C가 순차적으로 모두 거절하면 마지막 거절 시점에 전체 신청 상태가 rejected로 바뀐다', async () => {
    const resA = await performReject('mentor-a');
    expect(resA.status).toBe(200);
    expect(resA.body.data.applicationStatus).toBe('pending');

    const resB = await performReject('mentor-b');
    expect(resB.status).toBe(200);
    expect(resB.body.data.applicationStatus).toBe('pending');

    const resC = await performReject('mentor-c');
    expect(resC.status).toBe(200);
    expect(resC.body).toEqual({
      data: {
        id: 'application-1',
        applicationStatus: 'rejected',
        mentorStatus: 'rejected',
        respondedAt: '2026-07-23T00:00:00.000Z',
      },
    });
  });
});

describe('GET /api/applications - 멘티/멘토별 조회 범위 (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('신청이 하나도 없으면 빈 배열과 total 0을 반환한다', async () => {
    mockAuthenticatedMentee();
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'profiles') return mockProfilesTable();
      if (table === 'applications') return buildThenableQuery({ data: [], error: null });
      throw new Error(`예상치 못한 테이블 조회: ${table}`);
    });

    const res = await request(app).get('/api/applications').set('Authorization', MENTEE_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [], meta: { total: 0 } });
    // 빈 목록이면 안 읽은 메시지 수를 계산할 필요가 없으므로 RPC를 호출하지 않는다.
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
  });

  it('멘티로 조회하면 자신의 mentee_id로 필터링된 신청만 요청하고, unreadMessageCount를 RPC 결과로 채운다', async () => {
    mockAuthenticatedMentee();
    mockSupabase.rpc.mockResolvedValue({
      data: [{ application_id: 'application-1', unread_count: 2 }],
      error: null,
    });
    const applicationsQuery = buildThenableQuery({
      data: [
        {
          id: 'application-1',
          status: 'pending',
          accepted_mentor_id: null,
          application_mentors: [
            {
              mentor_id: 'mentor-1',
              status: 'pending',
              mentor_profiles: {
                school: '서울대학교',
                major: '컴퓨터공학',
                academic_status: '박사과정',
                profiles: { name: '김민준' },
              },
            },
          ],
          meetings: [],
          introduction: '자기소개',
          concern: '고민',
          goal: '목표',
          preferred_time: '평일 저녁',
          created_at: '2026-07-20T00:00:00.000Z',
          updated_at: '2026-07-20T00:00:00.000Z',
        },
      ],
      error: null,
    });
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'profiles') return mockProfilesTable();
      if (table === 'applications') return applicationsQuery;
      throw new Error(`예상치 못한 테이블 조회: ${table}`);
    });

    const res = await request(app).get('/api/applications').set('Authorization', MENTEE_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ total: 1 });
    expect(res.body.data).toEqual([
      {
        id: 'application-1',
        status: 'pending',
        acceptedMentorId: null,
        mentors: [
          { id: 'mentor-1', name: '김민준', school: '서울대학교', major: '컴퓨터공학', academicStatus: '박사과정' },
        ],
        questionnaire: { introduction: '자기소개', concern: '고민', goal: '목표', preferredTime: '평일 저녁' },
        meeting: undefined,
        unreadMessageCount: 2,
        createdAt: '2026-07-20T00:00:00.000Z',
        updatedAt: '2026-07-20T00:00:00.000Z',
      },
    ]);
    // req.user.id(토큰 소유자 본인)로만 필터링했는지 — 요청 파라미터가 아니라 인증 정보 기준.
    expect(applicationsQuery.eq).toHaveBeenCalledWith('mentee_id', 'mentee-1');
    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_unread_message_counts', {
      p_user_id: 'mentee-1',
    });
  });

  it('멘토로 조회하면 자신의 mentor_id로 필터링된 신청만 요청하고, unreadMessageCount를 RPC 결과로 채운다', async () => {
    mockAuthenticatedMentor();
    mockSupabase.rpc.mockResolvedValue({
      data: [{ application_id: 'application-1', unread_count: 3 }],
      error: null,
    });
    const applicationMentorsQuery = buildThenableQuery({
      data: [
        {
          mentor_id: 'mentor-1',
          status: 'pending',
          applications: {
            id: 'application-1',
            mentee_id: 'mentee-1',
            status: 'pending',
            accepted_mentor_id: null,
            introduction: '자기소개',
            concern: '고민',
            goal: '목표',
            preferred_time: '평일 저녁',
            created_at: '2026-07-20T00:00:00.000Z',
            updated_at: '2026-07-20T00:00:00.000Z',
            mentee_profiles: {
              school: '서울대학교',
              major: '컴퓨터공학',
              grade: '2',
              enrollment_status: 'enrolled',
              profiles: { name: '홍길동' },
            },
            meetings: [],
          },
        },
      ],
      error: null,
    });
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'profiles') return mockProfilesTableForMentor();
      if (table === 'application_mentors') return applicationMentorsQuery;
      throw new Error(`예상치 못한 테이블 조회: ${table}`);
    });

    const res = await request(app).get('/api/applications').set('Authorization', MENTOR_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ total: 1 });
    expect(res.body.data).toEqual([
      {
        id: 'application-1',
        applicationStatus: 'pending',
        mentorStatus: 'pending',
        acceptedMentorId: null,
        mentee: {
          id: 'mentee-1',
          name: '홍길동',
          school: '서울대학교',
          major: '컴퓨터공학',
          grade: '2',
          enrollmentStatus: 'enrolled',
        },
        questionnaire: { introduction: '자기소개', concern: '고민', goal: '목표', preferredTime: '평일 저녁' },
        meeting: undefined,
        unreadMessageCount: 3,
        createdAt: '2026-07-20T00:00:00.000Z',
        updatedAt: '2026-07-20T00:00:00.000Z',
      },
    ]);
    expect(applicationMentorsQuery.eq).toHaveBeenCalledWith('mentor_id', 'mentor-1');
    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_unread_message_counts', {
      p_user_id: 'mentor-1',
    });
  });

  it('멘토가 자신에게 오지 않은(다른 멘토 대상) 신청을 수락하려 하면 403 FORBIDDEN을 반환한다', async () => {
    mockAuthenticatedMentor();
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'profiles') return mockProfilesTableForMentor();
      if (table === 'applications') {
        return buildThenableQuery({
          data: { id: 'application-1', status: 'pending', mentee_id: 'mentee-1' },
          error: null,
        });
      }
      if (table === 'application_mentors') {
        // mentor-1은 이 신청에 연결된 application_mentors row가 없다(다른 멘토 대상 신청).
        return buildThenableQuery({ data: null, error: { message: 'no rows found' } });
      }
      throw new Error(`예상치 못한 테이블 조회: ${table}`);
    });

    const res = await request(app)
      .patch('/api/applications/application-1/accept')
      .set('Authorization', MENTOR_TOKEN);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toBe('이 면담 신청에 대한 권한이 없습니다.');
  });
});

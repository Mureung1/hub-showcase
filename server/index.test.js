import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const getSupabaseClient = vi.fn();

vi.mock('./supabase.js', () => ({
  getSupabaseClient,
  SupabaseConfigurationError: class SupabaseConfigurationError extends Error {},
}));

const { app } = await import('./index.js');

const VALID_PLAN = {
  examType: 'TOEIC',
  isFirstAttempt: false,
  currentScore: '650',
  targetScore: '850',
  examDate: '2026-08-31',
  dailyStudyMinutes: 120,
};

const DATABASE_ROW = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  exam_type: 'TOEIC',
  is_first_attempt: false,
  current_score: '650',
  target_score: '850',
  exam_date: '2026-08-31',
  daily_study_minutes: 120,
  created_at: '2026-07-20T00:00:00.000Z',
};

const VALID_DAILY_STUDY_RECORD = {
  studyPlanId: DATABASE_ROW.id,
  recordDate: '2026-07-27',
  generatedTasks: [
    { id: 'LC-0', area: 'LC', title: 'LC 핵심 유형 풀이', minutes: 40, isWeak: true },
  ],
  completedTaskIds: ['LC-0'],
  actualStudyEntries: [
    { id: 'actual-1', area: 'LC', title: 'Part 3 복습', minutes: 25 },
  ],
  difficultArea: 'LC',
  nextPriorityArea: 'RC',
  reflectionNote: '후반 집중력이 떨어졌다.',
};

const DAILY_STUDY_RECORD_ROW = {
  id: '223e4567-e89b-12d3-a456-426614174001',
  user_id: 'user-a',
  study_plan_id: DATABASE_ROW.id,
  study_date: '2026-07-27',
  generated_tasks: VALID_DAILY_STUDY_RECORD.generatedTasks,
  completed_task_ids: VALID_DAILY_STUDY_RECORD.completedTaskIds,
  actual_study_entries: VALID_DAILY_STUDY_RECORD.actualStudyEntries,
  difficult_area: 'LC',
  next_priority_area: 'RC',
  reflection_note: VALID_DAILY_STUDY_RECORD.reflectionNote,
  created_at: '2026-07-27T09:00:00.000Z',
  updated_at: '2026-07-27T10:00:00.000Z',
  study_plans: { exam_type: 'TOEIC' },
};

let server;
let baseUrl;

beforeEach(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  vi.clearAllMocks();
  await new Promise((resolve) => server.close(resolve));
});

function createSupabaseMock({
  user = { id: 'user-a' },
  queryData = DATABASE_ROW,
  queryError = null,
  listData = [DAILY_STUDY_RECORD_ROW],
  listError = null,
  upsertData = { id: 'record-1', ...VALID_DAILY_STUDY_RECORD },
  upsertError = null,
} = {}) {
  const insert = vi.fn().mockReturnThis();
  const upsert = vi.fn().mockReturnThis();
  const select = vi.fn().mockReturnThis();
  const single = vi.fn()
    .mockResolvedValueOnce({ data: upsertData, error: upsertError })
    .mockResolvedValue({ data: queryData, error: queryError });
  const maybeSingle = vi.fn().mockResolvedValue({ data: queryData, error: queryError });
  const eq = vi.fn().mockReturnThis();
  const lt = vi.fn().mockReturnThis();
  const order = vi.fn().mockReturnThis();
  const limit = vi.fn().mockReturnThis();
  const then = vi.fn((resolve) => resolve({ data: listData, error: listError }));
  const from = vi.fn(() => ({ insert, upsert, select, single, maybeSingle, eq, lt, order, limit, then }));

  getSupabaseClient.mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue(user ? { data: { user }, error: null } : { data: { user: null }, error: new Error('invalid') }),
    },
    from,
  });

  return { insert, upsert, select, single, maybeSingle, eq, lt, order, limit, then, from };
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json();
  return { response, body };
}

describe('study plan authenticated API', () => {
  test('returns 401 when the authorization header is missing', async () => {
    createSupabaseMock();

    const { response, body } = await request('/api/study-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_PLAN),
    });

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  test('returns 401 when the authorization header format is invalid', async () => {
    createSupabaseMock();

    const { response, body } = await request('/api/study-plans/me/latest', {
      headers: { Authorization: 'Token bad-format' },
    });

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  test('returns 401 when the token is invalid', async () => {
    createSupabaseMock({ user: null });

    const { response, body } = await request('/api/study-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer bad-token' },
      body: JSON.stringify(VALID_PLAN),
    });

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  test('stores the authenticated user id when creating a study plan', async () => {
    const supabaseMock = createSupabaseMock({ user: { id: 'user-a' } });

    const { response } = await request('/api/study-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer valid-token' },
      body: JSON.stringify({ ...VALID_PLAN, userId: 'forged-user' }),
    });

    expect(response.status).toBe(201);
    expect(supabaseMock.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'user-a' }));
    expect(supabaseMock.insert).not.toHaveBeenCalledWith(expect.objectContaining({ user_id: 'forged-user' }));
  });

  test('filters plan lookup by id and authenticated user id', async () => {
    const supabaseMock = createSupabaseMock({ user: { id: 'user-a' }, queryData: null });

    const { response } = await request(`/api/study-plans/${DATABASE_ROW.id}`, {
      headers: { Authorization: 'Bearer valid-token' },
    });

    expect(response.status).toBe(404);
    expect(supabaseMock.eq).toHaveBeenCalledWith('id', DATABASE_ROW.id);
    expect(supabaseMock.eq).toHaveBeenCalledWith('user_id', 'user-a');
  });

  test('returns the latest plan for the authenticated user only', async () => {
    const supabaseMock = createSupabaseMock({ user: { id: 'user-a' } });

    const { response, body } = await request('/api/study-plans/me/latest', {
      headers: { Authorization: 'Bearer valid-token' },
    });

    expect(response.status).toBe(200);
    expect(body.data.id).toBe(DATABASE_ROW.id);
    expect(body.data.userId).toBeUndefined();
    expect(supabaseMock.eq).toHaveBeenCalledWith('user_id', 'user-a');
    expect(supabaseMock.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(supabaseMock.limit).toHaveBeenCalledWith(1);
  });

  test('returns 404 when the authenticated user has no latest plan', async () => {
    const supabaseMock = createSupabaseMock({ user: { id: 'user-b' }, queryData: null });

    const { response, body } = await request('/api/study-plans/me/latest', {
      headers: { Authorization: 'Bearer valid-token' },
    });

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('STUDY_PLAN_NOT_FOUND');
    expect(supabaseMock.eq).toHaveBeenCalledWith('user_id', 'user-b');
  });
});

describe('daily study record authenticated API', () => {
  test('returns 401 when the authorization header is missing', async () => {
    createSupabaseMock();

    const { response, body } = await request('/api/daily-study-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_DAILY_STUDY_RECORD),
    });

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  test('returns 404 when the study plan does not belong to the authenticated user', async () => {
    const supabaseMock = createSupabaseMock({ queryData: null });

    const { response, body } = await request('/api/daily-study-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer valid-token' },
      body: JSON.stringify(VALID_DAILY_STUDY_RECORD),
    });

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('STUDY_PLAN_NOT_FOUND');
    expect(supabaseMock.from).toHaveBeenCalledWith('study_plans');
    expect(supabaseMock.eq).toHaveBeenCalledWith('id', VALID_DAILY_STUDY_RECORD.studyPlanId);
    expect(supabaseMock.eq).toHaveBeenCalledWith('user_id', 'user-a');
    expect(supabaseMock.upsert).not.toHaveBeenCalled();
  });

  test('stores the authenticated user id and study record arrays', async () => {
    const supabaseMock = createSupabaseMock({ user: { id: 'user-a' } });

    const { response } = await request('/api/daily-study-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer valid-token' },
      body: JSON.stringify({ ...VALID_DAILY_STUDY_RECORD, userId: 'forged-user' }),
    });

    expect(response.status).toBe(201);
    expect(supabaseMock.from).toHaveBeenCalledWith('daily_study_records');
    expect(supabaseMock.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-a',
        study_plan_id: VALID_DAILY_STUDY_RECORD.studyPlanId,
        study_date: VALID_DAILY_STUDY_RECORD.recordDate,
        generated_tasks: VALID_DAILY_STUDY_RECORD.generatedTasks,
        completed_task_ids: VALID_DAILY_STUDY_RECORD.completedTaskIds,
        actual_study_entries: VALID_DAILY_STUDY_RECORD.actualStudyEntries,
      }),
      { onConflict: 'study_plan_id,study_date' },
    );
    expect(supabaseMock.upsert).not.toHaveBeenCalledWith(expect.objectContaining({ user_id: 'forged-user' }));
  });

  test('uses the study plan and date as the upsert conflict target for repeated saves', async () => {
    const supabaseMock = createSupabaseMock();

    const { response } = await request('/api/daily-study-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer valid-token' },
      body: JSON.stringify({ ...VALID_DAILY_STUDY_RECORD, reflectionNote: '수정된 메모' }),
    });

    expect(response.status).toBe(201);
    expect(supabaseMock.upsert).toHaveBeenCalledTimes(1);
    expect(supabaseMock.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        study_plan_id: VALID_DAILY_STUDY_RECORD.studyPlanId,
        study_date: VALID_DAILY_STUDY_RECORD.recordDate,
        reflection_note: '수정된 메모',
      }),
      { onConflict: 'study_plan_id,study_date' },
    );
  });

  test('validates actual study entry minutes', async () => {
    createSupabaseMock();

    const { response, body } = await request('/api/daily-study-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer valid-token' },
      body: JSON.stringify({
        ...VALID_DAILY_STUDY_RECORD,
        actualStudyEntries: [{ id: 'actual-1', area: 'LC', title: '복습', minutes: 0 }],
      }),
    });

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields.actualStudyEntries).toBeDefined();
  });

  test('returns only the current user records in latest date order', async () => {
    const supabaseMock = createSupabaseMock({ listData: [DAILY_STUDY_RECORD_ROW] });

    const { response, body } = await request('/api/daily-study-records?limit=10', {
      headers: { Authorization: 'Bearer valid-token' },
    });

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toEqual(expect.objectContaining({
      id: DAILY_STUDY_RECORD_ROW.id,
      studyPlanId: DATABASE_ROW.id,
      studyDate: '2026-07-27',
      examType: 'TOEIC',
      generatedTasks: VALID_DAILY_STUDY_RECORD.generatedTasks,
      completedTaskIds: VALID_DAILY_STUDY_RECORD.completedTaskIds,
      actualStudyEntries: VALID_DAILY_STUDY_RECORD.actualStudyEntries,
      createdAt: DAILY_STUDY_RECORD_ROW.created_at,
      updatedAt: DAILY_STUDY_RECORD_ROW.updated_at,
    }));
    expect(body.data[0].userId).toBeUndefined();
    expect(supabaseMock.from).toHaveBeenCalledWith('daily_study_records');
    expect(supabaseMock.eq).toHaveBeenCalledWith('user_id', 'user-a');
    expect(supabaseMock.order).toHaveBeenCalledWith('study_date', { ascending: false });
    expect(supabaseMock.limit).toHaveBeenCalledWith(10);
  });

  test('returns an empty array when the current user has no records', async () => {
    createSupabaseMock({ listData: [] });

    const { response, body } = await request('/api/daily-study-records', {
      headers: { Authorization: 'Bearer valid-token' },
    });

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
  });

  test('filters record detail by id and authenticated user id', async () => {
    const supabaseMock = createSupabaseMock({ queryData: DAILY_STUDY_RECORD_ROW });

    const { response, body } = await request(`/api/daily-study-records/${DAILY_STUDY_RECORD_ROW.id}`, {
      headers: { Authorization: 'Bearer valid-token' },
    });

    expect(response.status).toBe(200);
    expect(body.data.id).toBe(DAILY_STUDY_RECORD_ROW.id);
    expect(body.data.examType).toBe('TOEIC');
    expect(body.data.userId).toBeUndefined();
    expect(supabaseMock.eq).toHaveBeenCalledWith('id', DAILY_STUDY_RECORD_ROW.id);
    expect(supabaseMock.eq).toHaveBeenCalledWith('user_id', 'user-a');
  });

  test('returns 404 when record detail belongs to another user or does not exist', async () => {
    createSupabaseMock({ queryData: null });

    const { response, body } = await request(`/api/daily-study-records/${DAILY_STUDY_RECORD_ROW.id}`, {
      headers: { Authorization: 'Bearer valid-token' },
    });

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('DAILY_STUDY_RECORD_NOT_FOUND');
  });

  test('returns 400 for invalid record detail UUID', async () => {
    createSupabaseMock();

    const { response, body } = await request('/api/daily-study-records/not-a-uuid', {
      headers: { Authorization: 'Bearer valid-token' },
    });

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('INVALID_DAILY_STUDY_RECORD_ID');
  });

  test('returns the latest record before today for the current study plan and user', async () => {
    const supabaseMock = createSupabaseMock({ queryData: DAILY_STUDY_RECORD_ROW });

    const { response, body } = await request(`/api/daily-study-records/latest-before-today?studyPlanId=${DATABASE_ROW.id}`, {
      headers: { Authorization: 'Bearer valid-token' },
    });

    expect(response.status).toBe(200);
    expect(body.data.id).toBe(DAILY_STUDY_RECORD_ROW.id);
    expect(body.data.examType).toBe('TOEIC');
    expect(supabaseMock.eq).toHaveBeenCalledWith('study_plan_id', DATABASE_ROW.id);
    expect(supabaseMock.eq).toHaveBeenCalledWith('user_id', 'user-a');
    expect(supabaseMock.lt).toHaveBeenCalledWith('study_date', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
    expect(supabaseMock.order).toHaveBeenCalledWith('study_date', { ascending: false });
    expect(supabaseMock.limit).toHaveBeenCalledWith(1);
  });

  test('returns data null when there is no previous record before today', async () => {
    createSupabaseMock({ queryData: null });

    const { response, body } = await request(`/api/daily-study-records/latest-before-today?studyPlanId=${DATABASE_ROW.id}`, {
      headers: { Authorization: 'Bearer valid-token' },
    });

    expect(response.status).toBe(200);
    expect(body.data).toBeNull();
  });
});

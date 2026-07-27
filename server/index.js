import express from 'express';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSupabaseClient, SupabaseConfigurationError } from './supabase.js';
import {
  toDailyStudyRecordDatabaseRow,
  toDailyStudyRecordResponse,
  validateDailyStudyRecordInput,
} from './dailyStudyRecords.js';
import {
  toStudyPlanDatabaseRow,
  toStudyPlanResponse,
  validateStudyPlanInput,
} from './studyPlans.js';

const SERVER_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

dotenv.config({ path: path.join(SERVER_DIRECTORY, '.env') });

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

async function authenticateRequest(req, res, next) {
  const authorizationHeader = req.get('authorization') || '';
  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: '로그인이 필요합니다.',
      },
    });
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getUser(token);
    const user = data?.user;

    if (error || !user?.id) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: '로그인이 필요합니다.',
        },
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: '로그인이 필요합니다.',
      },
    });
  }
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/health/db', async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('study_plans').select('id').limit(1);

    if (error) {
      console.error('Database health check failed.');
      return res.status(503).json({
        status: 'error',
        database: 'disconnected',
        message: 'Database connection check failed.',
      });
    }

    return res.json({
      status: 'ok',
      database: 'connected',
    });
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      console.error(`Database health check configuration error: ${error.message}`);
      return res.status(500).json({
        status: 'error',
        database: 'disconnected',
        message: error.message,
      });
    }

    console.error('Database health check failed.');
    return res.status(503).json({
      status: 'error',
      database: 'disconnected',
      message: 'Database connection check failed.',
    });
  }
});

app.post('/api/study-plans', authenticateRequest, async (req, res) => {
  const { data: studyPlan, errors } = validateStudyPlanInput(req.body);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: '입력값을 확인해 주세요.',
        fields: errors,
      },
    });
  }

  try {
    const supabase = getSupabaseClient();
    const databaseRow = toStudyPlanDatabaseRow(studyPlan, req.user.id);
    const { data, error } = await supabase
      .from('study_plans')
      .insert(databaseRow)
      .select()
      .single();

    if (error || !data) {
      console.error('Study plan creation failed.');
      return res.status(500).json({
        error: {
          code: 'DATABASE_ERROR',
          message: '학습 계획을 저장하지 못했습니다.',
        },
      });
    }

    return res.status(201).json({
      data: toStudyPlanResponse(data),
    });
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      console.error('Study plan creation failed because database configuration is incomplete.');
    } else {
      console.error('Study plan creation failed.');
    }

    return res.status(500).json({
      error: {
        code: 'DATABASE_ERROR',
        message: '학습 계획을 저장하지 못했습니다.',
      },
    });
  }
});

app.get('/api/study-plans/me/latest', authenticateRequest, async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('study_plans')
      .select(
        'id, exam_type, is_first_attempt, current_score, target_score, exam_date, daily_study_minutes, created_at',
      )
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Latest study plan lookup failed.');
      return res.status(500).json({
        error: {
          code: 'DATABASE_ERROR',
          message: '학습 계획을 조회하지 못했습니다.',
        },
      });
    }

    if (!data) {
      return res.status(404).json({
        error: {
          code: 'STUDY_PLAN_NOT_FOUND',
          message: '저장된 학습 계획이 없습니다.',
        },
      });
    }

    return res.json({
      data: toStudyPlanResponse(data),
    });
  } catch (error) {
    return res.status(500).json({
      error: {
        code: 'DATABASE_ERROR',
        message: '학습 계획을 조회하지 못했습니다.',
      },
    });
  }
});

app.get('/api/study-plans/:id', authenticateRequest, async (req, res) => {
  const { id } = req.params;

  if (!UUID_PATTERN.test(id)) {
    return res.status(400).json({
      error: {
        code: 'INVALID_STUDY_PLAN_ID',
        message: '유효한 UUID 형식의 학습 계획 id가 필요합니다.',
      },
    });
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('study_plans')
      .select(
        'id, exam_type, is_first_attempt, current_score, target_score, exam_date, daily_study_minutes, created_at',
      )
      .eq('id', id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (error) {
      console.error('Study plan lookup failed.');
      return res.status(500).json({
        error: {
          code: 'DATABASE_ERROR',
          message: '학습 계획을 조회하지 못했습니다.',
        },
      });
    }

    if (!data) {
      return res.status(404).json({
        error: {
          code: 'STUDY_PLAN_NOT_FOUND',
          message: '학습 계획을 찾을 수 없습니다.',
        },
      });
    }

    return res.json({
      data: toStudyPlanResponse(data),
    });
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      console.error('Study plan lookup failed because database configuration is incomplete.');
    } else {
      console.error('Study plan lookup failed.');
    }

    return res.status(500).json({
      error: {
        code: 'DATABASE_ERROR',
        message: '학습 계획을 조회하지 못했습니다.',
      },
    });
  }
});

app.get('/api/daily-study-records', authenticateRequest, async (req, res) => {
  const requestedLimit = Number(req.query.limit);
  const limit = Number.isInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 100) : null;

  try {
    const supabase = getSupabaseClient();
    let query = supabase
      .from('daily_study_records')
      .select(
        'id, study_plan_id, study_date, generated_tasks, completed_task_ids, actual_study_entries, difficult_area, next_priority_area, reflection_note, created_at, updated_at, study_plans(exam_type)',
      )
      .eq('user_id', req.user.id)
      .order('study_date', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Daily study record list lookup failed.');
      return res.status(500).json({
        error: {
          code: 'DATABASE_ERROR',
          message: '학습 기록을 조회하지 못했습니다.',
        },
      });
    }

    return res.json({
      data: (data || []).map(toDailyStudyRecordResponse),
    });
  } catch (error) {
    return res.status(500).json({
      error: {
        code: 'DATABASE_ERROR',
        message: '학습 기록을 조회하지 못했습니다.',
      },
    });
  }
});

app.get('/api/daily-study-records/latest-before-today', authenticateRequest, async (req, res) => {
  const { studyPlanId } = req.query;

  if (!UUID_PATTERN.test(studyPlanId || '')) {
    return res.status(400).json({
      error: {
        code: 'INVALID_STUDY_PLAN_ID',
        message: '유효한 UUID 형식의 학습 계획 id가 필요합니다.',
      },
    });
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('daily_study_records')
      .select(
        'id, study_plan_id, study_date, generated_tasks, completed_task_ids, actual_study_entries, difficult_area, next_priority_area, reflection_note, created_at, updated_at, study_plans(exam_type)',
      )
      .eq('study_plan_id', studyPlanId)
      .eq('user_id', req.user.id)
      .lt('study_date', getLocalDateString())
      .order('study_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Latest previous daily study record lookup failed.');
      return res.status(500).json({
        error: {
          code: 'DATABASE_ERROR',
          message: '이전 학습 기록을 조회하지 못했습니다.',
        },
      });
    }

    return res.json({
      data: data ? toDailyStudyRecordResponse(data) : null,
    });
  } catch (error) {
    return res.status(500).json({
      error: {
        code: 'DATABASE_ERROR',
        message: '이전 학습 기록을 조회하지 못했습니다.',
      },
    });
  }
});

app.get('/api/daily-study-records/:id', authenticateRequest, async (req, res) => {
  const { id } = req.params;

  if (!UUID_PATTERN.test(id)) {
    return res.status(400).json({
      error: {
        code: 'INVALID_DAILY_STUDY_RECORD_ID',
        message: '유효한 UUID 형식의 학습 기록 id가 필요합니다.',
      },
    });
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('daily_study_records')
      .select(
        'id, study_plan_id, study_date, generated_tasks, completed_task_ids, actual_study_entries, difficult_area, next_priority_area, reflection_note, created_at, updated_at, study_plans(exam_type)',
      )
      .eq('id', id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (error) {
      console.error('Daily study record detail lookup failed.');
      return res.status(500).json({
        error: {
          code: 'DATABASE_ERROR',
          message: '학습 기록을 조회하지 못했습니다.',
        },
      });
    }

    if (!data) {
      return res.status(404).json({
        error: {
          code: 'DAILY_STUDY_RECORD_NOT_FOUND',
          message: '학습 기록을 찾을 수 없습니다.',
        },
      });
    }

    return res.json({
      data: toDailyStudyRecordResponse(data),
    });
  } catch (error) {
    return res.status(500).json({
      error: {
        code: 'DATABASE_ERROR',
        message: '학습 기록을 조회하지 못했습니다.',
      },
    });
  }
});

app.post('/api/daily-study-records', authenticateRequest, async (req, res) => {
  const { data: dailyStudyRecord, errors } = validateDailyStudyRecordInput(req.body);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: '입력값을 확인해 주세요.',
        fields: errors,
      },
    });
  }

  try {
    const supabase = getSupabaseClient();
    const { data: studyPlan, error: studyPlanError } = await supabase
      .from('study_plans')
      .select('id')
      .eq('id', dailyStudyRecord.studyPlanId)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (studyPlanError) {
      console.error('Daily study record ownership check failed.');
      return res.status(500).json({
        error: {
          code: 'DATABASE_ERROR',
          message: '학습 기록을 저장하지 못했습니다.',
        },
      });
    }

    if (!studyPlan) {
      return res.status(404).json({
        error: {
          code: 'STUDY_PLAN_NOT_FOUND',
          message: '학습 계획을 찾을 수 없습니다.',
        },
      });
    }

    const databaseRow = toDailyStudyRecordDatabaseRow(dailyStudyRecord, req.user.id);
    const { data, error } = await supabase
      .from('daily_study_records')
      .upsert(databaseRow, { onConflict: 'study_plan_id,study_date' })
      .select()
      .single();

    if (error || !data) {
      console.error('Daily study record upsert failed.');
      return res.status(500).json({
        error: {
          code: 'DATABASE_ERROR',
          message: '학습 기록을 저장하지 못했습니다.',
        },
      });
    }

    return res.status(201).json({
      data: toDailyStudyRecordResponse(data),
    });
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      console.error('Daily study record save failed because database configuration is incomplete.');
    } else {
      console.error('Daily study record save failed.');
    }

    return res.status(500).json({
      error: {
        code: 'DATABASE_ERROR',
        message: '학습 기록을 저장하지 못했습니다.',
      },
    });
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export { app, authenticateRequest };

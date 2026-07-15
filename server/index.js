import express from 'express';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSupabaseClient, SupabaseConfigurationError } from './supabase.js';
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

app.post('/api/study-plans', async (req, res) => {
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
    const databaseRow = toStudyPlanDatabaseRow(studyPlan);
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

app.get('/api/study-plans/:id', async (req, res) => {
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

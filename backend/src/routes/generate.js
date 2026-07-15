import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getSupabaseClient } from '../db/supabaseClient.js';
import { runPipeline } from '../services/pipeline.js';

const router = express.Router();

// Multer 설정: 업로드된 파일 저장
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/temp';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    // JPG, PNG만 허용
    const allowedMimes = ['image/jpeg', 'image/png'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('JPG 또는 PNG 형식만 업로드 가능합니다'));
    }
  }
});

/**
 * POST /api/generate
 * 릴스 생성 파이프라인 시작
 *
 * Request:
 * {
 *   "store_id": 1,
 *   "image": <File>,              // multipart/form-data
 *   "trend_hashtag": "#신메뉴",
 *   "purpose": "신메뉴 소개",
 *   "mood": "bright"
 * }
 *
 * Response (202 Accepted):
 * {
 *   "job_id": "uuid",
 *   "status": "queued",
 *   "message": "파이프라인이 시작되었습니다",
 *   "estimated_time": 45
 * }
 */
router.post('/', express.json(), async (req, res) => {
  try {
    const { store_id, image_url, trend_hashtag, purpose, mood } = req.body;

    console.log('[POST /api/generate] 요청 시작:', {
      store_id,
      trend_hashtag,
      purpose,
      mood,
      image_url
    });

    // ===== 1. 입력값 검증 =====
    if (!store_id || !image_url || !trend_hashtag || !purpose || !mood) {
      return res.status(400).json({
        error: '필수 필드 누락',
        required: ['store_id', 'image_url', 'trend_hashtag', 'purpose', 'mood']
      });
    }

    // ===== 2. 가게 존재 여부 확인 =====
    const supabase = getSupabaseClient();
    const { data: store, error: storeError } = await supabase
      .from('store_info')
      .select('store_id')
      .eq('store_id', parseInt(store_id))
      .single();

    if (storeError && storeError.code !== 'PGRST116') {
      console.error('[POST /api/generate] 가게 조회 오류:', storeError);
      return res.status(500).json({
        error: 'DB 조회 오류',
        message: storeError.message
      });
    }

    if (!store) {
      return res.status(404).json({
        error: '가게 찾을 수 없음',
        message: `store_id ${store_id}는 존재하지 않습니다`
      });
    }

    // ===== 3. generation_jobs 레코드 생성 =====
    const { data: job, error: jobError } = await supabase
      .from('generation_jobs')
      .insert([
        {
          store_id: parseInt(store_id),
          status: 'queued',
          current_step: 0,
          progress: 0,
          trend_hashtag,
          purpose,
          mood,
          original_image_url: image_url,
          created_at: new Date().toISOString()
        }
      ])
      .select('job_id, status, created_at');

    if (jobError) {
      console.error('[POST /api/generate] Job 생성 오류:', jobError);
      return res.status(500).json({
        error: 'Job 생성 실패',
        message: jobError.message
      });
    }

    const jobId = job[0].job_id;
    console.log('[POST /api/generate] Job 생성 완료:', jobId);

    // ===== 4. 백그라운드에서 파이프라인 시작 =====
    runPipeline(jobId).catch(error => {
      console.error('[POST /api/generate] Pipeline 오류:', error);
    });

    // ===== 5. 응답 반환 (202 Accepted) =====
    res.status(202).json({
      job_id: jobId,
      status: 'queued',
      message: '파이프라인이 대기열에 추가되었습니다',
      estimated_time: 45, // 초 단위
      created_at: job[0].created_at
    });

  } catch (error) {
    console.error('[POST /api/generate] 예상치 못한 오류:', error);
    res.status(500).json({
      error: '서버 오류',
      message: error.message
    });
  }
});

/**
 * GET /api/generate/:job_id
 * 생성 작업의 진행 상황 조회 (폴링용)
 *
 * Response (200 OK):
 * {
 *   "job_id": "uuid",
 *   "status": "processing",
 *   "current_step": 1,
 *   "progress": 50,
 *   "steps": [
 *     {
 *       "name": "YOLOv8 스마트 크롭",
 *       "status": "completed",
 *       "duration": 3.2,
 *       "output": { ... }
 *     },
 *     ...
 *   ],
 *   "error": null
 * }
 */
router.get('/:job_id', async (req, res) => {
  try {
    const { job_id } = req.params;

    if (!job_id) {
      return res.status(400).json({
        error: 'job_id 필수'
      });
    }

    const supabase = getSupabaseClient();

    // ===== 1. generation_job 조회 =====
    const { data: job, error: jobError } = await supabase
      .from('generation_jobs')
      .select('*')
      .eq('job_id', job_id)
      .single();

    if (jobError && jobError.code === 'PGRST116') {
      return res.status(404).json({
        error: 'Job 찾을 수 없음',
        message: `job_id ${job_id}는 존재하지 않습니다`
      });
    }

    if (jobError) {
      console.error('[GET /api/generate/:job_id] Job 조회 오류:', jobError);
      return res.status(500).json({
        error: 'DB 조회 오류',
        message: jobError.message
      });
    }

    // ===== 2. generation_steps 조회 =====
    const { data: steps, error: stepsError } = await supabase
      .from('generation_steps')
      .select('step_id, step_number, step_name, status, started_at, completed_at, duration_ms, metadata')
      .eq('job_id', job_id)
      .order('step_number', { ascending: true });

    if (stepsError) {
      console.error('[GET /api/generate/:job_id] Steps 조회 오류:', stepsError);
      return res.status(500).json({
        error: 'Steps 조회 오류',
        message: stepsError.message
      });
    }

    // ===== 3. 응답 데이터 구성 =====
    const stepsFormatted = steps.map((step) => ({
      name: step.step_name,
      status: step.status,
      duration: step.duration_ms ? (step.duration_ms / 1000).toFixed(1) : null,
      output: step.metadata || null
    }));

    res.status(200).json({
      job_id: job.job_id,
      status: job.status,
      current_step: job.current_step,
      progress: job.progress,
      steps: stepsFormatted,
      error: job.error_message || null,
      created_at: job.created_at,
      started_at: job.started_at,
      completed_at: job.completed_at
    });

  } catch (error) {
    console.error('[GET /api/generate/:job_id] 예상치 못한 오류:', error);
    res.status(500).json({
      error: '서버 오류',
      message: error.message
    });
  }
});

/**
 * GET /api/generate/:job_id/result
 * 생성 완료된 작업의 최종 결과 조회
 *
 * Response (200 OK - 완료 시):
 * {
 *   "job_id": "uuid",
 *   "status": "completed",
 *   "video": {
 *     "video_id": 123,
 *     "video_url": "https://...",
 *     "thumbnail": "https://...",
 *     "duration": 15,
 *     "resolution": "1080x1920"
 *   },
 *   "metadata": {
 *     "caption": "...",
 *     "hashtags": [...],
 *     ...
 *   }
 * }
 *
 * Response (202 - 진행 중):
 * {
 *   "status": "processing",
 *   "message": "파이프라인이 진행 중입니다"
 * }
 */
router.get('/:job_id/result', async (req, res) => {
  try {
    const { job_id } = req.params;

    const supabase = getSupabaseClient();

    // ===== 1. generation_job 조회 =====
    const { data: job, error: jobError } = await supabase
      .from('generation_jobs')
      .select('*')
      .eq('job_id', job_id)
      .single();

    if (jobError && jobError.code === 'PGRST116') {
      return res.status(404).json({
        error: 'Job 찾을 수 없음'
      });
    }

    if (jobError) {
      return res.status(500).json({
        error: 'DB 조회 오류',
        message: jobError.message
      });
    }

    // ===== 2. 진행 중이면 202 반환 =====
    if (job.status !== 'completed') {
      return res.status(202).json({
        status: job.status,
        progress: job.progress,
        message: '파이프라인이 진행 중입니다'
      });
    }

    // ===== 3. 실패 시 오류 반환 =====
    if (job.status === 'failed') {
      return res.status(200).json({
        status: 'failed',
        error: job.error_message
      });
    }

    // ===== 4. 완료: 결과 반환 =====
    res.status(200).json({
      job_id: job.job_id,
      status: job.status,
      video: {
        video_id: job.step4_video_id,
        video_url: job.step4_video_url,
        thumbnail: job.step4_thumbnail_url,
        duration: 15,
        resolution: '1080x1920'
      },
      metadata: {
        caption: job.step2_caption,
        hashtags: job.step2_hashtags || [],
        trend: job.trend_hashtag,
        purpose: job.purpose,
        mood: job.mood,
        product_label: job.step1_product_label,
        confidence: job.step1_confidence,
        similarity_score: job.step2_similarity_score,
        created_at: job.created_at,
        completed_at: job.completed_at
      }
    });

  } catch (error) {
    console.error('[GET /api/generate/:job_id/result] 예상치 못한 오류:', error);
    res.status(500).json({
      error: '서버 오류',
      message: error.message
    });
  }
});

export default router;

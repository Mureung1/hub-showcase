-- Migration: 생성 작업 추적 테이블
-- Created: 2026-07-15
-- Purpose: AI 파이프라인 작업 상태 및 단계별 로깅

-- 1. generation_jobs 테이블
-- 전체 생성 작업 추적 (각 영상 생성 요청당 1개 row)
CREATE TABLE generation_jobs (
  job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id BIGINT NOT NULL REFERENCES store_info(store_id),

  -- 작업 상태
  status TEXT NOT NULL DEFAULT 'queued',
  current_step INTEGER DEFAULT 0,
  progress INTEGER DEFAULT 0,

  -- 입력 데이터
  trend_hashtag TEXT,
  purpose TEXT,
  mood TEXT,
  original_image_url TEXT NOT NULL,

  -- Step별 출력 (각 단계가 완료되면 저장)
  step1_cropped_image_url TEXT,           -- YOLOv8 출력
  step1_confidence FLOAT,
  step1_product_label TEXT,

  step2_caption TEXT,                     -- KoBERT 출력
  step2_hashtags TEXT[],
  step2_similarity_score FLOAT,

  step3_audio_url TEXT,                   -- TTS 출력

  step4_video_url TEXT,                   -- FFmpeg 출력
  step4_thumbnail_url TEXT,
  step4_video_id BIGINT REFERENCES generated_videos(video_id),

  -- 에러 처리
  error_message TEXT,
  error_step INTEGER,

  -- 타이밍
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,

  -- 검증
  CONSTRAINT valid_status CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  CONSTRAINT valid_progress CHECK (progress >= 0 AND progress <= 100),
  CONSTRAINT valid_step CHECK (current_step >= 0 AND current_step <= 4)
);

-- generation_jobs 인덱스
CREATE INDEX idx_generation_jobs_store_id ON generation_jobs(store_id);
CREATE INDEX idx_generation_jobs_status ON generation_jobs(status);
CREATE INDEX idx_generation_jobs_created_at ON generation_jobs(created_at DESC);

-- 2. generation_steps 테이블
-- 각 단계별 상세 로깅 (각 작업당 최대 4개 row)
CREATE TABLE generation_steps (
  step_id BIGSERIAL PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES generation_jobs(job_id) ON DELETE CASCADE,

  step_number INTEGER NOT NULL,          -- 1, 2, 3, 4
  step_name TEXT NOT NULL,               -- "YOLOv8 스마트 크롭" 등

  -- 단계 상태
  status TEXT NOT NULL DEFAULT 'pending',

  -- 타이밍
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_ms INTEGER,

  -- 에러
  error_message TEXT,

  -- 단계별 추가 정보 (JSON)
  metadata JSONB,

  -- 검증
  CONSTRAINT valid_step_status CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  CONSTRAINT valid_step_number CHECK (step_number >= 1 AND step_number <= 4)
);

-- generation_steps 인덱스
CREATE INDEX idx_generation_steps_job_id ON generation_steps(job_id);
CREATE INDEX idx_generation_steps_status ON generation_steps(status);
CREATE INDEX idx_generation_steps_step_number ON generation_steps(step_number);

-- 3. 트리거: generation_jobs 생성 시 step 레코드 자동 생성
-- (각 job 생성 시 4개의 step 레코드를 미리 만들기)
CREATE OR REPLACE FUNCTION create_generation_steps()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO generation_steps (job_id, step_number, step_name, status)
  VALUES
    (NEW.job_id, 1, 'YOLOv8 스마트 크롭', 'pending'),
    (NEW.job_id, 2, 'KoBERT 트렌드 매칭', 'pending'),
    (NEW.job_id, 3, 'TTS 음성 생성', 'pending'),
    (NEW.job_id, 4, 'FFmpeg 영상 렌더링', 'pending');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_generation_steps
AFTER INSERT ON generation_jobs
FOR EACH ROW
EXECUTE FUNCTION create_generation_steps();

-- 4. RLS (Row Level Security) 정책
-- 각 store의 관리자만 해당 store의 작업을 볼 수 있도록
ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own store generation jobs"
  ON generation_jobs
  FOR SELECT
  USING (store_id IN (
    SELECT store_id FROM store_info
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own store generation jobs"
  ON generation_jobs
  FOR INSERT
  WITH CHECK (store_id IN (
    SELECT store_id FROM store_info
    WHERE user_id = auth.uid()
  ));

-- generation_steps도 비슷하게
ALTER TABLE generation_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view generation steps for their store"
  ON generation_steps
  FOR SELECT
  USING (job_id IN (
    SELECT job_id FROM generation_jobs
    WHERE store_id IN (
      SELECT store_id FROM store_info
      WHERE user_id = auth.uid()
    )
  ));

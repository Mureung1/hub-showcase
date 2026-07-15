# Supabase 테이블 생성 가이드

## 📋 생성 파이프라인 테이블 설정

### 단계 1: Supabase 콘솔 접속

1. https://supabase.com 에 접속
2. 프로젝트 선택
3. "SQL Editor" 메뉴 클릭

### 단계 2: SQL 실행

아래 SQL을 **Supabase SQL Editor** 에 붙여넣고 실행합니다:

```sql
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
```

### 단계 3: RLS (Row Level Security) 설정 (선택사항)

보안이 필요하면 이 SQL도 실행합니다:

```sql
-- RLS 정책 (인증된 사용자만 자신의 가게 작업 조회 가능)
ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;

ALTER TABLE generation_steps ENABLE ROW LEVEL SECURITY;
```

---

## ✅ 검증: 테이블이 잘 생성되었는지 확인

### 방법 1: SQL로 확인

```sql
-- generation_jobs 테이블 확인
SELECT * FROM generation_jobs LIMIT 1;

-- generation_steps 테이블 확인
SELECT * FROM generation_steps LIMIT 1;

-- 트리거 확인
SELECT * FROM information_schema.triggers WHERE trigger_name = 'trigger_create_generation_steps';
```

### 방법 2: Supabase 콘솔에서 확인

1. "Database" → "Tables" 메뉴 확인
2. `generation_jobs` 테이블이 있는지 확인
3. `generation_steps` 테이블이 있는지 확인

---

## 📊 테이블 구조

### generation_jobs

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| job_id | UUID | 작업 고유ID (Primary Key) |
| store_id | BIGINT | 가게ID (Foreign Key) |
| status | TEXT | queued / processing / completed / failed |
| current_step | INT | 현재 실행 중인 단계 (1-4) |
| progress | INT | 진행률 (0-100) |
| trend_hashtag | TEXT | 선택한 트렌드 (#신메뉴) |
| purpose | TEXT | 프로모션 목적 |
| mood | TEXT | 비디오 분위기 |
| original_image_url | TEXT | 업로드된 원본 이미지 URL |
| step1_cropped_image_url | TEXT | YOLOv8이 크롭한 이미지 |
| step2_caption | TEXT | KoBERT가 생성한 자막 |
| step3_audio_url | TEXT | TTS가 생성한 음성 파일 |
| step4_video_url | TEXT | FFmpeg가 생성한 최종 영상 |
| error_message | TEXT | 에러 발생 시 에러 메시지 |
| created_at | TIMESTAMP | 작업 생성 시간 |
| started_at | TIMESTAMP | 작업 시작 시간 |
| completed_at | TIMESTAMP | 작업 완료 시간 |

### generation_steps

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| step_id | BIGSERIAL | 단계 고유ID |
| job_id | UUID | 작업ID (Foreign Key) |
| step_number | INT | 단계 번호 (1-4) |
| step_name | TEXT | 단계명 (YOLOv8 스마트 크롭 등) |
| status | TEXT | pending / in_progress / completed / failed |
| started_at | TIMESTAMP | 단계 시작 시간 |
| completed_at | TIMESTAMP | 단계 완료 시간 |
| duration_ms | INT | 처리 시간 (밀리초) |
| metadata | JSONB | 단계별 추가 정보 |

---

## 🔄 작동 원리

### 트리거 동작

`generation_jobs` 테이블에 새로운 행이 삽입되면, `create_generation_steps()` 트리거가 자동으로:

1. `step_number = 1` (YOLOv8 스마트 크롭)
2. `step_number = 2` (KoBERT 트렌드 매칭)
3. `step_number = 3` (TTS 음성 생성)
4. `step_number = 4` (FFmpeg 영상 렌더링)

의 4개 행을 `generation_steps` 테이블에 자동 생성합니다.

---

## 🚀 이제 테이블이 준비되었습니다!

이제 백엔드 API를 실행할 준비가 됐습니다:

```bash
cd backend
npm start
```

그리고 프론트엔드에서:

```bash
cd frontend
npm run dev
```


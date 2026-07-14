-- ============================================
-- lecture: 강의 기본 정보
-- ============================================
CREATE TABLE IF NOT EXISTS lecture (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  year INTEGER NOT NULL,              -- 개설연도
  semester TEXT NOT NULL,             -- 학기 (예: '2026-1')
  name TEXT NOT NULL,                 -- 강의명
  professor TEXT,                     -- 교수
  credit REAL NOT NULL,               -- 학점
  category TEXT NOT NULL,             -- 교과구분
  department TEXT NOT NULL,           -- 학과

  required BOOLEAN DEFAULT FALSE,     -- 필수 여부 (postgres는 진짜 boolean 지원)
  prerequisite JSONB,                 -- 선수과목: JSONB 타입으로 저장 (예: [1,5,9])
  pair_group TEXT,
  tier INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- lecture_time: 강의별 시간대 (요일 + 교시)
-- ============================================
CREATE TABLE IF NOT EXISTS lecture_time (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lecture_id BIGINT NOT NULL REFERENCES lecture(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  period INTEGER NOT NULL
);

-- ============================================
-- 인덱스
-- ============================================
CREATE INDEX IF NOT EXISTS idx_lecture_department ON lecture(department);
CREATE INDEX IF NOT EXISTS idx_lecture_semester ON lecture(semester);
CREATE INDEX IF NOT EXISTS idx_lecture_time_lookup ON lecture_time(day, period);
CREATE INDEX IF NOT EXISTS idx_lecture_time_lecture_id ON lecture_time(lecture_id);
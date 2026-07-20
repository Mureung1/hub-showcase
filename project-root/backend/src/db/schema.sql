-- ============================================
-- lecture: 강의 기본 정보
-- ============================================
CREATE TABLE IF NOT EXISTS lecture (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  crse_no TEXT NOT NULL,              -- 학교 API 강좌번호 (예: 'CLTR0090-001'). 학기마다 재사용되므로 crse_no 단독이 아니라 (year, semester, crse_no) 조합이 유일키.
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
-- lecture_time: 강의별 시간대 (요일 + 실제 시각)
-- 학교 API(lssnsRealTimeInfo)가 "1교시/2교시" 같은 고정 틀이 아니라
-- 강의마다 자유로운 시작/종료 시각을 주기 때문에, 교시 번호 대신
-- 실제 시:분 문자열을 그대로 저장한다 (예: "09:00" ~ "12:00").
-- ============================================
CREATE TABLE IF NOT EXISTS lecture_time (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lecture_id BIGINT NOT NULL REFERENCES lecture(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL
);

-- ============================================
-- 인덱스
-- ============================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_lecture_crse_no_unique ON lecture(year, semester, crse_no);
CREATE INDEX IF NOT EXISTS idx_lecture_department ON lecture(department);
CREATE INDEX IF NOT EXISTS idx_lecture_semester ON lecture(semester);
CREATE INDEX IF NOT EXISTS idx_lecture_time_lookup ON lecture_time(day, start_time);
CREATE INDEX IF NOT EXISTS idx_lecture_time_lecture_id ON lecture_time(lecture_id);
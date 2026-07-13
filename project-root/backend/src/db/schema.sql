-- ============================================
-- lecture: 강의 기본 정보
-- ============================================
CREATE TABLE IF NOT EXISTS lecture (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,              -- 개설연도
  semester TEXT NOT NULL,             -- 학기 (예: '2026-1')
  name TEXT NOT NULL,                 -- 강의명
  professor TEXT,                     -- 교수
  credit REAL NOT NULL,               -- 학점
  category TEXT NOT NULL,             -- 교과구분 (예: 전공필수/전공선택/교양 등)
  department TEXT NOT NULL,           -- 학과

  required INTEGER DEFAULT 0,         -- 필수 여부 (0/1, boolean 대용)
  prerequisite TEXT,                  -- 선수과목: JSON 배열 문자열 예) '[1,5,9]'
  pair_group TEXT,                    -- 짝지어 들어야 하는 강의 그룹 식별자
  tier INTEGER,                       -- 추천 우선순위/등급

  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- lecture_time: 강의별 시간대 (요일 + 교시)
-- 강의 하나가 여러 시간대를 가질 수 있어 1:N으로 분리
-- ============================================
CREATE TABLE IF NOT EXISTS lecture_time (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lecture_id INTEGER NOT NULL REFERENCES lecture(id) ON DELETE CASCADE,
  day TEXT NOT NULL,                  -- '월','화','수','목','금'
  period INTEGER NOT NULL             -- 교시 (1,2,3...)
);

-- ============================================
-- 인덱스
-- ============================================
CREATE INDEX IF NOT EXISTS idx_lecture_department ON lecture(department);
CREATE INDEX IF NOT EXISTS idx_lecture_semester ON lecture(semester);

-- day+period 조합으로 "이 시간대에 걸리는 강의" 빠르게 조회하기 위한 인덱스
-- (겹침 체크 1차 필터링에서 사용)
CREATE INDEX IF NOT EXISTS idx_lecture_time_lookup ON lecture_time(day, period);

-- lecture_id로 특정 강의의 전체 시간대를 조회할 때 사용
CREATE INDEX IF NOT EXISTS idx_lecture_time_lecture_id ON lecture_time(lecture_id);
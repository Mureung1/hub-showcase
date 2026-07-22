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
  tier REAL,                          -- 강의 등급(성적 관대함/추천도). 1~5, 5가 가장 높음. 소수점(예: 4.5) 허용. 수기 큐레이션(data/courseTiers.js), 미평가는 NULL
  grade TEXT,                         -- 개설 학년. 학교 API(estblGrade) 값 그대로 저장: "1"~"4" 또는 학년 무관인 "*"



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
-- timetable: 사용자가 확정한 시간표 (학기당 1개). user_id는 Supabase Auth의 auth.users.id 참조.
-- ============================================
CREATE TABLE IF NOT EXISTS timetable (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  semester TEXT NOT NULL,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- timetable_lecture: 확정 시간표에 포함된 강의 목록 (timetable : lecture = 1 : N)
-- ============================================
CREATE TABLE IF NOT EXISTS timetable_lecture (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  timetable_id BIGINT NOT NULL REFERENCES timetable(id) ON DELETE CASCADE,
  lecture_id BIGINT NOT NULL REFERENCES lecture(id) ON DELETE CASCADE
);

-- ============================================
-- 인덱스
-- ============================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_lecture_crse_no_unique ON lecture(year, semester, crse_no);
CREATE INDEX IF NOT EXISTS idx_lecture_department ON lecture(department);
CREATE INDEX IF NOT EXISTS idx_lecture_semester ON lecture(semester);
CREATE INDEX IF NOT EXISTS idx_lecture_time_lookup ON lecture_time(day, start_time);
CREATE INDEX IF NOT EXISTS idx_lecture_time_lecture_id ON lecture_time(lecture_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_timetable_user_semester ON timetable(user_id, year, semester);
CREATE INDEX IF NOT EXISTS idx_timetable_lecture_timetable_id ON timetable_lecture(timetable_id);
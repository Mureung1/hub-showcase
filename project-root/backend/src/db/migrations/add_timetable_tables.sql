-- ============================================
-- timetable: 사용자가 확정한 시간표 (학기당 1개)
-- user_id는 Supabase Auth의 auth.users.id를 그대로 참조한다.
-- ============================================
CREATE TABLE IF NOT EXISTS timetable (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  semester TEXT NOT NULL,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 사용자당 학기당 확정 시간표는 하나만 존재 (다시 선택하면 덮어씀)
CREATE UNIQUE INDEX IF NOT EXISTS idx_timetable_user_semester ON timetable(user_id, year, semester);

-- ============================================
-- timetable_lecture: 확정 시간표에 포함된 강의 목록 (timetable : lecture = 1 : N)
-- ============================================
CREATE TABLE IF NOT EXISTS timetable_lecture (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  timetable_id BIGINT NOT NULL REFERENCES timetable(id) ON DELETE CASCADE,
  lecture_id BIGINT NOT NULL REFERENCES lecture(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_timetable_lecture_timetable_id ON timetable_lecture(timetable_id);

-- lecture/lecture_time과 동일하게 RLS는 켜지 않는다 (백엔드가 JWT 검증 후
-- user_id로 직접 필터링하는 방식으로 접근 제어를 애플리케이션 레벨에서 수행).
ALTER TABLE timetable DISABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_lecture DISABLE ROW LEVEL SECURITY;

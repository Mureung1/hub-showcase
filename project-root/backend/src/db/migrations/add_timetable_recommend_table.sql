CREATE TABLE IF NOT EXISTS timetable_recommend (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  timetable_id BIGINT NOT NULL REFERENCES timetable(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_timetable_recommend_unique ON timetable_recommend(timetable_id, user_id);

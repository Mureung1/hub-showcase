CREATE TABLE IF NOT EXISTS learner_profiles (
  id TEXT PRIMARY KEY CHECK (id = 'primary'),
  display_name TEXT NOT NULL,
  learning_goal TEXT NOT NULL,
  preferred_tracks TEXT[] NOT NULL CHECK (cardinality(preferred_tracks) > 0),
  daily_study_minutes INTEGER NOT NULL CHECK (daily_study_minutes >= 1),
  level TEXT NOT NULL CHECK (level IN ('beginner', 'basic', 'interview')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

REVOKE ALL ON TABLE learner_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE learner_profiles TO service_role;

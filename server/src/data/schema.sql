-- 사용자 계정 (회원가입으로 생성)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_no TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  department TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 사용자별 채팅 세션
CREATE TABLE IF NOT EXISTS chat_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 세션에 속한 메시지 (사용자 프롬프트 + LLM 응답)
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES chat_sessions(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 요청 단위 게이트웨이 판정 로그
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  session_id INTEGER REFERENCES chat_sessions(id),
  message_id INTEGER REFERENCES messages(id),
  action TEXT NOT NULL CHECK (action IN ('pass', 'masked', 'blocked')),
  provider TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 로그에 딸린 개별 탐지 결과 (정규식/NER/로컬 LLM 소스별로 여러 개 가능)
CREATE TABLE IF NOT EXISTS detections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  log_id INTEGER NOT NULL REFERENCES logs(id),
  type TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('regex', 'ner', 'llm')),
  matched_value TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_session_id ON logs(session_id);
CREATE INDEX IF NOT EXISTS idx_detections_log_id ON detections(log_id);

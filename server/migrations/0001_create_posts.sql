-- Post: 홍보글/공지사항 공용 (../../docs/api-spec.md Post 모델 기준).
-- purpose(신메뉴/이벤트/일반) 분기별 인터뷰 답변은 별도 상세 테이블 대신
-- flat nullable 컬럼으로 구조화해서 저장한다 (사용자와 상의해 결정).
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('promotion', 'notice')),
  purpose TEXT,
  notice_type TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  seo_keywords TEXT NOT NULL DEFAULT '[]',
  hashtags TEXT NOT NULL DEFAULT '[]',
  images TEXT NOT NULL DEFAULT '[]',
  thumbnail_url TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published')),
  scheduled_at TEXT,
  published_at TEXT,
  suggested_publish_time TEXT,
  -- 신메뉴(purpose = 'new-menu')
  menu_name TEXT,
  launch_date TEXT,
  -- 이벤트/할인(purpose = 'event')
  event_name TEXT,
  event_type TEXT,
  event_detail TEXT,
  event_period_start TEXT,
  event_period_end TEXT,
  -- 일반 홍보(purpose = 'general')
  general_topic TEXT,
  general_detail TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_posts_type_status ON posts (type, status);

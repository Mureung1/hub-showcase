-- PostgreSQL 스키마 (Supabase)
-- StoreInfo: 매장의 기본 정보를 담는 마스터 테이블
CREATE TABLE IF NOT EXISTS store_info (
  store_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_name TEXT NOT NULL,
  owner_name TEXT,
  category TEXT NOT NULL,
  location TEXT NOT NULL,
  signature_item TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CrawlJobs: SNS 크롤링 실행 이력
CREATE TABLE IF NOT EXISTS crawl_jobs (
  crawl_job_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok')),
  target_category TEXT,
  target_keyword TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  collected_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RawTrendPosts: 크롤링해온 원본 게시물 데이터
CREATE TABLE IF NOT EXISTS raw_trend_posts (
  raw_post_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  crawl_job_id BIGINT,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok')),
  source_url TEXT,
  external_post_id TEXT,
  author_name TEXT,
  caption TEXT,
  hashtags TEXT,
  music_title TEXT,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  posted_at TIMESTAMPTZ,
  crawled_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_raw_trend_posts_crawl_job FOREIGN KEY (crawl_job_id) REFERENCES crawl_jobs(crawl_job_id) ON DELETE CASCADE
);

-- TrendKeywords: 크롤링 원본에서 집계한 트렌드 해시태그/키워드 데이터
CREATE TABLE IF NOT EXISTS trend_keywords (
  keyword_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category TEXT NOT NULL,
  hashtag TEXT NOT NULL,
  keyword TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'mixed', 'naver')),
  search_volume INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  total_likes INTEGER DEFAULT 0,
  trend_score REAL DEFAULT 0,
  crawled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (category, hashtag, platform, DATE(crawled_at))
);

-- VideoTemplates: 사장님이 저장해둔 기획 방향성 템플릿
CREATE TABLE IF NOT EXISTS video_templates (
  template_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id BIGINT NOT NULL,
  purpose TEXT NOT NULL,
  mood TEXT NOT NULL,
  custom_keyword TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_video_templates_store FOREIGN KEY (store_id) REFERENCES store_info(store_id) ON DELETE CASCADE
);

-- GeneratedReels: AI가 만들어낸 결과 영상과 발행 상태
CREATE TABLE IF NOT EXISTS generated_reels (
  reels_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id BIGINT NOT NULL,
  template_id BIGINT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  used_hashtags TEXT,
  generation_status TEXT NOT NULL DEFAULT 'completed' CHECK (generation_status IN ('pending', 'processing', 'completed', 'failed')),
  publish_status TEXT NOT NULL DEFAULT 'not_published' CHECK (publish_status IN ('not_published', 'publishing', 'published', 'failed')),
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  CONSTRAINT fk_generated_reels_store FOREIGN KEY (store_id) REFERENCES store_info(store_id) ON DELETE CASCADE,
  CONSTRAINT fk_generated_reels_template FOREIGN KEY (template_id) REFERENCES video_templates(template_id) ON DELETE SET NULL
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_store_info_category ON store_info(category);
CREATE INDEX IF NOT EXISTS idx_store_info_created_at ON store_info(created_at);

CREATE INDEX IF NOT EXISTS idx_crawl_jobs_platform_status ON crawl_jobs(platform, status);
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_created_at ON crawl_jobs(created_at);

CREATE INDEX IF NOT EXISTS idx_raw_trend_posts_platform ON raw_trend_posts(platform);
CREATE INDEX IF NOT EXISTS idx_raw_trend_posts_crawled_at ON raw_trend_posts(crawled_at);
CREATE INDEX IF NOT EXISTS idx_raw_trend_posts_crawl_job_id ON raw_trend_posts(crawl_job_id);

CREATE INDEX IF NOT EXISTS idx_trend_keywords_category ON trend_keywords(category);
CREATE INDEX IF NOT EXISTS idx_trend_keywords_hashtag ON trend_keywords(hashtag);
CREATE INDEX IF NOT EXISTS idx_trend_keywords_score ON trend_keywords(trend_score);

CREATE INDEX IF NOT EXISTS idx_video_templates_store_id ON video_templates(store_id);
CREATE INDEX IF NOT EXISTS idx_generated_reels_store_id ON generated_reels(store_id);
CREATE INDEX IF NOT EXISTS idx_generated_reels_created_at ON generated_reels(created_at);
CREATE INDEX IF NOT EXISTS idx_generated_reels_publish_status ON generated_reels(publish_status);

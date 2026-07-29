-- Express 가 쓰던 평면 공고 표를 `legacy_posting_samples` 라는 제 이름으로 옮긴다.
-- 이 표는 `server/sql/001-postings.sql` 이 `postings` 로 만들었는데, 0001 의 정규화
-- `postings` 와 이름이 겹쳐 같은 데이터베이스에 둘 다 둘 수 없었다(CONTRACT 4장).
-- 이름을 갈라 정규화 표는 분석 경로가, 평면 표는 Express 의 폴백 조회가 각각 쓴다.

-- 평면 컬럼 `cluster_tag` 가 있는 `postings` 가 남아 있으면 그 표를 그대로 옮긴다.
-- 데이터를 잃지 않고 이름만 바꾸는 것이 목적이므로 CREATE 로 덮어쓰지 않는다.
-- 없으면 새로 만든다. 두 갈래 모두 `job_role_id` 를 갖춘 같은 모양으로 끝난다.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'postings'
       AND column_name = 'cluster_tag'
  ) THEN
    ALTER TABLE postings RENAME TO legacy_posting_samples;
  ELSE
    CREATE TABLE IF NOT EXISTS legacy_posting_samples (
      posting_id         text PRIMARY KEY,
      title              text NOT NULL,
      company            text NOT NULL,
      cluster_tag        text NOT NULL,          -- 기업군 6종
      snapshot           text NOT NULL CHECK (snapshot IN ('recent', 'prev')),
      posted_at          date,
      source             jsonb NOT NULL DEFAULT '{}',
      raw_text           text,                   -- 공고 원문. 샘플 단계에서는 null
      entry_label        text,
      edu_label          text,
      career_label       text,
      skills             jsonb NOT NULL DEFAULT '[]',
      out_of_role_tags   jsonb NOT NULL DEFAULT '[]',
      advanced_spans     jsonb NOT NULL DEFAULT '[]',
      impl_level_signals jsonb NOT NULL DEFAULT '[]',
      axis_mentions      jsonb NOT NULL DEFAULT '[]',
      reality_tags       jsonb NOT NULL DEFAULT '[]',
      created_at         timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END $$;

-- 평면 표는 백엔드 30건만 담고 있었다. 직무 축을 더해 아홉 직무의 샘플을 한 표에 둔다.
-- 기존 행은 전부 백엔드이므로 기본값이 'backend' 다. 정규화 `postings` 와 달리
-- `job_roles` 로 가는 외래키를 두지 않는다. 이 표는 분석 모집단이 아니라 폴백 조회용이다.
ALTER TABLE legacy_posting_samples
  ADD COLUMN IF NOT EXISTS job_role_id text NOT NULL DEFAULT 'backend';

-- 조회는 직무와 스냅샷으로, 화면 분해는 기업군으로 한다.
CREATE INDEX IF NOT EXISTS legacy_posting_samples_role_snapshot_idx
  ON legacy_posting_samples (job_role_id, snapshot);
CREATE INDEX IF NOT EXISTS legacy_posting_samples_cluster_idx
  ON legacy_posting_samples (cluster_tag);

-- 프로젝트 설정에서 새 표 자동 노출을 껐으므로 표마다 서버용 role 에 권한을 직접 준다.
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON TABLE legacy_posting_samples TO service_role;

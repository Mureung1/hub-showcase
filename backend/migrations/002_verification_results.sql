-- Task 4: 2단계(검증결과 생성) 저장용 테이블.
-- 가설 1건당 검증결과 1행. 재분석 시 덮어쓰기(upsert)하므로 hypothesis_id는 UNIQUE.
-- (버전 이력이 필요한 건 hypotheses의 원인/결과 수정 — hypothesis_versions가 담당하며 append-only.
--  verification_results는 AI가 매 분석마다 다시 생성하는 초안이므로 히스토리 보존 대상이 아님.)

CREATE TABLE IF NOT EXISTS verification_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hypothesis_id UUID NOT NULL UNIQUE REFERENCES hypotheses(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  direction TEXT NOT NULL,
  key_evidence TEXT NOT NULL,
  citations JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{ marker: number, evidence_tag_id: string }]
  suggested_status TEXT NOT NULL, -- 유력함 / 근거 부족 / 수정 필요
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

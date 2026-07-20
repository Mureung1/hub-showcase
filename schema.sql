-- schema.sql
-- Run this in the Supabase SQL Editor to create tables for the PM Interview Analysis Tool

-- 1. Create Projects Table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  problem_definition TEXT,
  additional_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Hypotheses Table
CREATE TABLE hypotheses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  display_index INTEGER NOT NULL,
  cause TEXT NOT NULL,
  effect TEXT NOT NULL,
  status TEXT DEFAULT '검토 전', -- 유지 / 수정 / 폐기 / 검토 전
  verification_status TEXT DEFAULT '검토 전', -- 검토 전 / 유력함 / 근거 부족 / 수정 필요
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Hypothesis Versions Table (for history)
CREATE TABLE hypothesis_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hypothesis_id UUID REFERENCES hypotheses(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  cause TEXT NOT NULL,
  effect TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Interviews Table
CREATE TABLE interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  interviewee_name TEXT,
  transcript TEXT,
  analysis_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create Evidence Tags Table
CREATE TABLE evidence_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hypothesis_id UUID REFERENCES hypotheses(id) ON DELETE CASCADE,
  interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
  quote TEXT NOT NULL,
  speaker TEXT,
  badge_label TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create Refine Chats Table
CREATE TABLE refine_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hypothesis_id UUID REFERENCES hypotheses(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user' or 'assistant'
  message TEXT,
  diff_json JSONB, -- stores { old_text: "", new_text: "" }
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create Verification Results Table (AI 2단계 검증결과. 재분석 시 upsert하므로 hypothesis_id UNIQUE)
CREATE TABLE verification_results (
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

// 연구 데이터 저장소 — Supabase 어댑터 (에이전트 c).
// store.memory.js와 동일한 함수 인터페이스(saveResult/listResults/deleteResults/countAll/listAll).
// 활성 조건: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (backend/.env, 커밋 금지).
// 테이블 정의: backend/db/schema.sql.
import { createClient } from "@supabase/supabase-js";

const TABLE = process.env.SUPABASE_TABLE || "research_results";

// service_role 키는 서버 전용(RLS 우회). 절대 프론트로 노출하지 않는다(docs/security-secrets.md).
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// 화이트리스트 필드 → 테이블 컬럼(snake_case) 매핑. 비식별 파생값만.
function toRow(entry) {
  return {
    anon_id: entry.anonId,
    mbti: entry.mbti ?? null,
    temperament: entry.temperament ?? null,
    matched_methods: entry.matchedMethods ?? null,
    baseline_methods: entry.baselineMethods ?? null,
    task_type: entry.taskType ?? null,
    deadline: entry.deadline ?? null,
    available_minutes: entry.availableMinutes ?? null,
    fit_score: entry.fitScore ?? null,
    understanding: entry.understanding ?? null,
    actionability: entry.actionability ?? null,
    focus: entry.focus ?? null,
    fatigue: entry.fatigue ?? null,
    calibration_error: entry.calibrationError ?? null,
    algorithm_version: entry.algorithmVersion ?? null,
  };
}

// 컬럼 → 앱 필드(camelCase)로 되돌린다.
function fromRow(row) {
  return {
    id: row.id,
    anonId: row.anon_id,
    mbti: row.mbti,
    temperament: row.temperament,
    matchedMethods: row.matched_methods,
    baselineMethods: row.baseline_methods,
    taskType: row.task_type,
    deadline: row.deadline,
    availableMinutes: row.available_minutes,
    fitScore: row.fit_score,
    understanding: row.understanding,
    actionability: row.actionability,
    focus: row.focus,
    fatigue: row.fatigue,
    calibrationError: row.calibration_error,
    algorithmVersion: row.algorithm_version,
    createdAt: row.created_at,
  };
}

export async function saveResult(entry) {
  const { data, error } = await supabase.from(TABLE).insert(toRow(entry)).select().single();
  if (error) {
    throw new Error(`supabase insert: ${error.message}`);
  }
  return fromRow(data);
}

export async function listResults(anonId) {
  const { data, error } = await supabase.from(TABLE).select("*").eq("anon_id", anonId);
  if (error) {
    throw new Error(`supabase select: ${error.message}`);
  }
  return (data ?? []).map(fromRow);
}

export async function deleteResults(anonId) {
  const { data, error } = await supabase.from(TABLE).delete().eq("anon_id", anonId).select("id");
  if (error) {
    throw new Error(`supabase delete: ${error.message}`);
  }
  return (data ?? []).length;
}

export async function countAll() {
  const { count, error } = await supabase.from(TABLE).select("*", { count: "exact", head: true });
  if (error) {
    throw new Error(`supabase count: ${error.message}`);
  }
  return count ?? 0;
}

export async function listAll() {
  const { data, error } = await supabase.from(TABLE).select("*");
  if (error) {
    throw new Error(`supabase select all: ${error.message}`);
  }
  return (data ?? []).map(fromRow);
}

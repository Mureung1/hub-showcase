// 연구 데이터 저장소 — in-memory 어댑터 (에이전트 c).
// SUPABASE_URL 미설정 시 기본 저장소. 재시작 시 소실(휘발성)은 정상이다.
// store.supabase.js와 동일한 함수 인터페이스를 유지한다(ADR-002).

const records = [];

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `rec-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function saveResult(entry) {
  const record = { id: newId(), ...entry, createdAt: new Date().toISOString() };
  records.push(record);
  return record;
}

export function listResults(anonId) {
  return records.filter((record) => record.anonId === anonId);
}

export function deleteResults(anonId) {
  let removed = 0;
  for (let i = records.length - 1; i >= 0; i -= 1) {
    if (records[i].anonId === anonId) {
      records.splice(i, 1);
      removed += 1;
    }
  }
  return removed;
}

export function countAll() {
  return records.length;
}

// 집계용 — 전체 레코드(비식별)를 반환한다.
export function listAll() {
  return records.slice();
}

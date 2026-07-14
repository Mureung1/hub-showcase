// 연구 데이터 저장소 (에이전트 c).
// 지금은 in-memory. 나중에 같은 함수 인터페이스로 Supabase 어댑터를 끼울 수 있게 분리한다.

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

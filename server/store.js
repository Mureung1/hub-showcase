// ─────────────────────────────────────────────────────────────
//  저장소 계층 — 이제 로컬 SQLite (db.js 의 interests 테이블).
//  함수 이름(list/add/remove)은 그대로라 index.js·화면은 안 바뀐다.
//  SQLite는 로컬 파일이라 '동기'(await 불필요) → async 가 없다.
// ─────────────────────────────────────────────────────────────
import { db } from './db.js'

// 목록 (최신순) — 여러 행이라 .all()
export function listInterests() {
  return db.prepare('SELECT * FROM interests ORDER BY id DESC').all()
}

// 추가 → 저장된 완성 행(자동 생성된 id·created_at 포함)을 반환
//
// ── 참고: 모던 대안 = RETURNING ────────────────────────────────
//  아래는 '두 스텝'(INSERT 실행 → id로 다시 SELECT)이다. 한 문장으로도 됨:
//    return db.prepare(
//      'INSERT INTO interests (company, role, jd) VALUES (?, ?, ?) RETURNING *'
//    ).get(company, role, jd ?? null)   // INSERT가 행을 뱉으므로 .run 이 아니라 .get
//  · 장점: prepare 1번·재조회 없음. 원격 DB면 네트워크 왕복 1번 절약(Supabase가 이 방식).
//  · 단점: RETURNING은 최신 SQLite(3.35+)에서만. 두 스텝이 단계가 더 드러나 학습엔 명확.
//  → 지금은 학습용으로 '두 스텝'을 쓴다. (로컬 SQLite라 속도 차이는 마이크로초, 체감 X)
// ───────────────────────────────────────────────────────────────
export function addInterest({ company, role, jd }) {
  const info = db
    .prepare('INSERT INTO interests (company, role, jd) VALUES (?, ?, ?)') // 빈칸 3개 양식지
    .run(company, role, jd ?? null) //  빈칸에 값 채워 실행 (jd 없으면 null)
  // .run 결과 info = { changes, lastInsertRowid } — 방금 자동 붙은 id 로 완성 행을 다시 읽어 반환
  return db.prepare('SELECT * FROM interests WHERE id = ?').get(info.lastInsertRowid)
}

// 삭제 → 실제로 지워졌으면 true, 없는 id 였으면 false
export function removeInterest(id) {
  const info = db.prepare('DELETE FROM interests WHERE id = ?').run(id)
  return info.changes > 0
}

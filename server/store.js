// ─────────────────────────────────────────────────────────────
//  저장소 계층 — 이제 진짜 DB(Supabase 'interests' 테이블).
//  함수 이름(list/add/remove)은 그대로라 index.js·화면은 거의 안 바뀐다.
//  단, DB 호출은 "시간이 걸리는" 비동기라 함수가 async 로 바뀐다.
// ─────────────────────────────────────────────────────────────
import { supabase } from './supabaseClient.js'

// 목록 (최신순)
export async function listInterests() {
  const { data, error } = await supabase
    .from('interests') //                interests 테이블에서
    .select('*') //                      모든 컬럼을
    .order('id', { ascending: false }) // id 큰 순 = 최신순
  if (error) throw error
  return data
}

// 추가 → 저장된 행을 돌려준다
export async function addInterest({ company, role, jd }) {
  const { data, error } = await supabase
    .from('interests')
    .insert({ company, role, jd }) // 이 값으로 새 행 삽입 (jd도 함께)
    .select() //                 삽입된 행을 되돌려받기
    .single() //                 배열 말고 객체 하나로
  if (error) throw error
  return data
}

// 삭제 → 지워졌으면 true
export async function removeInterest(id) {
  const { error, count } = await supabase
    .from('interests')
    .delete({ count: 'exact' }) // 몇 개 지웠는지 세줘
    .eq('id', id) //              id가 일치하는 행만
  if (error) throw error
  return count > 0
}

// "오늘의 순위" — 로그인 계정끼리만 비교한다(게스트는 기기 하나에 묶인 임시 식별자뿐이라 다른 사람과
// 비교할 고정된 신원이 없다). 실제 랭킹 계산은 Supabase의 get_daily_leaderboard() 함수(SECURITY DEFINER)가
// 서버(Postgres)에서 전부 수행하고, 여기서는 그 결과(등수/점수/본인 여부)만 그대로 받아온다 — 다른 사용자의
// 이름·이메일·식사 내역은 애초에 응답에 포함되지 않는다. 채점 공식은 supabase/schema.sql의 SQL 버전과
// src/lib/nutritionScore.js의 JS 버전이 동일해야 한다(게스트 전용 카드는 JS 버전을 그대로 씀).
import { supabase } from './supabase.js'

// 반환: 랭킹 배열(로그인 && 오늘 기록 있는 사용자 1명 이상) 또는 빈 배열(로그인했지만 아직 아무도 없음).
export async function getDailyLeaderboard() {
  const { data, error } = await supabase.rpc('get_daily_leaderboard')
  if (error) {
    throw new Error(error.message || '순위를 불러오지 못했습니다.')
  }
  return (data || []).map((row) => ({ rank: Number(row.rank), score: Number(row.score), isMe: row.is_me }))
}

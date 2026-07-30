// FR-15 — 듀오링고식 XP 리더보드. get_daily_leaderboard()(오늘의 영양 점수, 신원 비노출)와 달리
// get_xp_leaderboard()는 닉네임을 의도적으로 반환한다(경쟁 UI는 다른 사람 이름이 보여야 성립하므로 —
// PRD FR-15 참고, 기존 "신원 비노출" 원칙의 의도적 예외). 레벨은 SQL이 아니라 total_xp만으로 여기서
// getLevelProgress(levelSystem.js)로 계산한다(단일 소스 원칙 — SQL에 레벨 공식을 복제하지 않음).
import { getLevelProgress } from './levelSystem.js'
import { rpcWithAuthRetry } from './supabaseRpc.js'

// 반환: [{rank, nickname, totalXp, level, isMe}] (total_xp>0인 사용자만, 최대 200명)
// rpcWithAuthRetry를 쓰는 이유(토큰 갱신 레이스로 간헐적 401)는 supabaseRpc.js 헤더 주석 참고.
export async function getXpLeaderboard() {
  const { data, error } = await rpcWithAuthRetry('get_xp_leaderboard')
  if (error) {
    throw new Error(error.message || 'XP 리더보드를 불러오지 못했습니다.')
  }
  return (data || []).map((row) => ({
    rank: Number(row.rank),
    nickname: row.nickname,
    totalXp: Number(row.total_xp),
    level: getLevelProgress(Number(row.total_xp)).level,
    isMe: row.is_me,
  }))
}

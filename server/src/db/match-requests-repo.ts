import type { OnboardingProfile, SortOption } from '@hub/shared'
import { profileToMatchRequestRow } from './mappers.js'
import { MATCH_REQUESTS_TABLE, supabase } from './supabase.js'

/**
 * 매칭 요청(온보딩 조건) 저장 레포지토리.
 * best-effort — 저장 실패가 매칭 조회 응답을 막으면 안 되므로 에러를 던지지 않고 로그만 남긴다.
 */
export async function insertMatchRequest(
  profile: OnboardingProfile,
  sort: SortOption,
): Promise<void> {
  const { error } = await supabase
    .from(MATCH_REQUESTS_TABLE)
    .insert(profileToMatchRequestRow(profile, sort))

  if (error) {
    console.error('[match-requests-repo] 저장 실패 (조회 응답은 정상 진행):', error.message)
  }
}

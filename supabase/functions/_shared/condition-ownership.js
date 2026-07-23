/**
 * Discord 버튼을 누른 Beacon 사용자와 조건 소유자의 관계를 판정한다.
 * Node 테스트와 Supabase Edge Function에서 함께 사용한다.
 */
export function conditionActionAccess({ actingUserId, conditionUserId }) {
  if (!actingUserId) return "not_linked";
  return actingUserId === conditionUserId ? "allowed" : "forbidden";
}

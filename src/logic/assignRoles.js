/* 결정적 역할 배정 로직 — LLM 미사용. 같은 입력 → 같은 결과 (재현성·공정성 보장).
   점수 = 선호 1순위 +3 / 2순위 +2 / 3순위 +1
        + 경험 있음 +1
        + 기피 역할 -10
   → 팀원×역할 매트릭스에서 역할별 min/max 인원 규칙을 지키며 그리디 배정 */

/**
 * @param {Array} members - [{ id, name }]
 * @param {object} surveys - memberId → { preferences: [roleId], avoid: roleId|null,
 *                            experience: { roleId: boolean }, leader: 'yes'|'no'|'any' }
 *                            (미제출자는 "상관없음": 모든 역할 0점, 기피 없음)
 * @param {Array} roles - templates.js의 역할 정의 [{ id, name, min, max }]
 * @returns {{ byMember: object, scores: object }} memberId → [roleId] 배정 결과
 */
export function assignRoles(members, surveys, roles) {
  /* TODO(4단계): 점수 매트릭스 + 그리디 배정 구현 */
  void members;
  void surveys;
  void roles;
  throw new Error('assignRoles는 4단계에서 구현됩니다');
}

/* 결정적 역할 배정 로직 — LLM 미사용. 같은 입력 → 같은 결과 (재현성·공정성 보장).
   점수 = 선호 1순위 +3 / 2순위 +2 / 3순위 +1
        + 경험 있음 +1
        + 기피 역할 -10
        + 조장 역할 한정: 리더 의향 예 +2 / 아니오 -10 (설문의 리더 의향 문항 반영)
   → 팀원×역할 매트릭스에서 역할별 min/max 인원 규칙을 지키며 그리디 배정.
   동점은 항상 입력 순서(팀원·역할 정의 순)로 갈라 무작위성을 없앤다. */

const NEUTRAL = { preferences: [], avoid: null, experience: [], leader: 'any' };

export function buildScoreMatrix(members, surveys, roles) {
  const score = {};
  members.forEach((m) => {
    const s = surveys[m.id] ?? NEUTRAL;
    score[m.id] = {};
    roles.forEach((r) => {
      let v = 0;
      const rank = s.preferences.indexOf(r.id);
      if (rank === 0) v += 3;
      else if (rank === 1) v += 2;
      else if (rank === 2) v += 1;
      if (s.experience.includes(r.id)) v += 1;
      if (s.avoid === r.id) v -= 10;
      if (r.id === 'leader') {
        if (s.leader === 'yes') v += 2;
        else if (s.leader === 'no') v -= 10;
      }
      score[m.id][r.id] = v;
    });
  });
  return score;
}

/**
 * @param {Array} members - [{ id, name }]
 * @param {object} surveys - memberId → 설문 응답 (미제출자는 중립 처리된 상태로 들어옴)
 * @param {Array} roles - templates.js의 역할 정의 [{ id, name, min, max }]
 * @returns {{ byMember, forced, fullyAvoided, scores }}
 */
export function assignRoles(members, surveys, roles) {
  const memberIdx = new Map(members.map((m, i) => [m.id, i]));
  const roleIdx = new Map(roles.map((r, i) => [r.id, i]));
  const scores = buildScoreMatrix(members, surveys, roles);

  // 조장(리더)은 '역할'이 아니라 실무 역할 위에 얹는 표식 — 부담(load) 계산에서 제외한다.
  // 그래야 조장을 맡은 사람도 실무 역할을 하나 더 받는다.
  const leaderRoleIds = new Set(roles.filter((r) => r.isLeader).map((r) => r.id));

  const byMember = Object.fromEntries(members.map((m) => [m.id, []]));
  const count = Object.fromEntries(roles.map((r) => [r.id, 0]));
  const assign = (mId, rId) => {
    byMember[mId].push(rId);
    count[rId] += 1;
  };
  // 부담 = 맡은 실무 역할 수(조장 제외)
  const workLoad = (mId) => byMember[mId].filter((rId) => !leaderRoleIds.has(rId)).length;

  /* 1단계: 역할별 최소 인원 채우기.
     맡은 역할이 적은 팀원 우선(부담 분산) → 점수 높은 조합 우선 → 입력 순서로 동점 처리.
     인원 < 역할 수면 자연스럽게 1인 다역이 된다. */
  let guard = 0;
  while (roles.some((r) => count[r.id] < r.min) && guard++ < 100) {
    let best = null;
    roles
      .filter((r) => count[r.id] < r.min)
      .forEach((r) => {
        members.forEach((m) => {
          if (byMember[m.id].includes(r.id)) return;
          const cand = {
            m: m.id,
            r: r.id,
            load: workLoad(m.id),
            score: scores[m.id][r.id],
            mi: memberIdx.get(m.id),
            ri: roleIdx.get(r.id),
          };
          const better =
            !best ||
            cand.load < best.load ||
            (cand.load === best.load &&
              (cand.score > best.score ||
                (cand.score === best.score &&
                  (cand.mi < best.mi || (cand.mi === best.mi && cand.ri < best.ri)))));
          if (better) best = cand;
        });
      });
    if (!best) break;
    assign(best.m, best.r);
  }

  /* 2단계: 실무 역할이 없는 팀원에게 최고 점수 실무 역할 배정 (max 미달 역할 우선 → 다인 1역).
     조장만 맡은 사람도 여기서 실무 역할을 받는다. 모든 역할이 max면 초과를 허용해서라도 전원에게 준다. */
  members.forEach((m) => {
    if (workLoad(m.id) > 0) return;
    const workRoles = roles.filter((r) => !leaderRoleIds.has(r.id));
    const base = workRoles.length > 0 ? workRoles : roles;
    const open = base.filter((r) => count[r.id] < r.max);
    const pool = open.length > 0 ? open : base;
    let best = null;
    pool.forEach((r) => {
      const cand = { r: r.id, score: scores[m.id][r.id], ri: roleIdx.get(r.id) };
      if (!best || cand.score > best.score || (cand.score === best.score && cand.ri < best.ri)) {
        best = cand;
      }
    });
    assign(m.id, best.r);
  });

  /* 기피인데 배정된 경우(전원 기피 등 불가피한 상황) 기록 → 타협안 안내에 사용 */
  const forced = [];
  members.forEach((m) => {
    const avoid = surveys[m.id]?.avoid;
    if (avoid && byMember[m.id].includes(avoid)) forced.push({ memberId: m.id, roleId: avoid });
  });

  const fullyAvoided = roles
    .filter((r) => members.every((m) => surveys[m.id]?.avoid === r.id))
    .map((r) => r.id);

  return { byMember, forced, fullyAvoided, scores };
}

/* 팀 단위 통계 — AI 설명의 입력. 개인 식별 정보 없이 집계값만 담는다 */
export function computeTeamStats(members, surveys, roles, result) {
  let matchedPref = 0;
  let expMatched = 0;
  members.forEach((m) => {
    const s = surveys[m.id] ?? NEUTRAL;
    const assigned = result.byMember[m.id] ?? [];
    if (assigned.some((r) => s.preferences.includes(r))) matchedPref += 1;
    if (assigned.some((r) => s.experience.includes(r))) expMatched += 1;
  });
  const roleNames = Object.fromEntries(roles.map((r) => [r.id, r.name]));
  return {
    total: members.length,
    matchedPref,
    expMatched,
    forcedCount: result.forced.length,
    leaderVolunteer: members.some((m) => surveys[m.id]?.leader === 'yes'),
    fullyAvoidedNames: result.fullyAvoided.map((id) => roleNames[id]),
    forcedNames: [...new Set(result.forced.map((f) => roleNames[f.roleId]))],
  };
}

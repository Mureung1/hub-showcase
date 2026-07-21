const { isAdult } = require('./age');

// "이 viewer가 이 모임에 지금 신청할 수 있는가"를 판정한다. 상세(E3)와 신청(F1)이 공유하는
// 단일 진실의 원천 — 규칙이 두 곳에 흩어져 어긋나는 것을 막는다(설계 문서 결정 1).
// blockReason은 우선순위대로 첫 매칭이 이긴다: 정체성(누구인가) → 모임 상태 → 자격(성인).
//
// 시각 판정은 여기서 하지 않는다. isPast는 호출부가 DB SQL(COALESCE(end_at,start_at) < now())로
// 계산해 주입한다 — timestamp without tz를 JS Date로 다시 비교하면 목록(DB 시계)과 어긋나기 때문.
// now는 성인 나이 경계 계산(isAdult)에만 쓴다.
function evaluateApplicability({ meeting, viewer, confirmedCount, existingStatus, isPast, now = new Date() }) {
  if (!viewer) return { canApply: false, blockReason: 'LOGIN_REQUIRED' };
  if (Number(viewer.id) === Number(meeting.hostId)) return { canApply: false, blockReason: 'HOST' };

  // cancelled/rejected는 "참여 중"이 아니다. cancelled는 재신청 허용, rejected는 최종 차단.
  if (existingStatus === 'pending' || existingStatus === 'confirmed' || existingStatus === 'approved') {
    return { canApply: false, blockReason: 'ALREADY_APPLIED' };
  }
  if (existingStatus === 'rejected') return { canApply: false, blockReason: 'REJECTED' };

  if (meeting.status === 'cancelled') return { canApply: false, blockReason: 'CANCELLED_MEETING' };
  if (isPast) return { canApply: false, blockReason: 'ENDED' };

  // FULL은 flash에서만. small은 capacity가 null이라 가드 없이 비교하면 5 >= null → true로 오탐된다.
  // 캐시된 status가 아니라 실제 인원수로 판정한다.
  if (meeting.type === 'flash' && confirmedCount >= meeting.capacity) {
    return { canApply: false, blockReason: 'FULL' };
  }

  if (meeting.adultOnly) {
    const adult = isAdult(viewer.birthDate, now);
    if (adult === null) return { canApply: false, blockReason: 'BIRTHDATE_REQUIRED' };
    if (adult === false) return { canApply: false, blockReason: 'ADULT_ONLY' };
  }

  return { canApply: true, blockReason: null };
}

module.exports = { evaluateApplicability };

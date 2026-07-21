// 24시간제 소수(예: 19.5 = 19시 30분) 형태의 "지금 몇 시"를 반환한다.
function currentHour() {
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60;
}

export function isOpenNow(b, now = currentHour()) {
  if (b.openHour == null || b.closeHour == null) return null;
  return now >= b.openHour && now < b.closeHour;
}

// '곧 마감' | null — 추가기능 스펙 1번(마감임박 말풍선). "한산해요"는 실데이터에 몰리는 시간대
// 구간(시작~끝) 필드가 없어서(수집 항목이 아님) 뺐다 — 데이터가 생기면 다시 추가.
export function bakeryStatus(b, now = currentHour()) {
  if (b.closeHour == null) return null;
  if (b.closeHour - now <= 1 && b.closeHour - now > 0) return 'closing';
  return null;
}

export function statusMeta(status) {
  if (status === 'closing') return { label: '곧 마감', cls: 'closing' };
  return null;
}

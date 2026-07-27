// 24시간제 소수(예: 19.5 = 19시 30분) 형태의 "지금 몇 시"를 반환한다.
function currentHour() {
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60;
}

export function isOpenNow(b, now = currentHour()) {
  if (b.openHour == null || b.closeHour == null) return null;
  return now >= b.openHour && now < b.closeHour;
}

// '곧 마감' | '한산해요' | null — 추가기능 스펙 1번. 몰리는 시간대(busyHours)는 아직 실데이터가
// 없어서 mockBakeryExtras.js의 임시값을 쓴다(bakery.busyHours = [시작, 끝]). 두 조건이 겹치면
// 마감임박을 우선한다(스펙 문서 명시 사항).
export function bakeryStatus(b, now = currentHour()) {
  if (b.closeHour != null && b.closeHour - now <= 1 && b.closeHour - now > 0) return 'closing';
  if (b.busyHours && isOpenNow(b, now)) {
    const [busyStart, busyEnd] = b.busyHours;
    if (now < busyStart || now >= busyEnd) return 'quiet';
  }
  return null;
}

export function statusMeta(status) {
  if (status === 'closing') return { label: '곧 마감', cls: 'closing' };
  if (status === 'quiet') return { label: '한산해요', cls: 'quiet' };
  return null;
}

// lastCheck(마지막 tide check 기록)가 "오늘"(now 기준) 저장된 것인지 판단한다.
// now는 테스트에서 날짜를 고정할 수 있도록 둔 선택 인자 — 실서비스에서는 항상 현재 시각을 쓴다.
export function hasCheckedInToday(lastCheck, now = new Date()) {
  if (!lastCheck) return false;

  const created = new Date(lastCheck.created_at);
  if (Number.isNaN(created.getTime())) return false;

  return (
    created.getFullYear() === now.getFullYear() &&
    created.getMonth() === now.getMonth() &&
    created.getDate() === now.getDate()
  );
}

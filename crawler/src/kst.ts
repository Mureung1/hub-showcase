/**
 * `now`(UTC 인스턴트)를 한국 시간(KST, UTC+9) 기준 "오늘 자정"을 나타내는 Date로 변환한다.
 *
 * 크론이 실행되는 GitHub Actions 러너의 시스템 타임존은 UTC다. `now.getFullYear()` 같은
 * local-time getter를 그대로 쓰면 "오늘"이 실행 서버의 UTC 달력 날짜가 되어, KST 자정
 * 전후(00:00~09:00 KST) 구간에서 실제 한국 날짜보다 하루 뒤처진 값을 "오늘"로 오인한다
 * (이슈 #87). `getUTCFullYear()` 등 UTC getter로 KST 인스턴트의 날짜 성분을 뽑아내면 러너의
 * 시스템 타임존과 무관하게 항상 올바른 KST 달력 날짜를 얻는다.
 */
export function kstToday(now: Date): Date {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return new Date(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate())
}

// #15 "POST /api/schedule/calculate 엔드포인트" — 요청으로 들어오는 실제 달력
// 날짜(ISO 문자열)를, 계산 엔진이 쓰는 "연속 타임라인 좌표"(자정 기준 경과 시간에
// 24×dayIndex를 더한 값 — candidateSleepSegments.ts·multiDayCandidates.ts와 동일한
// 규칙)로 바꾸는 유틸. 서버가 어느 시간대에서 돌아가든 결과가 같아야 해서, Date의
// 로컬 getter(getHours 등, 서버 OS 시간대에 의존)는 안 쓰고 UTC epoch에서 KST(+9)를
// 직접 계산한다.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;

interface KstMoment {
  /** KST 기준 그 날짜 자정의 UTC epoch ms — 날짜만 비교하기 위한 키 */
  dayStartMs: number;
  /** 그날 자정 이후 지난 시간(0 이상 24 미만) */
  hourOfDay: number;
}

function toKstMoment(isoString: string): KstMoment {
  const utcMs = new Date(isoString).getTime();
  if (Number.isNaN(utcMs)) throw new Error(`유효하지 않은 날짜 형식: ${isoString}`);

  const kstMs = utcMs + KST_OFFSET_MS;
  const dayStartMs = Math.floor(kstMs / MS_PER_DAY) * MS_PER_DAY;
  const hourOfDay = (kstMs - dayStartMs) / MS_PER_HOUR;
  return { dayStartMs, hourOfDay };
}

/**
 * referenceIsoString이 속한 KST 달력 날짜를 dayIndex=0으로 두고, targetIsoString이
 * 그로부터 며칠 뒤 몇 시인지를 연속 좌표(hourOfDay + 24×dayIndex)로 변환한다.
 */
export function toContinuousCoordinate(referenceIsoString: string, targetIsoString: string): number {
  const reference = toKstMoment(referenceIsoString);
  const target = toKstMoment(targetIsoString);
  const dayIndex = Math.round((target.dayStartMs - reference.dayStartMs) / MS_PER_DAY);
  return target.hourOfDay + 24 * dayIndex;
}

/** toContinuousCoordinate의 역변환 — 연속 좌표 값을 실제 ISO 날짜 문자열로 되돌린다. */
export function fromContinuousCoordinate(referenceIsoString: string, coordinate: number): string {
  const reference = toKstMoment(referenceIsoString);
  const kstMs = reference.dayStartMs + coordinate * MS_PER_HOUR;
  const utcMs = kstMs - KST_OFFSET_MS;
  return new Date(utcMs).toISOString();
}

/** "HH:MM" 형식을 24시간제 소수 시간으로 바꾼다. 예: "23:45" -> 23.75 */
export function parseHourMinute(hhmm: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!match) throw new Error(`유효하지 않은 시각 형식(HH:MM 필요): ${hhmm}`);

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours + minutes / 60;
}

/**
 * 정보통신망법 광고 문자 발송 법적 필터 — 서버에서 강제한다.
 * (구조 원칙 2: UI 체크는 안내일 뿐, 발송 API 핸들러가 최종 강제)
 *
 * - 수신동의 필터: consent_at 있고 opt_out_at 없는 대상만
 * - (광고)·전송자명·무료수신거부 문구 삽입
 * - 야간(21:00~익일 08:00) 발송 차단 → 예약 전환
 *
 * 전부 순수 함수 — 발송 라우트(D4)와 단위테스트가 공용으로 쓴다.
 */

/** 야간 광고 발송 제한 경계 (KST). 21:00~08:00 차단. */
export const NIGHT_START_HOUR = 21;
export const NIGHT_END_HOUR = 8;

/** 모의 무료수신거부 회선 (실회선 계약은 스코프 밖 — 문구 삽입만). */
export const OPT_OUT_NUMBER = "080-123-4567";

/** 발송 대상 후보 (광고 수신 판단에 필요한 최소 필드). */
export interface Recipient {
  id: string;
  phone: string | null;
  consent_at: string | null;
  opt_out_at: string | null;
}

/**
 * 광고 수신 가능 대상만 남긴다.
 * 조건: 수신동의(consent_at) 있음 · 수신거부(opt_out_at) 없음 · 번호 있음.
 */
export function filterConsented<T extends Recipient>(recipients: T[]): T[] {
  return recipients.filter(
    (r) => r.consent_at != null && r.opt_out_at == null && !!r.phone,
  );
}

/** 광고 문자 본문에 (광고)·전송자명·무료수신거부를 삽입한다. */
export function buildAdMessage(
  copy: string,
  storeName: string,
  optOutNumber: string = OPT_OUT_NUMBER,
): string {
  return `(광고) [${storeName}]\n${copy}\n무료수신거부 ${optOutNumber}`;
}

/** 시(hour, 0~23)가 광고 발송 금지 야간대인가. */
export function isNightHour(hour: number): boolean {
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
}

/** KST 기준 시(0~23). */
export function kstHour(date: Date = new Date()): number {
  const h = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    hour12: false,
  }).format(date);
  return Number(h) % 24; // 자정이 "24"로 나오는 환경 방어
}

/** 지금(KST)이 야간이라 광고 발송을 차단해야 하는가. */
export function isNightNowKst(date: Date = new Date()): boolean {
  return isNightHour(kstHour(date));
}

/** 발송 계획 결과. */
export type SendPlan<T extends Recipient> =
  | { action: "send"; recipients: T[]; body: string }
  | { action: "schedule"; reason: "night"; recipients: T[]; body: string };

/**
 * 광고 문자 발송을 계획한다 (대상 필터 + 문구 삽입 + 야간 판정).
 * 발송 라우트(D4)는 이 결과대로 Solapi 실발송 또는 scheduled 저장한다.
 */
export function planAdSend<T extends Recipient>(params: {
  copy: string;
  storeName: string;
  recipients: T[];
  now?: Date;
  assumeNight?: boolean;
}): SendPlan<T> {
  const recipients = filterConsented(params.recipients);
  const body = buildAdMessage(params.copy, params.storeName);
  const night = params.assumeNight ?? isNightNowKst(params.now);
  return night
    ? { action: "schedule", reason: "night", recipients, body }
    : { action: "send", recipients, body };
}

import { createHmac, randomBytes } from "node:crypto";

/**
 * Solapi 문자 발송 (v4 REST, HMAC-SHA256 인증). SDK 대신 내장 crypto+fetch로 직접 호출.
 *
 * 키(SOLAPI_API_KEY/SECRET/SENDER)가 없으면 dry-run으로 동작한다:
 * 실제 발송 대신 로그만 남기고 가짜 messageId를 돌려준다.
 * → 테스트·개발·데모에서 실문자·과금 없이 흐름을 확인할 수 있다.
 * (테스트 원칙: 실발송 대상은 본인 번호만 — 더미 단골 실발송 금지)
 */

const API_KEY = process.env.SOLAPI_API_KEY;
const API_SECRET = process.env.SOLAPI_API_SECRET;
const SENDER = process.env.SOLAPI_SENDER;
const SOLAPI_URL = "https://api.solapi.com/messages/v4/send";

/** 실발송 가능 여부 (키·발신번호가 모두 있을 때만). */
export const SMS_LIVE: boolean = Boolean(API_KEY && API_SECRET && SENDER);

export interface SmsResult {
  ok: boolean;
  /** true면 실제 발송, false면 dry-run(로그만). */
  live: boolean;
  messageId: string;
  to: string;
}

function authHeader(): string {
  const date = new Date().toISOString();
  const salt = randomBytes(32).toString("hex");
  const signature = createHmac("sha256", API_SECRET as string)
    .update(date + salt)
    .digest("hex");
  return `HMAC-SHA256 apiKey=${API_KEY}, date=${date}, salt=${salt}, signature=${signature}`;
}

/**
 * 문자 1건 발송(또는 dry-run).
 * subject를 주면 LMS 제목으로 명시 — 안 주면 Solapi가 본문 앞부분을 잘라 자동 제목으로 넣어
 * 첫 줄이 중복돼 보인다. 장문(광고) 발송 시엔 반드시 subject를 넘긴다.
 */
export async function sendSms(to: string, text: string, subject?: string): Promise<SmsResult> {
  if (!SMS_LIVE) {
    console.log(
      `[sms:dry-run] → ${to || "(수신번호 미설정)"}${subject ? ` [제목:${subject}]` : ""}\n${text}`,
    );
    return { ok: true, live: false, messageId: `dry-${Date.now()}`, to };
  }
  const message: { to: string; from: string; text: string; subject?: string; type?: string } = {
    to,
    from: SENDER as string,
    text,
  };
  if (subject) {
    message.subject = subject;
    message.type = "LMS";
  }
  const res = await fetch(SOLAPI_URL, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    messageId?: string;
    errorMessage?: string;
  };
  if (!res.ok) {
    throw new Error(`Solapi 발송 실패 (${res.status}): ${data.errorMessage ?? "unknown"}`);
  }
  return { ok: true, live: true, messageId: data.messageId ?? "", to };
}

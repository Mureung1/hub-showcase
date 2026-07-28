// #34: DB에 저장된 구독 정보(#32)로 실제 Web Push를 발송한다.
// 레벨 상승 로직(#35)이 이 함수를 직접 import해서 호출할 예정이라 라우트로 두지 않는다.
import webpush, { WebPushError } from "web-push";
import { prisma } from "../db/client.js";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT ?? "",
  process.env.VAPID_PUBLIC_KEY ?? "",
  process.env.VAPID_PRIVATE_KEY ?? "",
);

export interface SendPushPayload {
  title: string;
  body: string;
}

// #58: 재시도는 하지 않되(응답 지연 트레이드오프 때문에 스코프 제외), 실패 성격을
// 구분해 로그 가시성을 확보한다.
// - permanent: 410/404 — 구독 자체가 더 이상 유효하지 않음(broadcastPush가 삭제 처리)
// - config: 401/403 — VAPID 설정 문제, 재시도해도 의미 없음
// - rate_limited: 429 — 푸시 서비스 쪽 rate limit
// - temporary: 5xx 또는 statusCode 없는 예외(네트워크 오류 등) — 다시 시도하면 성공할 수 있는 실패
// - unknown: 그 외 statusCode
export type PushFailureClassification =
  | "permanent"
  | "config"
  | "rate_limited"
  | "temporary"
  | "unknown";

export type SendPushResult =
  | { ok: true }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
        statusCode?: number;
        classification: PushFailureClassification;
      };
    };

function classifyPushFailure(statusCode: number | undefined): PushFailureClassification {
  if (statusCode === undefined) return "temporary";
  if (statusCode === 410 || statusCode === 404) return "permanent";
  if (statusCode === 401 || statusCode === 403) return "config";
  if (statusCode === 429) return "rate_limited";
  if (statusCode >= 500) return "temporary";
  return "unknown";
}

export async function sendPush(
  subscriptionId: string,
  payload: SendPushPayload,
): Promise<SendPushResult> {
  const subscription = await prisma.pushSubscription.findUnique({
    where: { id: subscriptionId },
  });

  if (!subscription) {
    return {
      ok: false,
      error: {
        code: "subscription_not_found",
        message: "구독 정보를 찾을 수 없습니다.",
        classification: "permanent",
      },
    };
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
    );
    return { ok: true };
  } catch (err) {
    // 만료/무효화된 구독이면 web-push가 WebPushError(statusCode 401/404/410 등)를 던진다 —
    // 호출부(#35)가 이 statusCode로 구독 삭제 여부 등을 판단할 수 있게 그대로 넘긴다.
    if (err instanceof WebPushError) {
      return {
        ok: false,
        error: {
          code: "push_failed",
          message: err.message,
          statusCode: err.statusCode,
          classification: classifyPushFailure(err.statusCode),
        },
      };
    }
    return {
      ok: false,
      error: {
        code: "push_failed",
        message: err instanceof Error ? err.message : "발송에 실패했습니다.",
        classification: "temporary",
      },
    };
  }
}

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

export type SendPushResult =
  | { ok: true }
  | { ok: false; error: { code: string; message: string; statusCode?: number } };

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
      error: { code: "subscription_not_found", message: "구독 정보를 찾을 수 없습니다." },
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
        error: { code: "push_failed", message: err.message, statusCode: err.statusCode },
      };
    }
    return {
      ok: false,
      error: {
        code: "push_failed",
        message: err instanceof Error ? err.message : "발송에 실패했습니다.",
      },
    };
  }
}

// #35: 레벨이 실제로 오른 순간, DB에 저장된 모든 구독(#32)에 베스트에포트로 발송한다.
// task↔subscription 관계가 스키마에 없는 단일 사용자 프로토타입이라 브로드캐스트로 처리—
// 사용자가 여러 탭/디바이스에서 구독했을 수 있으므로 전체에 알린다.
import { prisma } from "../db/client.js";
import { sendPush } from "./sendPush.js";
import type { Task } from "@prisma/client";

// 호출부(tasks.ts)의 이벤트 응답(res.json)에 영향을 주면 안 되므로 절대 throw하지 않는다 —
// 발송 실패/구독 0개는 그냥 로그만 남기고 조용히 끝난다.
export async function broadcastLevelUpPush(task: Task): Promise<void> {
  const subscriptions = await prisma.pushSubscription.findMany();
  if (subscriptions.length === 0) return;

  const payload = {
    title: "잔소리봇",
    body: `"${task.title}" 아직 시작 못 하셨어요! (Lv.${task.level})`,
  };

  const results = await Promise.allSettled(
    subscriptions.map((subscription) => sendPush(subscription.id, payload)),
  );

  for (const [index, result] of results.entries()) {
    if (result.status === "rejected") {
      console.error("[broadcastLevelUpPush] sendPush 호출 자체가 실패했습니다:", result.reason);
      continue;
    }
    if (result.value.ok) continue;

    // #58: 재시도는 하지 않는다(응답 지연 트레이드오프 때문에 스코프 제외) — 대신
    // classification으로 일시적/영구/설정 문제 실패를 구분해 로그에서 바로 원인을 알 수 있게 한다.
    console.error(
      `[broadcastLevelUpPush] 발송 실패(classification=${result.value.error.classification}):`,
      result.value.error,
    );

    // 410(Gone)/404(Not Found)는 푸시 서비스가 이 구독을 더 이상 인정하지 않는다는
    // 뜻이라 영구적으로 무효하다 — 다음 발송에서 같은 실패가 반복되지 않도록 지운다.
    // 401/403(VAPID 설정 문제)·429(rate limit) 등은 구독 자체 문제가 아니라서 그대로 둔다.
    const statusCode = result.value.error.statusCode;
    if (statusCode === 410 || statusCode === 404) {
      const subscriptionId = subscriptions[index].id;
      try {
        await prisma.pushSubscription.delete({ where: { id: subscriptionId } });
      } catch (deleteErr) {
        // 동시에 다른 브로드캐스트가 이미 지웠을 수 있음(P2025) — 발송 실패와 같은
        // 원칙으로, 삭제 실패도 레벨업 이벤트 응답에 영향 주지 않고 로그만 남긴다.
        console.error(
          "[broadcastLevelUpPush] 만료 구독 삭제 실패:",
          subscriptionId,
          deleteErr,
        );
      }
    }
  }
}

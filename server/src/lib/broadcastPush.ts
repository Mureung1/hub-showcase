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

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[broadcastLevelUpPush] sendPush 호출 자체가 실패했습니다:", result.reason);
    } else if (!result.value.ok) {
      console.error("[broadcastLevelUpPush] 발송 실패:", result.value.error);
    }
  }
}

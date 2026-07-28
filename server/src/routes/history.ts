import { Router } from "express";
import { prisma } from "../db/client.js";

const router = Router();

// History 화면은 "완료된 것만"을 done 이벤트 기준으로 조회한다 — Task.status로
// 필터링하지 않는 이유는 done 이벤트 자체가 완료의 유일한 근거이기 때문(#STEP2).
// waiting/active는 done 이벤트가 없으므로 자연히 제외된다.
router.get("/", async (_req, res) => {
  try {
    const events = await prisma.taskEvent.findMany({
      where: { eventType: "done" },
      orderBy: { occurredAt: "desc" },
      include: { task: { select: { title: true } } },
    });

    // 완료 시점의 회피 이유를 붙인다. AvoidanceReason은 완료 후 리셋되지 않는
    // append-only 로그라(재확인 UI는 status: active일 때만 뜸), taskId별로 한 번에
    // 조회한 뒤 completedAt(occurredAt) 이전 중 가장 최근 것만 골라 매칭한다
    // (event마다 따로 조회하지 않아 N+1을 피한다).
    const taskIds = [...new Set(events.map((event) => event.taskId))];
    const reasons = await prisma.avoidanceReason.findMany({
      where: { taskId: { in: taskIds } },
      orderBy: { createdAt: "asc" },
    });
    const reasonsByTask = new Map<string, typeof reasons>();
    for (const reason of reasons) {
      const list = reasonsByTask.get(reason.taskId) ?? [];
      list.push(reason);
      reasonsByTask.set(reason.taskId, list);
    }
    function reasonAsOf(taskId: string, at: Date) {
      const list = reasonsByTask.get(taskId) ?? [];
      let latest: (typeof list)[number] | null = null;
      for (const candidate of list) {
        if (candidate.createdAt > at) break; // createdAt asc로 정렬돼 있어 이후는 볼 필요 없음
        latest = candidate;
      }
      return latest;
    }

    const data = events.map((event) => {
      const reason = reasonAsOf(event.taskId, event.occurredAt);
      return {
        taskId: event.taskId,
        title: event.task.title,
        completedAt: event.occurredAt,
        durationSeconds: event.durationSeconds,
        entryLevel: event.entryLevel,
        microTask: event.microTask,
        entryMode:
          event.entryMode ??
          (event.entryLevel !== null ? "intervention" : "unknown"),
        generationSource:
          event.generationSource ??
          (event.microTask !== null ? "unknown" : "none"),
        memoryEvidence: event.memoryEvidence,
        reason: reason?.reason ?? null,
        customReasonText: reason?.customText ?? null,
      };
    });

    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: { code: "internal_error", message: "히스토리를 불러오지 못했습니다." },
    });
  }
});

export default router;

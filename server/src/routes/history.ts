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

    const data = events.map((event) => ({
      taskId: event.taskId,
      title: event.task.title,
      completedAt: event.occurredAt,
      durationSeconds: event.durationSeconds,
      entryLevel: event.entryLevel,
      microTask: event.microTask,
    }));

    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: { code: "internal_error", message: "히스토리를 불러오지 못했습니다." },
    });
  }
});

export default router;

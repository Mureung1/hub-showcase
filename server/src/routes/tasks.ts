import { Router } from "express";
import { prisma } from "../db/client.js";
import { calculateLevel } from "../lib/scoring.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const tasks = await prisma.task.findMany();
    res.json({ data: tasks });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: { code: "internal_error", message: "할일 목록을 불러오지 못했습니다." },
    });
  }
});

router.post("/", async (req, res) => {
  const { title, type, startTime, deadline, reason, customText } = req.body;

  try {
    const task = await prisma.$transaction(async (tx) => {
      const createdTask = await tx.task.create({
        data: {
          title,
          type,
          startTime: new Date(startTime),
          deadline: new Date(deadline),
          status: "waiting",
        },
      });

      await tx.avoidanceReason.create({
        data: {
          taskId: createdTask.id,
          reason,
          customText: customText ?? null,
          level: null, // 최초 등록
        },
      });

      return createdTask;
    });

    res.json({ data: task });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: { code: "internal_error", message: "할일을 저장하지 못했습니다." },
    });
  }
});

router.post("/:id/events", async (req, res) => {
  const { id } = req.params;
  const { eventType } = req.body;

  try {
    // 클라이언트의 폴링 tick이 삭제와 경합할 수 있다(삭제 직전에 이미 전송된 요청).
    // 존재 확인을 트랜잭션 밖에서 먼저 해 404로 조용히 끝내고, 고아 taskEvent가
    // 생기거나 500으로 새지 않게 한다.
    const exists = await prisma.task.findUnique({ where: { id } });
    if (!exists) {
      res.status(404).json({
        error: { code: "not_found", message: "할일을 찾을 수 없습니다." },
      });
      return;
    }

    const task = await prisma.$transaction(async (tx) => {
      const currentTask = await tx.task.findUniqueOrThrow({ where: { id } });

      await tx.taskEvent.create({
        data: {
          taskId: id,
          eventType,
          occurredAt: new Date(),
        },
      });

      if (eventType === "done") {
        const wasFirstTry = currentTask.skipCount === 0;

        await tx.appState.upsert({
          where: { id: "singleton" },
          create: { id: "singleton", streak: wasFirstTry ? 1 : 0 },
          update: { streak: wasFirstTry ? { increment: 1 } : 0 },
        });

        return tx.task.update({
          where: { id },
          data: { status: "done", skipCount: 0, level: 0 },
        });
      }

      if (eventType === "stopped") {
        const nextSkipCount = Math.max(0, Math.floor(currentTask.skipCount / 2));

        return tx.task.update({
          where: { id },
          data: { skipCount: nextSkipCount, level: calculateLevel(nextSkipCount) },
        });
      }

      // 무응답 tick: 시작 예정 시각이 지났는데 사용자가 반응하지 않은 채
      // 한 주기(클라이언트의 NUDGE_TICK_MS)가 지나면 봇이 다시 압박한다.
      // active 상태가 아니면(완료/대기) 무시 — 완료된 할일이 되살아나지 않도록 방어.
      if (eventType === "notification_sent") {
        if (currentTask.status !== "active") return currentTask;

        const nextSkipCount = currentTask.skipCount + 1;
        const nextLevel = calculateLevel(nextSkipCount);

        // 레벨이 실제로 오른 순간만 level_up 이벤트를 추가로 남긴다(스키마 문서화 어휘).
        if (nextLevel > currentTask.level) {
          await tx.taskEvent.create({
            data: { taskId: id, eventType: "level_up", occurredAt: new Date() },
          });
        }

        return tx.task.update({
          where: { id },
          data: { skipCount: nextSkipCount, level: nextLevel },
        });
      }

      // 시작 예정 시각 도달: 대기중 할일을 활성화한다. 이미 active/done이면 무시.
      if (eventType === "activated") {
        if (currentTask.status !== "waiting") return currentTask;

        return tx.task.update({
          where: { id },
          data: { status: "active" },
        });
      }

      return currentTask;
    });

    res.json({ data: task });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: { code: "internal_error", message: "이벤트를 저장하지 못했습니다." },
    });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await prisma.task.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({
        error: { code: "not_found", message: "할일을 찾을 수 없습니다." },
      });
      return;
    }

    await prisma.$transaction([
      prisma.avoidanceReason.deleteMany({ where: { taskId: id } }),
      prisma.taskEvent.deleteMany({ where: { taskId: id } }),
      prisma.task.delete({ where: { id } }),
    ]);

    res.json({ data: { id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: { code: "internal_error", message: "할일을 삭제하지 못했습니다." },
    });
  }
});

export default router;

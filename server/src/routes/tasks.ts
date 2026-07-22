import { Router } from "express";
import type { Task } from "@prisma/client";
import { prisma } from "../db/client.js";
import { calculateLevel } from "../lib/scoring.js";
import { getCurrentReason } from "../db/avoidanceReasons.js";
import { broadcastLevelUpPush } from "../lib/broadcastPush.js";

const router = Router();

// task 응답에 최신 회피 이유를 얹는다. 목록 조회는 avoidanceReasons를 한 번에
// include해서 N+1을 피하고, 단건 응답(POST 계열)은 getCurrentReason 하나만 부른다 —
// 두 경로가 항상 같은 모양(reason/customReasonText)을 반환해야 nudgeMessages.js의
// Lv2 빌더가 어느 응답으로 갱신된 task를 받아도 동일하게 동작한다.
function withReason(
  task: Task,
  reason: { reason: string; customText: string | null } | null,
) {
  return {
    ...task,
    reason: reason?.reason ?? null,
    customReasonText: reason?.customText ?? null,
  };
}

router.get("/", async (_req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      include: {
        // Lv1/Lv3 재확인이나 최초 등록으로 쌓인 회피 이유 중 가장 최근 것만 필요하다
        // (nudgeMessages.js의 Lv2 빌더가 이 값으로 getMicrotask를 호출한다).
        avoidanceReasons: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    const data = tasks.map(({ avoidanceReasons, ...task }) =>
      withReason(task, avoidanceReasons[0] ?? null),
    );
    res.json({ data });
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

    // 트랜잭션 콜백 안에서 계산되지만, 실제 발송(send-push, 외부 네트워크 I/O)은
    // 커밋 이후에 한다 — 트랜잭션 안에서 네트워크 왕복을 기다리면 pooled DB 커넥션을
    // 그만큼 붙잡아두게 된다(#35).
    let leveledUp = false;

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
          leveledUp = true;
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

    // 레벨 상승은 "지금 이 순간" 이벤트라 배치 스캔을 거치지 않고 바로 발송한다(#35).
    // 실패해도 이벤트 API 응답 자체는 정상적으로 나가야 하므로 await하되 catch로 삼킨다 —
    // Vercel 서버리스 환경에서 fire-and-forget하면 응답 직후 함수가 얼어붙어 발송이
    // 끝나기 전에 중단될 수 있다.
    if (leveledUp) {
      await broadcastLevelUpPush(task).catch((err) => {
        console.error("[POST /:id/events] broadcastLevelUpPush 실패:", err);
      });
    }

    const reason = await getCurrentReason(id);
    res.json({ data: withReason(task, reason) });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: { code: "internal_error", message: "이벤트를 저장하지 못했습니다." },
    });
  }
});

// 회피 이유 재확인(#21 ReasonCheckpoint)에서 사용자가 새로 고른 이유를 저장한다.
// 최초 등록(level=null)과 달리 재확인은 레벨 1 또는 3 시점에만 일어나므로 level을
// 함께 기록한다 — 이후 Lv3 기억 기반 개입이 getCurrentReason으로 최신 이유를 참조한다.
const RECONFIRM_LEVELS = [1, 3];
const VALID_REASONS = ["overwhelm", "dislike", "temptation", "custom"];

router.post("/:id/avoidance-reasons", async (req, res) => {
  const { id } = req.params;
  const { level, reason, customText } = req.body;

  if (!RECONFIRM_LEVELS.includes(level)) {
    res.status(400).json({
      error: { code: "invalid_level", message: "재확인 레벨은 1 또는 3이어야 합니다." },
    });
    return;
  }

  if (!VALID_REASONS.includes(reason)) {
    res.status(400).json({
      error: { code: "invalid_reason", message: "유효하지 않은 회피 이유입니다." },
    });
    return;
  }

  try {
    // 삭제와 경합할 수 있으므로(events 라우트와 동일) 존재 확인을 먼저 해 404로 끝낸다.
    const exists = await prisma.task.findUnique({ where: { id } });
    if (!exists) {
      res.status(404).json({
        error: { code: "not_found", message: "할일을 찾을 수 없습니다." },
      });
      return;
    }

    const created = await prisma.avoidanceReason.create({
      data: {
        taskId: id,
        reason,
        customText: customText ?? null,
        level,
      },
    });

    res.json({ data: created });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: { code: "internal_error", message: "회피 이유를 저장하지 못했습니다." },
    });
  }
});

// 완료 직후 개입이 도움됐는지에 대한 피드백(#39 FeedbackButtons)을 저장한다(#40).
const VALID_FEEDBACK_RESPONSES = ["helpful", "annoying"];

router.post("/:id/feedbacks", async (req, res) => {
  const { id } = req.params;
  const { response } = req.body;

  if (!VALID_FEEDBACK_RESPONSES.includes(response)) {
    res.status(400).json({
      error: { code: "invalid_response", message: "유효하지 않은 피드백 응답입니다." },
    });
    return;
  }

  try {
    // 삭제와 경합할 수 있으므로(다른 하위 리소스 라우트와 동일) 존재 확인을 먼저 해 404로 끝낸다.
    const exists = await prisma.task.findUnique({ where: { id } });
    if (!exists) {
      res.status(404).json({
        error: { code: "not_found", message: "할일을 찾을 수 없습니다." },
      });
      return;
    }

    const created = await prisma.feedback.create({
      data: { taskId: id, response },
    });

    res.json({ data: created });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: { code: "internal_error", message: "피드백을 저장하지 못했습니다." },
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
      prisma.feedback.deleteMany({ where: { taskId: id } }),
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

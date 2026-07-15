import { Router } from "express";
import { prisma } from "../db/client.js";

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

export default router;

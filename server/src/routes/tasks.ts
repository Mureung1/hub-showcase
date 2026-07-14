import { Router } from "express";

const router = Router();

const MOCK_TASKS = [
  {
    id: "mock-1",
    title: "알고리즘 과제 제출",
    type: "assignment",
    startTime: "2026-07-14T01:00:00.000Z",
    deadline: "2026-07-16T15:00:00.000Z",
    reason: "unclear_start",
    customText: null,
    status: "waiting",
    skipCount: 0,
    level: 0,
  },
  {
    id: "mock-2",
    title: "발표 자료 준비",
    type: "presentation",
    startTime: "2026-07-14T05:00:00.000Z",
    deadline: "2026-07-15T09:00:00.000Z",
    reason: "dont_want_to",
    customText: null,
    status: "active",
    skipCount: 2,
    level: 2,
  },
  {
    id: "mock-3",
    title: "조별과제 회의록 정리",
    type: "team_project",
    startTime: "2026-07-13T06:00:00.000Z",
    deadline: "2026-07-14T12:00:00.000Z",
    reason: "want_to_play",
    customText: null,
    status: "done",
    skipCount: 1,
    level: 0,
  },
  {
    id: "mock-4",
    title: "시험공부 1과목",
    type: "exam_study",
    startTime: "2026-07-14T09:00:00.000Z",
    deadline: "2026-07-20T00:00:00.000Z",
    reason: "custom",
    customText: "책상 정리부터 해야 할 것 같음",
    status: "active",
    skipCount: 0,
    level: 1,
  },
];

router.get("/", (_req, res) => {
  res.json({ data: MOCK_TASKS });
});

router.post("/", (req, res) => {
  const { title, type, startTime, deadline, reason, customText } = req.body;

  res.json({
    data: {
      id: `mock-${Date.now()}`,
      title,
      type,
      startTime,
      deadline,
      reason,
      customText,
      status: "waiting",
      skipCount: 0,
      level: 0,
    },
  });
});

export default router;

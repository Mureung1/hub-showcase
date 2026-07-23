import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../db/client.js";
import { broadcastLevelUpPush } from "../lib/broadcastPush.js";

// #35: 실제 발송(webpush → FCM)까지 통합 테스트에서 태우지 않도록 모킹한다.
// broadcastLevelUpPush 자체의 동작(구독 조회, 병렬 발송, 실패 무시)은 sendPush.test.ts에서
// 이미 검증됐으므로, 여기서는 "레벨 상승 시 호출되는지" / "실패해도 API 응답에 영향 없는지"만 본다.
vi.mock("../lib/broadcastPush.js", () => ({
  broadcastLevelUpPush: vi.fn().mockResolvedValue(undefined),
}));

// test-writer Skill의 통합 테스트 안전장치: DB 가드 + prefix + teardown.
// 자세한 근거는 .claude/skills/test-writer/SKILL.md 5절 참고.
//
// 가드는 두 상황을 구분한다:
// - DATABASE_URL이 아예 없음(= server/.env.test를 아직 안 만듦) → 위험하지 않으므로
//   조용히 건너뛴다(경고만 출력). 이 상태를 실패로 취급하면 test:server가 항상
//   빨갛게 떠서 실제 회귀와 "아직 설정 안 함"을 구분할 수 없게 된다.
// - DATABASE_URL이 있는데 "test" 식별자가 없음 → 개발/운영 DB일 가능성이 높은
//   위험한 상황이므로 즉시 throw해 테스트 파일 로드 자체를 막는다.
const TEST_PREFIX = "test_";
const uniqueTitle = () =>
  `${TEST_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const databaseUrl = process.env.DATABASE_URL ?? "";
const isTestDb = /test/i.test(databaseUrl);

if (databaseUrl && !isTestDb) {
  throw new Error(
    "DATABASE_URL이 테스트용 Supabase 프로젝트를 가리키지 않습니다. " +
      "개발/운영 DB에 테스트 데이터가 쓰이는 걸 막기 위해 실행을 중단합니다. " +
      "server/.env.test.example을 참고해 server/.env.test의 DATABASE_URL을 설정하세요.",
  );
}

if (!isTestDb) {
  console.warn(
    "[tasks.test.ts] server/.env.test에 테스트용 DATABASE_URL이 없어 통합 테스트를 건너뜁니다.",
  );
}

async function createTestTask() {
  const res = await request(app)
    .post("/api/tasks")
    .send({
      title: uniqueTitle(),
      type: "개인공부",
      startTime: new Date().toISOString(),
      deadline: new Date(Date.now() + 86400000).toISOString(),
      reason: "overwhelm",
    });
  return res.body.data;
}

describe.skipIf(!isTestDb)("GET /api/tasks", () => {
  afterEach(async () => {
    const testTasks = await prisma.task.findMany({
      where: { title: { startsWith: TEST_PREFIX } },
    });
    const ids = testTasks.map((t) => t.id);
    if (ids.length === 0) return;

    await prisma.$transaction([
      prisma.avoidanceReason.deleteMany({ where: { taskId: { in: ids } } }),
      prisma.taskEvent.deleteMany({ where: { taskId: { in: ids } } }),
      prisma.task.deleteMany({ where: { id: { in: ids } } }),
    ]);
  });

  it("최초 등록된 회피 이유를 reason 필드로 함께 반환한다 (happy path)", async () => {
    const created = await createTestTask();

    const res = await request(app).get("/api/tasks");

    expect(res.status).toBe(200);
    const task = res.body.data.find((t: { id: string }) => t.id === created.id);
    expect(task.reason).toBe("overwhelm");
    expect(task.avoidanceReasons).toBeUndefined();
  });

  it("재확인으로 회피 이유가 갱신되면 가장 최근 것을 reason으로 반환한다 (happy path)", async () => {
    const created = await createTestTask();
    await request(app)
      .post(`/api/tasks/${created.id}/avoidance-reasons`)
      .send({ level: 1, reason: "temptation", customText: null });

    const res = await request(app).get("/api/tasks");

    const task = res.body.data.find((t: { id: string }) => t.id === created.id);
    expect(task.reason).toBe("temptation");
  });
});

describe.skipIf(!isTestDb)("POST /api/tasks/:id/events", () => {
  beforeEach(() => {
    vi.mocked(broadcastLevelUpPush).mockClear();
  });

  afterEach(async () => {
    const testTasks = await prisma.task.findMany({
      where: { title: { startsWith: TEST_PREFIX } },
    });
    const ids = testTasks.map((t) => t.id);
    if (ids.length === 0) return;

    await prisma.$transaction([
      prisma.avoidanceReason.deleteMany({ where: { taskId: { in: ids } } }),
      prisma.taskEvent.deleteMany({ where: { taskId: { in: ids } } }),
      prisma.task.deleteMany({ where: { id: { in: ids } } }),
    ]);
  });

  it("이벤트 처리 후에도 reason 필드가 유지된다 — GET과 응답 모양이 어긋나면 안 된다 (회귀)", async () => {
    // 프론트(HomePage.jsx)는 매 tick마다 이 응답으로 tasks 상태 전체를 덮어쓴다.
    // 여기서 reason이 빠지면 Lv2 마이크로태스크가 항상 커스텀 폴백으로만 떨어진다.
    const created = await createTestTask();
    await request(app)
      .post(`/api/tasks/${created.id}/events`)
      .send({ eventType: "activated" });

    const res = await request(app)
      .post(`/api/tasks/${created.id}/events`)
      .send({ eventType: "notification_sent" });

    expect(res.status).toBe(200);
    expect(res.body.data.reason).toBe("overwhelm");
    expect(res.body.data.skipCount).toBe(1);
  });

  it("레벨이 실제로 오르면 broadcastLevelUpPush를 호출한다 (happy path)", async () => {
    const created = await createTestTask();
    await request(app)
      .post(`/api/tasks/${created.id}/events`)
      .send({ eventType: "activated" });

    // calculateLevel(skipCount)은 skipCount를 그대로 레벨로 쓰므로(scoring.ts), 첫 tick에서
    // 바로 0 → 1로 오른다.
    const res = await request(app)
      .post(`/api/tasks/${created.id}/events`)
      .send({ eventType: "notification_sent" });

    expect(res.status).toBe(200);
    expect(res.body.data.level).toBe(1);
    expect(broadcastLevelUpPush).toHaveBeenCalledTimes(1);
    expect(broadcastLevelUpPush).toHaveBeenCalledWith(
      expect.objectContaining({ id: created.id, level: 1 }),
    );
  });

  it("레벨이 오르지 않으면(비활성 task에 tick) broadcastLevelUpPush를 호출하지 않는다 (경계)", async () => {
    // activated를 보내지 않아 status가 waiting인 채로 notification_sent를 보내면
    // "active 아니면 무시" 분기(tasks.ts)로 빠져 레벨 자체가 안 오른다.
    const created = await createTestTask();

    const res = await request(app)
      .post(`/api/tasks/${created.id}/events`)
      .send({ eventType: "notification_sent" });

    expect(res.status).toBe(200);
    expect(broadcastLevelUpPush).not.toHaveBeenCalled();
  });

  it("broadcastLevelUpPush가 실패해도 이벤트 API 응답은 200을 유지한다 (실패 격리)", async () => {
    vi.mocked(broadcastLevelUpPush).mockRejectedValueOnce(new Error("발송 실패"));
    const created = await createTestTask();
    await request(app)
      .post(`/api/tasks/${created.id}/events`)
      .send({ eventType: "activated" });

    const res = await request(app)
      .post(`/api/tasks/${created.id}/events`)
      .send({ eventType: "notification_sent" });

    expect(res.status).toBe(200);
    expect(res.body.data.level).toBe(1);
  });
});

describe.skipIf(!isTestDb)("POST /api/tasks/:id/events — done 완료 스냅샷(#STEP2)", () => {
  afterEach(async () => {
    const testTasks = await prisma.task.findMany({
      where: { title: { startsWith: TEST_PREFIX } },
    });
    const ids = testTasks.map((t) => t.id);
    if (ids.length === 0) return;

    await prisma.$transaction([
      prisma.avoidanceReason.deleteMany({ where: { taskId: { in: ids } } }),
      prisma.taskEvent.deleteMany({ where: { taskId: { in: ids } } }),
      prisma.task.deleteMany({ where: { id: { in: ids } } }),
    ]);
  });

  it("durationSeconds/entryLevel/microTask를 함께 보내면 done TaskEvent에 스냅샷으로 저장된다 (happy path)", async () => {
    const task = await createTestTask();

    const res = await request(app)
      .post(`/api/tasks/${task.id}/events`)
      .send({
        eventType: "done",
        durationSeconds: 125,
        entryLevel: 2,
        microTask: "할 일 목록에 첫 항목 하나만 적어보기",
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("done");

    const event = await prisma.taskEvent.findFirst({
      where: { taskId: task.id, eventType: "done" },
    });
    expect(event?.durationSeconds).toBe(125);
    expect(event?.entryLevel).toBe(2);
    expect(event?.microTask).toBe("할 일 목록에 첫 항목 하나만 적어보기");
  });

  it("세 값 없이 보내도(카드 직접 클릭 경로) 기존처럼 완료 처리되고 세 필드는 null로 저장된다 (회귀)", async () => {
    const task = await createTestTask();

    const res = await request(app)
      .post(`/api/tasks/${task.id}/events`)
      .send({ eventType: "done" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("done");

    const event = await prisma.taskEvent.findFirst({
      where: { taskId: task.id, eventType: "done" },
    });
    expect(event?.durationSeconds).toBeNull();
    expect(event?.entryLevel).toBeNull();
    expect(event?.microTask).toBeNull();
  });

  it("microTask가 빈 문자열이면 null로 저장된다 (경계)", async () => {
    const task = await createTestTask();

    await request(app)
      .post(`/api/tasks/${task.id}/events`)
      .send({ eventType: "done", microTask: "" });

    const event = await prisma.taskEvent.findFirst({
      where: { taskId: task.id, eventType: "done" },
    });
    expect(event?.microTask).toBeNull();
  });

  it("durationSeconds가 음수면 400 invalid_duration을 반환한다 (경계)", async () => {
    const task = await createTestTask();

    const res = await request(app)
      .post(`/api/tasks/${task.id}/events`)
      .send({ eventType: "done", durationSeconds: -1 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("invalid_duration");
  });

  it("entryLevel이 0~4 범위를 벗어나면 400 invalid_entry_level을 반환한다 (경계)", async () => {
    const task = await createTestTask();

    const res = await request(app)
      .post(`/api/tasks/${task.id}/events`)
      .send({ eventType: "done", entryLevel: 5 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("invalid_entry_level");
  });

  it(
    "Task.level/skipCount가 아니라 요청으로 받은 entryLevel을 그대로 스냅샷에 남긴다 (경계 — 완료 시 리셋과 독립적)",
    async () => {
      const task = await createTestTask();
      await request(app)
        .post(`/api/tasks/${task.id}/events`)
        .send({ eventType: "activated" });
      // tick 한 번으로 task.level을 1로 올려둔 채 완료 — 완료 시 Task는 0으로
      // 리셋되지만, 스냅샷은 요청으로 받은 entryLevel(여기선 2, task.level=1과
      // 다른 값)을 그대로 저장해야 한다.
      await request(app)
        .post(`/api/tasks/${task.id}/events`)
        .send({ eventType: "notification_sent" });

      await request(app)
        .post(`/api/tasks/${task.id}/events`)
        .send({ eventType: "done", entryLevel: 2 });

      const event = await prisma.taskEvent.findFirst({
        where: { taskId: task.id, eventType: "done" },
      });
      expect(event?.entryLevel).toBe(2);
    },
    15000,
  );
});

describe.skipIf(!isTestDb)("POST /api/tasks/:id/avoidance-reasons", () => {
  afterEach(async () => {
    const testTasks = await prisma.task.findMany({
      where: { title: { startsWith: TEST_PREFIX } },
    });
    const ids = testTasks.map((t) => t.id);
    if (ids.length === 0) return;

    await prisma.$transaction([
      prisma.avoidanceReason.deleteMany({ where: { taskId: { in: ids } } }),
      prisma.taskEvent.deleteMany({ where: { taskId: { in: ids } } }),
      prisma.task.deleteMany({ where: { id: { in: ids } } }),
    ]);
  });

  it("정상 입력이면 재확인된 회피 이유가 저장된다 (happy path)", async () => {
    const task = await createTestTask();

    const res = await request(app)
      .post(`/api/tasks/${task.id}/avoidance-reasons`)
      .send({ level: 1, reason: "dislike", customText: null });

    expect(res.status).toBe(200);
    expect(res.body.data.taskId).toBe(task.id);
    expect(res.body.data.reason).toBe("dislike");
    expect(res.body.data.level).toBe(1);
  });

  it("level이 1/3이 아니면 400 invalid_level을 반환한다 (경계)", async () => {
    const task = await createTestTask();

    const res = await request(app)
      .post(`/api/tasks/${task.id}/avoidance-reasons`)
      .send({ level: 2, reason: "dislike" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("invalid_level");
  });

  it("reason이 유효 목록에 없으면 400 invalid_reason을 반환한다 (경계)", async () => {
    const task = await createTestTask();

    const res = await request(app)
      .post(`/api/tasks/${task.id}/avoidance-reasons`)
      .send({ level: 1, reason: "not_a_real_reason" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("invalid_reason");
  });

  it("존재하지 않는 taskId면 404 not_found를 반환한다 (경계)", async () => {
    const res = await request(app)
      .post("/api/tasks/does-not-exist/avoidance-reasons")
      .send({ level: 1, reason: "dislike" });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("not_found");
  });
});

describe.skipIf(!isTestDb)("POST /api/tasks/:id/feedbacks", () => {
  afterEach(async () => {
    const testTasks = await prisma.task.findMany({
      where: { title: { startsWith: TEST_PREFIX } },
    });
    const ids = testTasks.map((t) => t.id);
    if (ids.length === 0) return;

    await prisma.$transaction([
      prisma.avoidanceReason.deleteMany({ where: { taskId: { in: ids } } }),
      prisma.taskEvent.deleteMany({ where: { taskId: { in: ids } } }),
      prisma.feedback.deleteMany({ where: { taskId: { in: ids } } }),
      prisma.task.deleteMany({ where: { id: { in: ids } } }),
    ]);
  });

  it("response가 helpful이면 피드백이 저장된다 (happy path)", async () => {
    const task = await createTestTask();

    const res = await request(app)
      .post(`/api/tasks/${task.id}/feedbacks`)
      .send({ response: "helpful" });

    expect(res.status).toBe(200);
    expect(res.body.data.taskId).toBe(task.id);
    expect(res.body.data.response).toBe("helpful");

    const rows = await prisma.feedback.findMany({ where: { taskId: task.id } });
    expect(rows).toHaveLength(1);
  });

  it("response가 annoying이면 피드백이 저장된다 (happy path)", async () => {
    const task = await createTestTask();

    const res = await request(app)
      .post(`/api/tasks/${task.id}/feedbacks`)
      .send({ response: "annoying" });

    expect(res.status).toBe(200);
    expect(res.body.data.response).toBe("annoying");
  });

  it("response가 helpful/annoying이 아니면 400 invalid_response를 반환한다 (경계)", async () => {
    const task = await createTestTask();

    const res = await request(app)
      .post(`/api/tasks/${task.id}/feedbacks`)
      .send({ response: "not_a_real_response" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("invalid_response");
  });

  it("존재하지 않는 taskId면 404 not_found를 반환한다 (경계)", async () => {
    const res = await request(app)
      .post("/api/tasks/does-not-exist/feedbacks")
      .send({ response: "helpful" });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("not_found");
  });
});

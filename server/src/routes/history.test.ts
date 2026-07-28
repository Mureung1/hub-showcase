import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../db/client.js";

// test-writer Skill의 통합 테스트 안전장치(DB 가드 + prefix + teardown)를 tasks.test.ts와
// 동일하게 적용한다. 자세한 근거는 .claude/skills/test-writer/SKILL.md 5절 참고.
// tasks.test.ts와 다른, 서로 접두어 관계가 아닌 prefix를 쓴다 — vitest는 파일 단위로
// 테스트를 병렬 실행하므로, 두 파일이 같은 "test_" prefix를 쓰면 서로의 afterEach
// teardown이 상대방이 아직 검증 중인 행까지 지워버리는 경합이 생긴다(실제로 겪음).
const TEST_PREFIX = "hist_test_";
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
    "[history.test.ts] server/.env.test에 테스트용 DATABASE_URL이 없어 통합 테스트를 건너뜁니다.",
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

describe.skipIf(!isTestDb)("GET /api/history", () => {
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

  it("완료(done)한 task의 스냅샷을 반환한다 (happy path)", async () => {
    const task = await createTestTask();
    await request(app)
      .post(`/api/tasks/${task.id}/events`)
      .send({ eventType: "done", durationSeconds: 90, entryLevel: 2, microTask: "첫 문장 쓰기" });

    const res = await request(app).get("/api/history");

    expect(res.status).toBe(200);
    const entry = res.body.data.find((e: { taskId: string }) => e.taskId === task.id);
    expect(entry).toMatchObject({
      taskId: task.id,
      title: task.title,
      durationSeconds: 90,
      entryLevel: 2,
      microTask: "첫 문장 쓰기",
      entryMode: "intervention",
      generationSource: "unknown",
      memoryEvidence: null,
    });
    expect(entry.completedAt).toBeTruthy();
  });

  it(
    "신규 완료 컨텍스트를 반환하고 microTask가 없는 기존 기록은 none으로 해석한다",
    async () => {
      const contextualTask = await createTestTask();
      await request(app)
        .post(`/api/tasks/${contextualTask.id}/events`)
        .send({
          eventType: "done",
          durationSeconds: 30,
          entryLevel: 2,
          microTask: "첫 문장 쓰기",
          entryMode: "intervention",
          generationSource: "gemini",
        });

      const legacyTask = await createTestTask();
      await request(app)
        .post(`/api/tasks/${legacyTask.id}/events`)
        .send({ eventType: "done" });

      const res = await request(app).get("/api/history");
      const contextualEntry = res.body.data.find(
        (entry: { taskId: string }) => entry.taskId === contextualTask.id,
      );
      const legacyEntry = res.body.data.find(
        (entry: { taskId: string }) => entry.taskId === legacyTask.id,
      );

      expect(contextualEntry).toMatchObject({
        entryMode: "intervention",
        generationSource: "gemini",
        memoryEvidence: null,
      });
      expect(legacyEntry).toMatchObject({
        entryLevel: null,
        microTask: null,
        entryMode: "unknown",
        generationSource: "none",
        memoryEvidence: null,
      });
    },
    15000,
  );

  it("waiting/active 상태인 task는 포함하지 않는다 (경계)", async () => {
    const waitingTask = await createTestTask();
    const activeTask = await createTestTask();
    await request(app)
      .post(`/api/tasks/${activeTask.id}/events`)
      .send({ eventType: "activated" });

    const res = await request(app).get("/api/history");

    const taskIds = res.body.data.map((e: { taskId: string }) => e.taskId);
    expect(taskIds).not.toContain(waitingTask.id);
    expect(taskIds).not.toContain(activeTask.id);
  });

  it("완료 시점의 회피 이유를 reason/customReasonText로 반환한다 (happy path)", async () => {
    const task = await createTestTask();

    const res = await request(app).get("/api/history");
    const beforeDone = res.body.data.find(
      (e: { taskId: string }) => e.taskId === task.id,
    );
    expect(beforeDone).toBeUndefined();

    await request(app).post(`/api/tasks/${task.id}/events`).send({ eventType: "done" });

    const afterDone = await request(app).get("/api/history");
    const entry = afterDone.body.data.find(
      (e: { taskId: string }) => e.taskId === task.id,
    );
    expect(entry).toMatchObject({
      reason: "overwhelm",
      customReasonText: null,
    });
  });

  it(
    "완료 전 재확인으로 회피 이유가 바뀌면 완료 시점(가장 최근) 값을 반환한다 (경계)",
    async () => {
      const task = await createTestTask();
      await request(app)
        .post(`/api/tasks/${task.id}/avoidance-reasons`)
        .send({ level: 1, reason: "custom", customText: "완벽하게 하고 싶어서" });

      await request(app).post(`/api/tasks/${task.id}/events`).send({ eventType: "done" });

      const res = await request(app).get("/api/history");
      const entry = res.body.data.find(
        (e: { taskId: string }) => e.taskId === task.id,
      );
      expect(entry).toMatchObject({
        reason: "custom",
        customReasonText: "완벽하게 하고 싶어서",
      });
    },
  );

  it(
    "최근 완료 순으로 정렬한다 (happy path)",
    async () => {
      const first = await createTestTask();
      await request(app).post(`/api/tasks/${first.id}/events`).send({ eventType: "done" });

      const second = await createTestTask();
      await request(app).post(`/api/tasks/${second.id}/events`).send({ eventType: "done" });

      const res = await request(app).get("/api/history");

      const ids = res.body.data.map((e: { taskId: string }) => e.taskId);
      expect(ids.indexOf(second.id)).toBeLessThan(ids.indexOf(first.id));
    },
    15000,
  );
});

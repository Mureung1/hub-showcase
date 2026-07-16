import { describe, expect, it } from "vitest";
import type { QueueEntry } from "./queue.js";
import { calculateQueuePositions, decideAutomaticNotification } from "./queue.js";

const remoteContext = {
  source: "remote" as const,
  status: "remote_waiting" as const,
  patientDeferCount: 0,
  preparationNotifiedAt: null,
  onsiteNearTurnNotifiedAt: null,
};

describe("decideAutomaticNotification", () => {
  it("원격 환자가 6번째가 되면 준비 알림을 결정한다", () => {
    expect(
      decideAutomaticNotification({ ...remoteContext, currentPosition: 6 }),
    ).toEqual({ notificationType: "preparation", dedupeKey: "preparation" });
  });

  it("6번째를 건너뛰고 4번째가 되면 입장 요청만 결정한다", () => {
    expect(
      decideAutomaticNotification({ ...remoteContext, currentPosition: 4 }),
    ).toEqual({
      notificationType: "entry_requested",
      dedupeKey: "entry_requested:0",
    });
  });

  it("직접 미룬 환자가 다시 4번째가 되면 새 회차 입장 요청을 결정한다", () => {
    expect(
      decideAutomaticNotification({
        ...remoteContext,
        currentPosition: 4,
        patientDeferCount: 1,
        preparationNotifiedAt: new Date(),
      }),
    ).toEqual({
      notificationType: "entry_requested",
      dedupeKey: "entry_requested:1",
    });
  });

  it("이미 입장 요청 상태이면 다시 결정하지 않는다", () => {
    expect(
      decideAutomaticNotification({
        ...remoteContext,
        status: "entry_requested",
        currentPosition: 2,
      }),
    ).toBeNull();
  });

  it("현장 환자가 4번째가 되면 현장 임박 알림을 결정한다", () => {
    expect(
      decideAutomaticNotification({
        ...remoteContext,
        source: "onsite",
        status: "onsite_waiting",
        currentPosition: 4,
      }),
    ).toEqual({
      notificationType: "onsite_near_turn",
      dedupeKey: "onsite_near_turn",
    });
  });

  it("이미 준비 또는 현장 임박 알림을 보냈으면 중복 결정하지 않는다", () => {
    const notifiedAt = new Date("2026-07-15T09:00:00.000Z");
    expect(
      decideAutomaticNotification({
        ...remoteContext,
        currentPosition: 5,
        preparationNotifiedAt: notifiedAt,
      }),
    ).toBeNull();
    expect(
      decideAutomaticNotification({
        ...remoteContext,
        source: "onsite",
        status: "onsite_waiting",
        currentPosition: 3,
        onsiteNearTurnNotifiedAt: notifiedAt,
      }),
    ).toBeNull();
  });
});

describe("calculateQueuePositions", () => {
  const categories = [
    { id: "adult", name: "성인", description: "만 19세 이상", sortOrder: 0 },
  ];

  function createEntry(id: string, patientCount: number): QueueEntry {
    return {
      id,
      ticketNumber: id,
      source: "onsite",
      inputMode: "categorized",
      patientCounts: { adult: patientCount },
      patientCount,
      categorySnapshot: categories,
      status: "onsite_waiting",
      registeredAt: "2026-07-16T09:00:00.000Z",
      deferred: false,
    };
  }

  it("대기팀 순서를 변경하면 환자 기준 순번과 예상 시간을 다시 계산한다", () => {
    const first = createEntry("1", 4);
    const second = createEntry("2", 1);
    const third = createEntry("3", 2);

    expect(calculateQueuePositions([first, second, third])).toEqual([
      expect.objectContaining({ entry: first, position: 1, positionEnd: 4, estimatedMinutes: 0 }),
      expect.objectContaining({ entry: second, position: 5, positionEnd: 5, estimatedMinutes: 40 }),
      expect.objectContaining({ entry: third, position: 6, positionEnd: 7, estimatedMinutes: 50 }),
    ]);

    expect(calculateQueuePositions([second, first, third])).toEqual([
      expect.objectContaining({ entry: second, position: 1, positionEnd: 1, estimatedMinutes: 0 }),
      expect.objectContaining({ entry: first, position: 2, positionEnd: 5, estimatedMinutes: 10 }),
      expect.objectContaining({ entry: third, position: 6, positionEnd: 7, estimatedMinutes: 50 }),
    ]);
  });
});

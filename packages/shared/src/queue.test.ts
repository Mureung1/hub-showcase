import { describe, expect, it } from "vitest";
import type { QueueEntry } from "./queue.js";
import {
  calculateQueuePositions,
  decideAutomaticNotification,
  expandQueuePositionsToPatientSlots,
  queueSettingsSchema,
} from "./queue.js";

const remoteContext = {
  source: "remote" as const,
  status: "remote_waiting" as const,
  patientDeferCount: 0,
  preparationNotifiedAt: null,
  onsiteNearTurnNotifiedAt: null,
};

describe("decideAutomaticNotification", () => {
  it("원격 환자가 6번째가 되면 준비 알림을 결정한다", () => {
    expect(decideAutomaticNotification({ ...remoteContext, currentPosition: 6 })).toEqual({
      notificationType: "preparation",
      dedupeKey: "preparation",
    });
  });

  it("6번째를 건너뛰고 4번째가 되면 입장 요청만 결정한다", () => {
    expect(decideAutomaticNotification({ ...remoteContext, currentPosition: 4 })).toEqual({
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

  it("현장 환자는 내 앞 대기 인원이 입장 기준 이하가 되면 현장 임박 알림을 결정한다", () => {
    expect(
      decideAutomaticNotification({
        ...remoteContext,
        source: "onsite",
        status: "onsite_waiting",
        currentPosition: 5,
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
  const categories = [{ id: "adult", name: "성인", description: "만 19세 이상", sortOrder: 0 }];

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

  it("병원이 설정한 평균 진료시간으로 예상 시간을 계산한다", () => {
    const first = createEntry("1", 2);
    const second = createEntry("2", 1);

    expect(calculateQueuePositions([first, second], 15)[1]).toMatchObject({
      position: 3,
      estimatedMinutes: 30,
    });
  });

  it("한 팀에 여러 명이 있으면 같은 팀 번호를 유지한 채 환자별 표시 슬롯으로 펼친다", () => {
    const first = createEntry("1", 2);
    const second = createEntry("2", 1);
    const positions = calculateQueuePositions([first, second], 10);

    expect(expandQueuePositionsToPatientSlots(positions, 10)).toEqual([
      expect.objectContaining({
        entry: first,
        teamNumber: 1,
        position: 1,
        estimatedMinutes: 0,
        patientSlotNumber: 1,
        patientSlotCount: 2,
        isFirstTeamSlot: true,
      }),
      expect.objectContaining({
        entry: first,
        teamNumber: 1,
        position: 2,
        estimatedMinutes: 10,
        patientSlotNumber: 2,
        patientSlotCount: 2,
        isFirstTeamSlot: false,
      }),
      expect.objectContaining({
        entry: second,
        teamNumber: 2,
        position: 3,
        estimatedMinutes: 20,
        patientSlotNumber: 1,
        patientSlotCount: 1,
        isFirstTeamSlot: true,
      }),
    ]);
  });
});

describe("queueSettingsSchema", () => {
  const validSettings = {
    averageMinutesPerPatient: 10,
    preparationThreshold: 6,
    entryThreshold: 4,
    maxRemoteWaitingPatients: 20,
  };

  it("운영 설정의 정상값을 허용한다", () => {
    expect(queueSettingsSchema.parse(validSettings)).toEqual(validSettings);
  });

  it("평균 진료시간이 5분 단위가 아니면 거절한다", () => {
    expect(() =>
      queueSettingsSchema.parse({
        ...validSettings,
        averageMinutesPerPatient: 7,
      }),
    ).toThrow("평균 진료시간은 5분 단위로 입력해 주세요.");
  });

  it("준비 기준이 입장 기준보다 크지 않으면 거절한다", () => {
    expect(() =>
      queueSettingsSchema.parse({
        ...validSettings,
        preparationThreshold: 4,
      }),
    ).toThrow("준비 기준은 입장 기준보다 커야 합니다.");
  });

  it("원격 접수 한도가 1명 미만이면 거절한다", () => {
    expect(() =>
      queueSettingsSchema.parse({
        ...validSettings,
        maxRemoteWaitingPatients: 0,
      }),
    ).toThrow("원격 접수 한도는 1명 이상이어야 합니다.");
  });
});

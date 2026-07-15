import { describe, expect, it } from "vitest";
import { decideAutomaticNotification } from "./queue.js";

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

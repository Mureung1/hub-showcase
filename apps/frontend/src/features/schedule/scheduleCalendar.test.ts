import { format } from "date-fns";
import { describe, expect, it } from "vitest";
import {
  getCalendarDateRange,
  getDayLabel,
  getHoursLabel,
  getMonthlyScheduleSummary,
  parseMonthParam
} from "./scheduleCalendar";
import { Schedule } from "./scheduleTypes";

function createSchedule(input: Partial<Schedule> & Pick<Schedule, "id" | "workerId" | "workDate" | "startTime" | "endTime">): Schedule {
  return {
    storeId: "store-1",
    workerName: input.workerId === "worker-me" ? "나알바" : "동료",
    position: null,
    memo: null,
    source: "MANUAL",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...input
  };
}

describe("scheduleCalendar", () => {
  it("월 파라미터가 유효하면 해당 월의 첫날을 반환한다", () => {
    expect(format(parseMonthParam("2026-07"), "yyyy-MM-dd")).toBe("2026-07-01");
  });

  it("월 파라미터가 잘못되면 fallback 날짜가 속한 월의 첫날로 보정한다", () => {
    const fallbackDate = new Date(2026, 1, 15);

    expect(format(parseMonthParam("2026-13", fallbackDate), "yyyy-MM-dd")).toBe("2026-02-01");
    expect(format(parseMonthParam("잘못된값", fallbackDate), "yyyy-MM-dd")).toBe("2026-02-01");
  });

  it("2026년 7월 달력은 일요일 시작 7열 그리드에 맞춰 앞뒤 날짜를 포함한다", () => {
    const range = getCalendarDateRange(parseMonthParam("2026-07"));

    expect(range.fromDate).toBe("2026-06-28");
    expect(range.toDate).toBe("2026-08-01");
    expect(range.calendarDays).toHaveLength(35);
  });

  it("월간 요약은 달력에 표시되는 앞뒤 날짜를 제외하고 조회 중인 월의 근무만 집계한다", () => {
    const schedules = [
      createSchedule({
        id: "previous-month",
        workerId: "worker-me",
        workDate: "2026-06-29",
        startTime: "09:00",
        endTime: "13:00"
      }),
      createSchedule({
        id: "my-first-july",
        workerId: "worker-me",
        workDate: "2026-07-01",
        startTime: "09:00",
        endTime: "13:00"
      }),
      createSchedule({
        id: "other-july",
        workerId: "worker-other",
        workDate: "2026-07-01",
        startTime: "14:00",
        endTime: "18:00"
      }),
      createSchedule({
        id: "my-second-july",
        workerId: "worker-me",
        workDate: "2026-07-10",
        startTime: "17:30",
        endTime: "23:00"
      }),
      createSchedule({
        id: "next-month",
        workerId: "worker-other",
        workDate: "2026-08-01",
        startTime: "10:00",
        endTime: "12:00"
      })
    ];

    const summary = getMonthlyScheduleSummary(schedules, parseMonthParam("2026-07"), "worker-me");

    expect(summary.currentMonthSchedules.map((schedule) => schedule.id)).toEqual([
      "my-first-july",
      "other-july",
      "my-second-july"
    ]);
    expect(summary.myMonthSchedules.map((schedule) => schedule.id)).toEqual(["my-first-july", "my-second-july"]);
    expect(summary.myMonthHours).toBe(9.5);
    expect(summary.activeWorkDays).toBe(2);
  });

  it("날짜 셀 라벨은 본인 근무를 우선하고, 아니면 근무자 수를 보여준다", () => {
    expect(
      getDayLabel(
        [
          createSchedule({
            id: "mine",
            workerId: "worker-me",
            workDate: "2026-07-01",
            startTime: "09:00",
            endTime: "13:00"
          }),
          createSchedule({
            id: "other",
            workerId: "worker-other",
            workDate: "2026-07-01",
            startTime: "14:00",
            endTime: "18:00"
          })
        ],
        "worker-me"
      )
    ).toBe("내 근무");

    expect(
      getDayLabel(
        [
          createSchedule({
            id: "other-1",
            workerId: "worker-other-1",
            workDate: "2026-07-02",
            startTime: "09:00",
            endTime: "13:00"
          }),
          createSchedule({
            id: "other-2",
            workerId: "worker-other-2",
            workDate: "2026-07-02",
            startTime: "14:00",
            endTime: "18:00"
          })
        ],
        "worker-me"
      )
    ).toBe("2명 근무");
  });

  it("근무 시간 라벨은 정수와 소수 시간을 자연스럽게 표시한다", () => {
    expect(getHoursLabel(4)).toBe("4시간");
    expect(getHoursLabel(4.5)).toBe("4.5시간");
    expect(getHoursLabel(0)).toBe("0시간");
  });
});

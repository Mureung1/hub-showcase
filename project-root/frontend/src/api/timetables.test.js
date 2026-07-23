import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchSharedTimetables, recommendTimetable, shareTimetable } from "./timetables";
import { supabase } from "./supabaseClient";

vi.mock("./supabaseClient", () => ({
  supabase: { auth: { getSession: vi.fn() } },
}));

describe("shareTimetable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: "test-token" } },
    });
    vi.stubGlobal("fetch", vi.fn());
  });

  it("인증 헤더와 함께 POST /api/timetables/share를 호출한다", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1 }),
    });

    await shareTimetable({ year: 2026, semester: "2026-2" });

    expect(fetch).toHaveBeenCalledWith("http://localhost:3000/api/timetables/share", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
      body: JSON.stringify({ year: 2026, semester: "2026-2" }),
    });
  });

  it("서버가 에러를 반환하면 그 메시지로 예외를 던진다", async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "이미 공유된 시간표가 없습니다." }),
    });

    await expect(shareTimetable({ year: 2026, semester: "2026-2" })).rejects.toThrow(
      "이미 공유된 시간표가 없습니다."
    );
  });
});

describe("recommendTimetable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: "test-token" } },
    });
    vi.stubGlobal("fetch", vi.fn());
  });

  it("인증 헤더와 함께 POST /api/timetables/:id/recommend를 호출한다", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ recommendCount: 13 }),
    });

    const result = await recommendTimetable({ timetableId: "st1" });

    expect(fetch).toHaveBeenCalledWith("http://localhost:3000/api/timetables/st1/recommend", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
    });
    expect(result).toEqual({ recommendCount: 13 });
  });
});

describe("fetchSharedTimetables", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: "test-token" } },
    });
    vi.stubGlobal("fetch", vi.fn());
  });

  it("인증 헤더와 함께 GET /api/timetables/shared를 호출하고 목록을 반환한다", async () => {
    const list = [{ id: 1, label: "추천 시간표 1", lectures: [], recommendCount: 0, recommendedByMe: false }];
    fetch.mockResolvedValue({
      ok: true,
      json: async () => list,
    });

    const result = await fetchSharedTimetables();

    expect(fetch).toHaveBeenCalledWith("http://localhost:3000/api/timetables/shared", {
      headers: { Authorization: "Bearer test-token" },
    });
    expect(result).toEqual(list);
  });
});

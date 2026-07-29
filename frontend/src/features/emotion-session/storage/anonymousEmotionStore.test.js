import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAnonymousEmotionAnalysis,
  listAnonymousEmotionAnalyses
} from "./anonymousEmotionStore";

describe("anonymous emotion session storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("stores and restores records only from sessionStorage", () => {
    const record = createAnonymousEmotionAnalysis(
      { situationText: "오늘의 기록" },
      {
        createId: () => "record-1",
        now: () => new Date("2026-07-29T05:00:00.000Z")
      }
    );

    expect(listAnonymousEmotionAnalyses()).toEqual([record]);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(1);
  });

  it("does not call fetch while creating or listing anonymous records", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    createAnonymousEmotionAnalysis({ situationText: "로컬 기록" });
    listAnonymousEmotionAnalyses();

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("returns no records after the tab storage is cleared", () => {
    createAnonymousEmotionAnalysis({ situationText: "임시 기록" });
    window.sessionStorage.clear();

    expect(listAnonymousEmotionAnalyses()).toEqual([]);
  });
});

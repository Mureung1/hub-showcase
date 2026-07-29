import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateJson } from "./llmClient.js";
import { buildNoticePost, buildPromotionPost } from "./postContent.js";

vi.mock("./llmClient.js", () => ({ generateJson: vi.fn() }));

beforeEach(() => {
  generateJson.mockReset();
});

describe("buildNoticePost", () => {
  it("휴무 안내 답변을 주면 LLM이 만든 title/content/seoKeywords와 noticeType을 담은 초안을 반환한다", async () => {
    // Arrange
    const answers = { type: "day-off", content: "7월 30일은 휴무입니다." };
    generateJson.mockResolvedValue({
      title: "휴무 안내",
      content: "7월 30일은 하루 쉽니다.",
      seoKeywords: ["휴무", "임시휴무"],
    });

    // Act
    const result = await buildNoticePost(answers);

    // Assert
    expect(result).toEqual({
      title: "휴무 안내",
      content: "7월 30일은 하루 쉽니다.",
      seoKeywords: ["휴무", "임시휴무"],
      noticeType: "day-off",
    });
    expect(generateJson).toHaveBeenCalledTimes(1);
  });

  it("type이 없으면 LLM을 호출하지 않고 MISSING_FIELDS 에러를 던진다", async () => {
    // Arrange
    const answers = { content: "내용만 있음" };

    // Act & Assert
    await expect(buildNoticePost(answers)).rejects.toThrowError(
      expect.objectContaining({ status: 400, code: "MISSING_FIELDS" })
    );
    expect(generateJson).not.toHaveBeenCalled();
  });

  it("content가 없으면 MISSING_FIELDS 에러를 던진다", async () => {
    // Arrange
    const answers = { type: "day-off" };

    // Act & Assert
    await expect(buildNoticePost(answers)).rejects.toThrowError(
      expect.objectContaining({ status: 400, code: "MISSING_FIELDS" })
    );
  });

  it("지원하지 않는 type이면 INVALID_NOTICE_TYPE 에러를 던진다", async () => {
    // Arrange
    const answers = { type: "unknown-type", content: "내용" };

    // Act & Assert
    await expect(buildNoticePost(answers)).rejects.toThrowError(
      expect.objectContaining({ status: 400, code: "INVALID_NOTICE_TYPE" })
    );
  });
});

describe("buildPromotionPost", () => {
  it("purpose가 new-menu면 LLM이 만든 title/content/seoKeywords/hashtags와 menuName/launchDate를 담은 초안을 반환한다", async () => {
    // Arrange
    const answers = { purpose: "new-menu", "menu-name": "딸기 라떼", "launch-date": "2026-08-01" };
    generateJson.mockResolvedValue({
      title: "딸기 라떼 출시 안내",
      content: '신메뉴 "딸기 라떼"을 2026-08-01부터 만나보실 수 있습니다.',
      seoKeywords: ["딸기 라떼", "신메뉴"],
      hashtags: ["딸기라떼", "신메뉴출시"],
    });

    // Act
    const result = await buildPromotionPost(answers);

    // Assert
    expect(result).toEqual({
      title: "딸기 라떼 출시 안내",
      content: '신메뉴 "딸기 라떼"을 2026-08-01부터 만나보실 수 있습니다.',
      seoKeywords: ["딸기 라떼", "신메뉴"],
      hashtags: ["딸기라떼", "신메뉴출시"],
      menuName: "딸기 라떼",
      launchDate: "2026-08-01",
    });
  });

  it("purpose가 new-menu인데 menu-name이 없으면 LLM을 호출하지 않고 MISSING_FIELDS 에러를 던진다", async () => {
    // Arrange
    const answers = { purpose: "new-menu", "launch-date": "2026-08-01" };

    // Act & Assert
    await expect(buildPromotionPost(answers)).rejects.toThrowError(
      expect.objectContaining({ status: 400, code: "MISSING_FIELDS" })
    );
    expect(generateJson).not.toHaveBeenCalled();
  });

  it("purpose가 event면 LLM이 만든 title/content와 eventName/eventType 등을 담은 초안을 반환한다", async () => {
    // Arrange
    const answers = {
      purpose: "event",
      "event-name": "여름 시즌 빙수 20% 할인",
      "event-type": "seasonal",
      "event-detail": "아이스 메뉴 전체 20% 할인, 스탬프 5개 이상 고객 대상",
      "event-period": { start: "2026-07-20", end: "2026-07-25" },
    };
    generateJson.mockResolvedValue({
      title: "여름 시즌 빙수 20% 할인",
      content: "아이스 메뉴 전체 20% 할인, 스탬프 5개 이상 고객 대상\n기간: 2026-07-20 ~ 2026-07-25",
      seoKeywords: ["여름 빙수", "할인 이벤트"],
      hashtags: ["여름빙수", "할인이벤트"],
    });

    // Act
    const result = await buildPromotionPost(answers);

    // Assert
    expect(result).toEqual({
      title: "여름 시즌 빙수 20% 할인",
      content: "아이스 메뉴 전체 20% 할인, 스탬프 5개 이상 고객 대상\n기간: 2026-07-20 ~ 2026-07-25",
      seoKeywords: ["여름 빙수", "할인 이벤트"],
      hashtags: ["여름빙수", "할인이벤트"],
      eventName: "여름 시즌 빙수 20% 할인",
      eventType: "seasonal",
      eventDetail: "아이스 메뉴 전체 20% 할인, 스탬프 5개 이상 고객 대상",
      eventPeriodStart: "2026-07-20",
      eventPeriodEnd: "2026-07-25",
    });
  });

  it("purpose가 event인데 event-period에 start/end가 없으면 MISSING_FIELDS 에러를 던진다", async () => {
    // Arrange
    const answers = {
      purpose: "event",
      "event-name": "여름 시즌 빙수 20% 할인",
      "event-type": "seasonal",
      "event-detail": "아이스 메뉴 전체 20% 할인",
      "event-period": { start: "2026-07-20" },
    };

    // Act & Assert
    await expect(buildPromotionPost(answers)).rejects.toThrowError(
      expect.objectContaining({ status: 400, code: "MISSING_FIELDS" })
    );
  });

  it("purpose가 general이면 LLM이 만든 title/content와 generalTopic/generalDetail을 담은 초안을 반환한다", async () => {
    // Arrange
    const answers = { purpose: "general", "general-topic": "atmosphere", "general-detail": "우드톤 인테리어로 리모델링했습니다." };
    generateJson.mockResolvedValue({
      title: "매장 분위기 · 인테리어 소식",
      content: "우드톤 인테리어로 리모델링했습니다.",
      seoKeywords: ["매장 인테리어", "카페 분위기"],
      hashtags: ["인테리어리뉴얼", "우드톤카페"],
    });

    // Act
    const result = await buildPromotionPost(answers);

    // Assert
    expect(result).toEqual({
      title: "매장 분위기 · 인테리어 소식",
      content: "우드톤 인테리어로 리모델링했습니다.",
      seoKeywords: ["매장 인테리어", "카페 분위기"],
      hashtags: ["인테리어리뉴얼", "우드톤카페"],
      generalTopic: "atmosphere",
      generalDetail: "우드톤 인테리어로 리모델링했습니다.",
    });
  });

  it("purpose가 general인데 general-detail이 없으면 MISSING_FIELDS 에러를 던진다", async () => {
    // Arrange
    const answers = { purpose: "general", "general-topic": "atmosphere" };

    // Act & Assert
    await expect(buildPromotionPost(answers)).rejects.toThrowError(
      expect.objectContaining({ status: 400, code: "MISSING_FIELDS" })
    );
  });

  it("지원하지 않는 purpose면 LLM을 호출하지 않고 INVALID_PURPOSE 에러를 던진다", async () => {
    // Arrange
    const answers = { purpose: "unknown-purpose" };

    // Act & Assert
    await expect(buildPromotionPost(answers)).rejects.toThrowError(
      expect.objectContaining({ status: 400, code: "INVALID_PURPOSE" })
    );
    expect(generateJson).not.toHaveBeenCalled();
  });
});

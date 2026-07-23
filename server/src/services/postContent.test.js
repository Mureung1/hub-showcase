import { describe, it, expect } from "vitest";
import { buildNoticePost, buildPromotionPost } from "./postContent.js";

describe("buildNoticePost", () => {
  it("휴무 안내 답변을 주면 title/content/noticeType을 담은 초안을 반환한다", () => {
    // Arrange
    const answers = { type: "day-off", content: "7월 30일은 휴무입니다." };

    // Act
    const result = buildNoticePost(answers);

    // Assert
    expect(result).toEqual({
      title: "휴무 안내",
      content: "7월 30일은 휴무입니다.",
      noticeType: "day-off",
    });
  });

  it("type이 없으면 MISSING_FIELDS 에러를 던진다", () => {
    // Arrange
    const answers = { content: "내용만 있음" };

    // Act & Assert
    expect(() => buildNoticePost(answers)).toThrowError(
      expect.objectContaining({ status: 400, code: "MISSING_FIELDS" })
    );
  });

  it("content가 없으면 MISSING_FIELDS 에러를 던진다", () => {
    // Arrange
    const answers = { type: "day-off" };

    // Act & Assert
    expect(() => buildNoticePost(answers)).toThrowError(
      expect.objectContaining({ status: 400, code: "MISSING_FIELDS" })
    );
  });

  it("지원하지 않는 type이면 INVALID_NOTICE_TYPE 에러를 던진다", () => {
    // Arrange
    const answers = { type: "unknown-type", content: "내용" };

    // Act & Assert
    expect(() => buildNoticePost(answers)).toThrowError(
      expect.objectContaining({ status: 400, code: "INVALID_NOTICE_TYPE" })
    );
  });
});

describe("buildPromotionPost", () => {
  it("purpose가 new-menu면 menuName/launchDate를 담은 신메뉴 안내 초안을 반환한다", () => {
    // Arrange
    const answers = { purpose: "new-menu", "menu-name": "딸기 라떼", "launch-date": "2026-08-01" };

    // Act
    const result = buildPromotionPost(answers);

    // Assert
    expect(result).toEqual({
      title: "딸기 라떼 출시 안내",
      content: '신메뉴 "딸기 라떼"을 2026-08-01부터 만나보실 수 있습니다.',
      menuName: "딸기 라떼",
      launchDate: "2026-08-01",
    });
  });

  it("purpose가 new-menu인데 menu-name이 없으면 MISSING_FIELDS 에러를 던진다", () => {
    // Arrange
    const answers = { purpose: "new-menu", "launch-date": "2026-08-01" };

    // Act & Assert
    expect(() => buildPromotionPost(answers)).toThrowError(
      expect.objectContaining({ status: 400, code: "MISSING_FIELDS" })
    );
  });

  it("purpose가 event면 eventName/eventType 등을 담은 이벤트 안내 초안을 반환한다", () => {
    // Arrange
    const answers = {
      purpose: "event",
      "event-name": "여름 시즌 빙수 20% 할인",
      "event-type": "seasonal",
      "event-detail": "아이스 메뉴 전체 20% 할인, 스탬프 5개 이상 고객 대상",
      "event-period": { start: "2026-07-20", end: "2026-07-25" },
    };

    // Act
    const result = buildPromotionPost(answers);

    // Assert
    expect(result).toEqual({
      title: "여름 시즌 빙수 20% 할인",
      content: "아이스 메뉴 전체 20% 할인, 스탬프 5개 이상 고객 대상\n기간: 2026-07-20 ~ 2026-07-25",
      eventName: "여름 시즌 빙수 20% 할인",
      eventType: "seasonal",
      eventDetail: "아이스 메뉴 전체 20% 할인, 스탬프 5개 이상 고객 대상",
      eventPeriodStart: "2026-07-20",
      eventPeriodEnd: "2026-07-25",
    });
  });

  it("purpose가 event인데 event-period에 start/end가 없으면 MISSING_FIELDS 에러를 던진다", () => {
    // Arrange
    const answers = {
      purpose: "event",
      "event-name": "여름 시즌 빙수 20% 할인",
      "event-type": "seasonal",
      "event-detail": "아이스 메뉴 전체 20% 할인",
      "event-period": { start: "2026-07-20" },
    };

    // Act & Assert
    expect(() => buildPromotionPost(answers)).toThrowError(
      expect.objectContaining({ status: 400, code: "MISSING_FIELDS" })
    );
  });

  it("purpose가 general이면 generalTopic/generalDetail을 담은 일반 홍보 초안을 반환한다", () => {
    // Arrange
    const answers = { purpose: "general", "general-topic": "atmosphere", "general-detail": "우드톤 인테리어로 리모델링했습니다." };

    // Act
    const result = buildPromotionPost(answers);

    // Assert
    expect(result).toEqual({
      title: "매장 분위기 · 인테리어 소식",
      content: "우드톤 인테리어로 리모델링했습니다.",
      generalTopic: "atmosphere",
      generalDetail: "우드톤 인테리어로 리모델링했습니다.",
    });
  });

  it("purpose가 general인데 general-detail이 없으면 MISSING_FIELDS 에러를 던진다", () => {
    // Arrange
    const answers = { purpose: "general", "general-topic": "atmosphere" };

    // Act & Assert
    expect(() => buildPromotionPost(answers)).toThrowError(
      expect.objectContaining({ status: 400, code: "MISSING_FIELDS" })
    );
  });

  it("지원하지 않는 purpose면 INVALID_PURPOSE 에러를 던진다", () => {
    // Arrange
    const answers = { purpose: "unknown-purpose" };

    // Act & Assert
    expect(() => buildPromotionPost(answers)).toThrowError(
      expect.objectContaining({ status: 400, code: "INVALID_PURPOSE" })
    );
  });
});

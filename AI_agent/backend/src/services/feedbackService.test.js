import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assessMissionFit,
  createSubmissionFeedback,
  isLowMissionFit,
  parseStoredFeedback,
} from "./feedbackService.js";

describe("feedback helpers", () => {
  it("creates structured feedback from a submitted mission", () => {
    const feedback = createSubmissionFeedback({
      missionTitle: "서비스 MVP 구현",
      submittedUrl: "https://example.com/project",
      submittedDescription:
        "문제 정의, 수행 과정, 결과를 포함해 제출한 설명입니다. 포트폴리오 작성에 활용할 수 있을 만큼 충분한 내용을 담았습니다.",
    });

    assert.equal(typeof feedback.overall, "string");
    assert.equal(feedback.strengths.length, 2);
    assert.equal(feedback.improvements.length, 2);
    assert.equal(feedback.revisions.length, 2);
    assert.equal(feedback.portfolioPoints.length, 3);
    assert.match(feedback.portfolioPoints[0], /서비스 MVP 구현/);
  });

  it("parses stored feedback JSON and falls back to null for invalid values", () => {
    const feedback = createSubmissionFeedback({ missionTitle: "테스트 미션" });

    assert.deepEqual(parseStoredFeedback(JSON.stringify(feedback)), feedback);
    assert.equal(parseStoredFeedback("not-json"), null);
    assert.equal(parseStoredFeedback(""), null);
  });
  it("marks unrelated submissions as low mission fit", () => {
    const feedback = createSubmissionFeedback({
      missionTitle: "업무 프로세스 개선 제안서 작성",
      submittedUrl: "https://example.com/mango-coconut-latte-campaign",
      submittedDescription:
        "카페 신메뉴인 망고 코코넛 라떼를 홍보하기 위한 SNS 콘텐츠 기획안입니다. 릴스, 카드뉴스, 이벤트 문구, 기대 효과를 정리했습니다.",
    });

    assert.equal(feedback.missionFit.level, "low");
    assert.equal(feedback.missionFit.canCreatePortfolio, false);
    assert.equal(isLowMissionFit(feedback), true);
  });

  it("marks process submissions with required evidence as acceptable", () => {
    const missionFit = assessMissionFit({
      missionTitle: "업무 프로세스 개선 제안서 작성",
      submittedDescription:
        "현재 흐름을 단계별로 정리하고 문제 병목을 정의했습니다. 개선안 3개와 우선순위 표를 작성해 기대 효과를 비교했습니다.",
    });

    assert.notEqual(missionFit.level, "low");
    assert.equal(missionFit.canCreatePortfolio, true);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createSubmissionFeedback,
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
});

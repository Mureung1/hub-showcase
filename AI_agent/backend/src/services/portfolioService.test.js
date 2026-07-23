import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createPortfolioDraft,
  parseStoredPortfolioDraft,
} from "./portfolioService.js";

describe("portfolio helpers", () => {
  it("creates a portfolio draft from submission and feedback", () => {
    const draft = createPortfolioDraft({
      submission: {
        missionTitle: "서비스 MVP 구현",
        submittedUrl: "https://example.com/project",
        submittedDescription:
          "문제 정의를 먼저 정리했습니다. 입력 폼을 만들었습니다. DB 저장 흐름을 연결했습니다. README를 작성했습니다.",
      },
      feedback: {
        overall: "문제 정의와 결과 연결이 좋습니다.",
        portfolioPoints: ["서비스 MVP 구현 경험을 프로젝트 제목으로 정리할 수 있습니다."],
      },
    });

    assert.equal(draft.title, "서비스 MVP 구현");
    assert.equal(draft.artifact, "https://example.com/project");
    assert.equal(draft.approach.length, 4);
    assert.equal(draft.portfolioPoints.length, 1);
    assert.match(draft.interviewPitch, /서비스 MVP 구현/);
  });

  it("parses stored portfolio draft JSON and falls back to null for invalid values", () => {
    const draft = createPortfolioDraft({
      submission: { missionTitle: "테스트 미션" },
      feedback: null,
    });

    assert.deepEqual(parseStoredPortfolioDraft(JSON.stringify(draft)), draft);
    assert.equal(parseStoredPortfolioDraft("not-json"), null);
    assert.equal(parseStoredPortfolioDraft(""), null);
  });
});

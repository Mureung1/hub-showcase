import assert from "node:assert/strict";
import test from "node:test";
import { buildPortfolioPrompt } from "./anthropic.service.js";

test("지원 기업과 JD를 CV·디자인과 함께 프롬프트에 포함한다", () => {
  const prompt = buildPortfolioPrompt({
    cvMarkdown: "# 김지우\n## 프로젝트\n- 접근성 개선",
    designMarkdown: "# Minimal Clean",
    targetMarkdown: "# 지원 목표\n- 기업: QANDA\n- 포지션: Frontend Engineer",
  });

  assert.match(prompt, /QANDA/);
  assert.match(prompt, /Frontend Engineer/);
  assert.match(prompt, /접근성 개선/);
  assert.match(prompt, /Minimal Clean/);
});

test("이력서에 없는 경험을 생성하지 말라는 안전 규칙을 포함한다", () => {
  const prompt = buildPortfolioPrompt({
    cvMarkdown: "CV",
    designMarkdown: "DESIGN",
    targetMarkdown: "TARGET",
  });

  assert.match(prompt, /CV에 없는 경력, 수치, 기술, 성과를 절대 만들지 않는다/);
  assert.match(prompt, /근거가 없으면 생략한다/);
});

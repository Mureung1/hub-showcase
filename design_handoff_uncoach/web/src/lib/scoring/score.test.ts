import { describe, it, expect } from "vitest";
import { buildUserMessage } from "./score";
import type { Situation, ThreadItem } from "../domain/types";

const baseSit: Situation = {
  id: "t1",
  rel: "직속 상사",
  title: "회의 지각 사과",
  counterpart: "팀장",
  goal: "사과하고 신뢰 회복",
  tension: "변명처럼 들리면 안 됨",
  axis: "① 맥락",
};

describe("buildUserMessage", () => {
  it("상황·상대·목적·긴장 헤더와 채점할 초안을 포함", () => {
    const m = buildUserMessage({ situation: baseSit, draft: "늦어서 죄송합니다" });
    expect(m).toContain("회의 지각 사과");
    expect(m).toContain("직속 상사");
    expect(m).toContain("사과하고 신뢰 회복");
    expect(m).toContain("늦어서 죄송합니다");
  });

  it("chat 매체는 '메시지'로 표기하고 메일 제목 줄이 없음", () => {
    const m = buildUserMessage({ situation: baseSit, draft: "d" });
    expect(m).toContain("내 메시지");
    expect(m).not.toContain("[메일 제목");
  });

  it("email 매체는 메일 본문·제목 줄을 포함", () => {
    const sit: Situation = { ...baseSit, medium: "email" };
    const m = buildUserMessage({ situation: sit, draft: "d", emailSubject: "지각 사과드립니다" });
    expect(m).toContain("메일 본문");
    expect(m).toContain("지각 사과드립니다");
  });

  it("email인데 제목이 비면 '(제목 비어있음)'", () => {
    const sit: Situation = { ...baseSit, medium: "email" };
    const m = buildUserMessage({ situation: sit, draft: "d", emailSubject: "   " });
    expect(m).toContain("(제목 비어있음)");
  });

  it("rubric이 있으면 축별 채점 기준과 각 축 문구를 포함", () => {
    const sit: Situation = {
      ...baseSit,
      rubric: {
        context: ["맥락무시", "맥락무난", "맥락적절"],
        register: ["말투위험", "말투무난", "말투적절"],
        strategy: ["전략위험", "전략무난", "전략적절"],
      },
    };
    const m = buildUserMessage({ situation: sit, draft: "d" });
    expect(m).toContain("축별 채점 기준");
    expect(m).toContain("맥락적절");
    expect(m).toContain("말투위험");
  });

  it("rubric이 없으면 채점 기준 섹션을 넣지 않음", () => {
    const m = buildUserMessage({ situation: baseSit, draft: "d" });
    expect(m).not.toContain("축별 채점 기준");
  });

  it("profile의 role/age를 작성자 배경으로 반영", () => {
    const m = buildUserMessage({
      situation: baseSit,
      draft: "d",
      profile: { role: "신입 개발자", age: "20대" },
    });
    expect(m).toContain("작성자 배경");
    expect(m).toContain("신입 개발자");
    expect(m).toContain("20대");
  });

  it("profile이 비어(role/age 없음)이면 배경 줄을 생략", () => {
    const m = buildUserMessage({ situation: baseSit, draft: "d", profile: { role: "" } });
    expect(m).not.toContain("작성자 배경");
  });

  it("thread가 있으면 대화 이력을 상대/나로 표기", () => {
    const thread: ThreadItem[] = [
      { from: "them", text: "왜 늦었어요?" },
      { from: "me", text: "죄송합니다" },
    ];
    const m = buildUserMessage({ situation: baseSit, draft: "d", thread });
    expect(m).toContain("지금까지의 대화");
    expect(m).toContain("상대: 왜 늦었어요?");
    expect(m).toContain("나: 죄송합니다");
  });

  it("direction과 background가 있으면 해당 줄을 포함", () => {
    const sit: Situation = { ...baseSit, direction: "겸손하게", background: "지난주에도 지각함" };
    const m = buildUserMessage({ situation: sit, draft: "d" });
    expect(m).toContain("'적절'의 방향");
    expect(m).toContain("겸손하게");
    expect(m).toContain("사건 배경");
    expect(m).toContain("지난주에도 지각함");
  });
});

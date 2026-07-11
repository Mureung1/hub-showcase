import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { sampleAnalysis } from "../data/sampleAnalysis";
import type { ContextAnalysisResult } from "../types/context";
import KnowledgeMap from "./KnowledgeMap";

const dynamicMap: ContextAnalysisResult["knowledgeMap"] = {
  nodes: [
    {
      id: "topic-main",
      label: "동적 프로젝트",
      type: "topic",
      summary: "분석 API가 생성한 중심 주제",
    },
    {
      id: "person-1",
      label: "민지",
      type: "person",
      summary: "입력 흐름 관점",
    },
    {
      id: "decision-1",
      label: "직접 입력 MVP",
      type: "decision",
      summary: "직접 입력 방식으로 시작",
      evidence: [{ sourceRecordId: "source-1", sourceTitle: "첫 회의", quote: "직접 입력으로 시작한다." }],
    },
    {
      id: "question-1",
      label: "다음 회의 질문",
      type: "question",
      summary: "다음 회의 확인 질문",
    },
  ],
  links: [
    { from: "person-1", to: "topic-main", relation: "관점 제공" },
    { from: "topic-main", to: "decision-1", relation: "결정사항" },
    { from: "decision-1", to: "question-1", relation: "추가 확인 필요" },
    { from: "missing", to: "question-1", relation: "고아 연결" },
  ],
};

describe("KnowledgeMap", () => {
  it("renders legacy knowledge-map data as an interactive, accessible brain canvas", () => {
    render(<KnowledgeMap map={dynamicMap} />);

    const canvas = screen.getByTestId("brain-canvas");
    expect(within(canvas).getByRole("img", { name: /프로젝트 맥락 지도/ })).toBeInTheDocument();
    expect(within(canvas).getByTestId("brain-node-brain-topic-topic-main")).toHaveAccessibleName(
      "중심 주제 생각: 동적 프로젝트",
    );
    expect(within(canvas).getByTestId("brain-node-brain-perspective-person-1")).toBeInTheDocument();
    expect(within(canvas).getByTestId("brain-node-brain-decision-decision-1")).toBeInTheDocument();
    expect(within(canvas).getByTestId("brain-node-brain-question-question-1")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "생각과 연결 관계 목록" })).toBeInTheDocument();
    expect(screen.queryByText("고아 연결")).not.toBeInTheDocument();
  });

  it("selects a thought, exposes relationships, and opens its evidence", async () => {
    const user = userEvent.setup();
    const onOpenEvidence = vi.fn();
    render(<KnowledgeMap map={dynamicMap} onOpenEvidence={onOpenEvidence} />);

    const decision = screen.getByTestId("brain-node-brain-decision-decision-1");
    await user.click(decision);

    expect(decision).toHaveAttribute("aria-pressed", "true");
    const inspector = screen.getByRole("complementary", { name: "선택한 생각 상세" });
    expect(within(inspector).getByRole("heading", { name: "직접 입력 MVP" })).toBeInTheDocument();
    expect(within(inspector).getByText("추가 확인 필요")).toBeInTheDocument();

    await user.click(within(inspector).getByRole("button", { name: "근거 1개 열기" }));
    expect(onOpenEvidence).toHaveBeenCalledWith(dynamicMap.nodes[2].evidence);
  });

  it("supports category filtering, search, and arrow-key traversal", async () => {
    const user = userEvent.setup();
    render(<KnowledgeMap result={sampleAnalysis} />);

    const perspective = screen.getByTestId("brain-node-brain-perspective-participant-hyunwoo");
    const term = screen.getByTestId("brain-node-brain-term-공동-맥락-0");
    perspective.focus();
    await user.keyboard("{ArrowRight}");
    expect(term).toHaveFocus();

    const questionFilter = screen.getByRole("button", { name: "질문 3" });
    await user.click(questionFilter);
    expect(questionFilter).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByRole("button", { name: /질문 생각:/ })).toHaveLength(3);

    const search = screen.getByRole("searchbox", { name: "생각 검색" });
    await user.type(search, "개인정보");
    expect(screen.getByRole("status")).toHaveTextContent("2개 생각을 표시합니다.");
    expect(screen.getAllByRole("button", { name: /개인정보 주의 문구/ }).length).toBeGreaterThan(0);

    await user.clear(search);
    await user.type(search, "존재하지 않는 생각");
    expect(screen.getByRole("status")).toHaveTextContent("검색 조건과 일치하는 생각이 없습니다.");
    expect(screen.getByText("필터나 검색어를 바꿔 다른 생각을 찾아보세요.")).toBeInTheDocument();
  });

  it("renders an explicit empty state", () => {
    render(<KnowledgeMap map={{ nodes: [], links: [] }} />);
    expect(screen.getByText("분석 결과에서 표시할 생각을 찾지 못했습니다.")).toBeInTheDocument();
    expect(screen.queryByTestId("brain-canvas")).not.toBeInTheDocument();
  });
});

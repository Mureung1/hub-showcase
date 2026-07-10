import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
      label: "결정 1",
      type: "decision",
      summary: "직접 입력 MVP",
    },
    {
      id: "question-1",
      label: "질문 1",
      type: "question",
      summary: "다음 회의 확인 질문",
    },
  ],
  links: [
    { from: "person-1", to: "topic-main", relation: "관점 제공" },
    { from: "topic-main", to: "decision-1", relation: "결정사항" },
    { from: "decision-1", to: "question-1", relation: "추가 확인 필요" },
  ],
};

describe("KnowledgeMap", () => {
  it("renders API-generated node IDs and their relationships", () => {
    render(<KnowledgeMap map={dynamicMap} />);

    const graph = screen.getByRole("img", {
      name: "4개 노드와 3개 연결로 구성된 프로젝트 맥락 지도",
    });
    const graphQueries = within(graph);

    expect(graphQueries.getByText("동적 프로젝트")).toBeInTheDocument();
    expect(graphQueries.getByText("민지")).toBeInTheDocument();
    expect(graphQueries.getByText("결정 1")).toBeInTheDocument();
    expect(graphQueries.getByText("질문 1")).toBeInTheDocument();
    expect(graphQueries.getByText("관점 제공")).toBeInTheDocument();
    expect(graphQueries.getByText("결정사항")).toBeInTheDocument();
    expect(graphQueries.getByText("추가 확인 필요")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "지식맵 노드 상세" })).toBeInTheDocument();
  });
});

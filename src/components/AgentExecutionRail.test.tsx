import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { sampleAnalysis } from "../data/sampleAnalysis";
import type { AnalysisRunResource, AnalysisRunStepEventResource } from "../types/platform";
import AgentExecutionRail from "./AgentExecutionRail";

describe("AgentExecutionRail", () => {
  it("shows verified stages and evidence metrics without internal reasoning", () => {
    render(
      <AgentExecutionRail
        run={run({ provider: { mode: "openai", model: "gpt-test" } })}
        events={[
          event({ sequence: 1, eventKey: "source_snapshot:started", step: "source_snapshot", status: "started" }),
          event({ sequence: 2, eventKey: "source_snapshot:succeeded", step: "source_snapshot", status: "succeeded", sourceCount: 3, inputCharacters: 4200 }),
          event({ sequence: 3, eventKey: "provider_analysis:succeeded", step: "provider_analysis", status: "succeeded", durationMs: 840 }),
          event({ sequence: 4, eventKey: "evidence_validation:succeeded", step: "evidence_validation", status: "succeeded", validationOutcome: "passed", evidenceReferenceCount: 9 }),
          event({ sequence: 5, eventKey: "result_persistence:succeeded", step: "result_persistence", status: "succeeded" }),
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "분석 실행 영수증" })).toBeInTheDocument();
    expect(screen.getByText("자료 고정")).toBeInTheDocument();
    expect(screen.getByText("구조화")).toBeInTheDocument();
    expect(screen.getByText("근거 검증")).toBeInTheDocument();
    expect(screen.getByText("결과 저장")).toBeInTheDocument();
    expect(screen.getByText("3개")).toBeInTheDocument();
    expect(screen.getByText("9개")).toBeInTheDocument();
    expect(screen.getByText("9/10")).toBeInTheDocument();
    expect(screen.getByText("파이프라인 2.0")).toBeInTheDocument();
    expect(screen.getByText("gpt-test", { selector: ".agent-mode-badge" })).toBeInTheDocument();
    expect(screen.getByText("OpenAI 전송 범위 확인")).toBeInTheDocument();
    expect(screen.queryByText(/chain of thought|사고 과정:/i)).not.toBeInTheDocument();
  });

  it("labels legacy runs honestly when no step events exist", () => {
    render(<AgentExecutionRail run={run()} events={[]} />);
    expect(screen.getByText("이 실행은 단계 기록 기능이 추가되기 전에 생성되었습니다.")).toBeInTheDocument();
    expect(screen.getByText("외부 전송 없음", { selector: "strong" })).toBeInTheDocument();
  });

  it("uses persisted receipt stages when detailed events are unavailable", () => {
    render(
      <AgentExecutionRail
        run={run({
          stages: [{
            name: "source_snapshot",
            status: "succeeded",
            validationOutcome: "passed",
            code: "SNAPSHOT_READY",
            durationMs: 12,
          }],
        })}
        events={[]}
      />,
    );
    expect(screen.queryByText(/단계 기록 기능이 추가되기 전/)).not.toBeInTheDocument();
    expect(screen.getByText("12ms · 검증 통과")).toBeInTheDocument();
  });

  it("distinguishes loading, failed, cancelled, and waiting stages", () => {
    const { rerender } = render(
      <AgentExecutionRail run={run({ status: "running", completedAt: null })} events={[]} loading />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("불러오는 중");

    rerender(
      <AgentExecutionRail
        run={run({ status: "failed" })}
        events={[
          event({ sequence: 1, eventKey: "source_snapshot:succeeded", step: "source_snapshot", status: "succeeded", code: "SNAPSHOT_READY" }),
          event({ sequence: 2, eventKey: "provider_analysis:cancelled", step: "provider_analysis", status: "cancelled", code: "REQUEST_CANCELLED" }),
          event({ sequence: 3, eventKey: "evidence_validation:failed", step: "evidence_validation", status: "failed", validationOutcome: "failed", code: "EVIDENCE_VALIDATION_FAILED" }),
        ]}
      />,
    );

    expect(screen.getByText("실패", { selector: ".run-status" })).toBeInTheDocument();
    expect(screen.getByText("검토 필요")).toBeInTheDocument();
    expect(screen.getByText("취소")).toBeInTheDocument();
    expect(screen.getByText("대기")).toBeInTheDocument();
    expect(screen.getByText("실패", { selector: ".run-status" })).toBeInTheDocument();
  });
});

function run(overrides: Partial<AnalysisRunResource> = {}): AnalysisRunResource {
  const base: AnalysisRunResource = {
    id: "run-1",
    projectId: "project-1",
    status: "succeeded",
    schemaVersion: "2.0",
    pipelineVersion: "2.0",
    stages: [],
    evidenceCoverage: { eligible: 10, validated: 9 },
    sourceIds: ["source-1"],
    provider: { mode: "local" },
    result: sampleAnalysis,
    createdAt: "2026-07-11T00:00:00.000Z",
    completedAt: "2026-07-11T00:00:01.250Z",
  };
  return {
    ...base,
    ...overrides,
    pipelineVersion: overrides.pipelineVersion ?? base.pipelineVersion,
    stages: overrides.stages ?? base.stages,
    evidenceCoverage: overrides.evidenceCoverage ?? base.evidenceCoverage,
  };
}

function event(overrides: Partial<AnalysisRunStepEventResource>): AnalysisRunStepEventResource {
  return {
    id: `event-${overrides.sequence ?? 1}`,
    analysisRunId: "run-1",
    sequence: 1,
    eventKey: "source_snapshot:started",
    step: "source_snapshot",
    status: "started",
    validationOutcome: null,
    code: null,
    durationMs: null,
    sourceCount: null,
    inputCharacters: null,
    outputItemCount: null,
    evidenceReferenceCount: null,
    createdAt: "2026-07-11T00:00:00Z",
    ...overrides,
  };
}

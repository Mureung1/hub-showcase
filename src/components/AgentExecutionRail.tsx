import type {
  AnalysisRunResource,
  AnalysisRunStep,
  AnalysisRunStepEventResource,
} from "../types/platform";
import { summarizeResultEvidenceCoverage } from "./evidenceCoverage";

const steps: { id: AnalysisRunStep; label: string; description: string }[] = [
  { id: "source_snapshot", label: "자료 고정", description: "선택한 원문을 불변 스냅숏으로 고정" },
  { id: "provider_analysis", label: "구조화", description: "원문을 데이터로만 읽고 관점·결정·질문 추출" },
  { id: "evidence_validation", label: "근거 검증", description: "모든 인용이 실제 원문에 있는지 확인" },
  { id: "result_persistence", label: "결과 저장", description: "검증된 결과와 실행 이력을 저장" },
];

function AgentExecutionRail({
  events,
  run,
  loading = false,
}: {
  events: AnalysisRunStepEventResource[];
  run: AnalysisRunResource;
  loading?: boolean;
}) {
  const latestByStep = new Map<AnalysisRunStep, AnalysisRunStepEventResource>();
  for (const event of [...events].sort((left, right) => left.sequence - right.sequence)) {
    latestByStep.set(event.step, event);
  }
  const persistedByStep = new Map(run.stages.map((stage) => [stage.name, stage]));
  const evidenceEvent = latestByStep.get("evidence_validation");
  const sourceEvent = latestByStep.get("source_snapshot");
  const resultCoverage = summarizeResultEvidenceCoverage(run.result);
  const coverage = run.evidenceCoverage ?? {
    eligible: resultCoverage.eligible,
    validated: resultCoverage.validated,
  };
  const sourceCount = sourceEvent?.sourceCount ?? run.sourceIds.length;
  const durationMs = runDuration(run, events);
  const providerLabel = run.provider.mode === "openai"
    ? run.provider.model ?? "OpenAI"
    : "로컬 분석";

  return (
    <section className="agent-execution-panel" aria-labelledby="agent-execution-title">
      <div className="section-row agent-execution-heading">
        <div>
          <p className="section-kicker">Execution receipt</p>
          <h2 id="agent-execution-title">분석 실행 영수증</h2>
          <p>내부 추론이나 모델의 사고 과정 대신 입력 범위와 검증 결과만 표시합니다.</p>
        </div>
        <div className="agent-execution-state">
          <span className="agent-mode-badge">파이프라인 {run.pipelineVersion}</span>
          <span className="agent-mode-badge">{providerLabel}</span>
          <span className={`run-status ${run.status}`}>{runStatusLabel(run.status)}</span>
        </div>
      </div>

      <dl className="agent-execution-metrics" aria-label="분석 실행 요약">
        <div><dt>실행 모드</dt><dd>{providerLabel}</dd></div>
        <div><dt>선택 원문</dt><dd>{sourceCount.toLocaleString("ko-KR")}개</dd></div>
        <div><dt>입력 문자</dt><dd>{sourceEvent?.inputCharacters === null || sourceEvent?.inputCharacters === undefined ? "기록 없음" : sourceEvent.inputCharacters.toLocaleString("ko-KR")}</dd></div>
        <div><dt>실행 시간</dt><dd>{durationMs === null ? "기록 없음" : formatDuration(durationMs)}</dd></div>
        <div><dt>근거 판독</dt><dd>{coverage.eligible === 0 ? "근거 미제공" : `${coverage.validated}/${coverage.eligible}`}</dd></div>
        <div><dt>검증된 인용</dt><dd>{evidenceEvent?.evidenceReferenceCount ?? resultCoverage.evidenceCount}개</dd></div>
      </dl>

      {loading ? (
        <p className="agent-execution-empty" role="status">실행 단계를 불러오는 중…</p>
      ) : events.length === 0 && run.stages.length === 0 ? (
        <p className="agent-execution-empty">이 실행은 단계 기록 기능이 추가되기 전에 생성되었습니다.</p>
      ) : (
        <ol className="agent-execution-rail">
          {steps.map((step, index) => {
            const event = latestByStep.get(step.id);
            const persisted = persistedByStep.get(step.id);
            const status = event?.status ?? persisted?.status ?? "waiting";
            return (
              <li key={step.id} className={status}>
                <span className="agent-execution-index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <strong>{step.label}</strong>
                  <p>{step.description}</p>
                  {(event || persisted) && <small>{event ? eventSummary(event) : persistedStageSummary(persisted!)}</small>}
                </div>
                <span className="agent-execution-status">{stepStatusLabel(status)}</span>
              </li>
            );
          })}
        </ol>
      )}

      {run.provider.mode === "openai" ? (
        <details className="agent-transfer-preview">
          <summary>OpenAI 전송 범위 확인</summary>
          <div>
            <p>선택 원문 {sourceCount.toLocaleString("ko-KR")}개{sourceEvent?.inputCharacters ? ` · ${sourceEvent.inputCharacters.toLocaleString("ko-KR")}자` : ""}와 구조화 출력 스키마를 분석 요청에 사용했습니다.</p>
            <p>API 저장은 비활성화되며, 내부 추론 내용은 결과나 실행 이력에 포함하지 않습니다.</p>
          </div>
        </details>
      ) : (
        <p className="agent-transfer-none"><strong>외부 전송 없음</strong> · 선택한 원문은 로컬 분석 경로에서만 처리했습니다.</p>
      )}
    </section>
  );
}

function eventSummary(event: AnalysisRunStepEventResource) {
  const values = [
    event.durationMs === null ? null : `${event.durationMs.toLocaleString("ko-KR")}ms`,
    event.outputItemCount === null ? null : `항목 ${event.outputItemCount}개`,
    event.evidenceReferenceCount === null ? null : `인용 ${event.evidenceReferenceCount}개`,
  ].filter(Boolean);
  return values.join(" · ") || event.code || "단계 기록 완료";
}

function persistedStageSummary(stage: AnalysisRunResource["stages"][number]) {
  const values = [
    stage.durationMs === null ? null : `${stage.durationMs.toLocaleString("ko-KR")}ms`,
    stage.validationOutcome === "passed" ? "검증 통과" : stage.validationOutcome === "failed" ? "검증 실패" : null,
  ].filter(Boolean);
  return values.join(" · ") || stage.code || "단계 기록 완료";
}

function stepStatusLabel(status: AnalysisRunStepEventResource["status"] | "waiting") {
  return {
    waiting: "대기",
    started: "진행 중",
    succeeded: "검증됨",
    failed: "검토 필요",
    cancelled: "취소",
  }[status];
}

function runStatusLabel(status: AnalysisRunResource["status"]) {
  return { running: "진행 중", succeeded: "성공", failed: "실패", cancelled: "취소" }[status];
}

function runDuration(run: AnalysisRunResource, events: AnalysisRunStepEventResource[]) {
  if (run.completedAt) {
    const startedAt = Date.parse(run.createdAt);
    const completedAt = Date.parse(run.completedAt);
    if (Number.isFinite(startedAt) && Number.isFinite(completedAt) && completedAt >= startedAt) {
      return completedAt - startedAt;
    }
  }
  const durations = events.flatMap((event) => event.durationMs === null ? [] : [event.durationMs]);
  return durations.length > 0 ? durations.reduce((total, value) => total + value, 0) : null;
}

function formatDuration(durationMs: number) {
  if (durationMs < 1_000) return `${durationMs.toLocaleString("ko-KR")}ms`;
  const seconds = durationMs / 1_000;
  return `${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds).toLocaleString("ko-KR")}초`;
}

export default AgentExecutionRail;

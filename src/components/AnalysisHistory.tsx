import { useEffect, useRef, useState } from "react";
import {
  CaretDownIcon,
  ClockCounterClockwiseIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import type { ContextAnalysisResultV2, EvidenceRef } from "../types/context";
import type {
  AnalysisRunAnnotationResource,
  AnalysisRunResource,
  AnalysisRunStepEventResource,
  CreateAnalysisRunAnnotationInput,
} from "../types/platform";
import AnalysisComparison from "./AnalysisComparison";
import AnalysisFeedbackPanel from "./AnalysisFeedbackPanel";
import AgentExecutionRail from "./AgentExecutionRail";
import DecisionList from "./DecisionList";
import EvidenceCoverageBadge from "./EvidenceCoverageBadge";
import KeyTerms from "./KeyTerms";
import ParticipantAgentPanel from "./ParticipantAgentPanel";
import PerspectiveTable from "./PerspectiveTable";
import QuestionList from "./QuestionList";
import { summarizeResultEvidenceCoverage } from "./evidenceCoverage";

type AnalysisHistoryProps = {
  runs: AnalysisRunResource[];
  selectedRun: AnalysisRunResource | null;
  latest?: AnalysisRunResource;
  previous?: AnalysisRunResource;
  stepEvents: AnalysisRunStepEventResource[];
  annotations: AnalysisRunAnnotationResource[];
  artifactsLoading: boolean;
  artifactsError: string | null;
  detailLoading: boolean;
  detailError: string | null;
  comparisonLoading: boolean;
  comparisonError: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => Promise<void>;
  onRetryDetail: (runId: string) => Promise<void>;
  onRetryComparison: (runId: string) => Promise<void>;
  onSelectRun: (id: string) => void;
  onStartNewAnalysis: () => void;
  onDeleteRun: (id: string) => Promise<void>;
  onOpenEvidence: (evidence: EvidenceRef[]) => void;
  onCreateAnnotation: (
    input: CreateAnalysisRunAnnotationInput,
    idempotencyKey: string,
  ) => Promise<AnalysisRunAnnotationResource>;
};

function AnalysisHistory({
  runs,
  selectedRun,
  latest,
  previous,
  stepEvents,
  annotations,
  artifactsLoading,
  artifactsError,
  detailLoading,
  detailError,
  comparisonLoading,
  comparisonError,
  hasMore,
  loadingMore,
  onLoadMore,
  onRetryDetail,
  onRetryComparison,
  onSelectRun,
  onStartNewAnalysis,
  onDeleteRun,
  onOpenEvidence,
  onCreateAnnotation,
}: AnalysisHistoryProps) {
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deletingRunId, setDeletingRunId] = useState<string | null>(null);
  const confirmDeleteRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (confirmingDeleteId) confirmDeleteRef.current?.focus();
  }, [confirmingDeleteId]);

  const closeDeleteConfirmation = (runId: string) => {
    setConfirmingDeleteId(null);
    window.setTimeout(() => document.getElementById(`analysis-delete-${runId}`)?.focus(), 0);
  };

  const deleteRun = async (runId: string) => {
    if (deletingRunId) return;
    setDeletingRunId(runId);
    try {
      await onDeleteRun(runId);
      setConfirmingDeleteId(null);
    } catch {
      // The page-level alert owns the sanitized API error message.
    } finally {
      setDeletingRunId(null);
    }
  };

  if (runs.length === 0) return <EmptyAnalysis />;
  return (
    <div className="history-layout analysis-ledger">
      <aside className="run-list analysis-run-ledger" aria-label="분석 실행 이력">
        <div className="run-ledger-heading">
          <div><p className="section-kicker">분석 기록</p><h2>분석 이력</h2></div>
          <button className="run-create-button" type="button" onClick={onStartNewAnalysis}>
            <PlusIcon aria-hidden="true" size={16} weight="regular" />
            새 분석
          </button>
        </div>
        {runs.map((run) => (
          <button
            key={run.id}
            className={selectedRun?.id === run.id ? "active" : ""}
            type="button"
            onClick={() => {
              setConfirmingDeleteId(null);
              onSelectRun(run.id);
            }}
          >
            <span className="run-ledger-date">{formatDateTime(run.createdAt)}</span>
            <strong>{run.provider.mode === "openai" ? run.provider.model ?? "OpenAI 분석" : "로컬 맥락 분석"}</strong>
            <small><span className={`run-status ${run.status}`}>{statusLabel(run.status)}</span> · 기록 {run.sourceIds.length}개</small>
          </button>
        ))}
        {hasMore && (
          <button className="button secondary" type="button" disabled={loadingMore} onClick={() => void onLoadMore()}>
            {loadingMore ? "이력 더 불러오는 중…" : "분석 이력 50건 더 불러오기"}
          </button>
        )}
        <div className="run-ledger-summary" aria-label="분석 이력 요약">
          <span>전체 실행</span><strong>{runs.length}건</strong>
          <span>성공 분석</span><strong>{runs.filter((run) => run.status === "succeeded").length}건</strong>
        </div>
      </aside>
      <article className="run-detail decision-workspace">
        {selectedRun && (
          <>
            <div className="run-context-strip" aria-label="선택한 분석 정보">
              <span><ClockCounterClockwiseIcon aria-hidden="true" size={16} weight="regular" /> 분석 실행</span>
              <time dateTime={selectedRun.createdAt}>{formatDateTime(selectedRun.createdAt)}</time>
              <span>기록 {selectedRun.sourceIds.length}개</span>
              <span className={`run-status ${selectedRun.status}`}>{statusLabel(selectedRun.status)}</span>
            </div>
            <div className="run-detail-toolbar">
              <div>
                <p className="section-kicker">선택한 분석</p>
                <strong>이 실행에서 확인된 결정 맥락</strong>
              </div>
              <button
                id={`analysis-delete-${selectedRun.id}`}
                className="text-button danger"
                type="button"
                aria-expanded={confirmingDeleteId === selectedRun.id}
                aria-controls={`analysis-delete-confirm-${selectedRun.id}`}
                onClick={() => setConfirmingDeleteId(selectedRun.id)}
              >
                <TrashIcon aria-hidden="true" size={16} weight="regular" />
                선택한 분석 삭제
              </button>
            </div>
            {confirmingDeleteId === selectedRun.id && (
              <div
                id={`analysis-delete-confirm-${selectedRun.id}`}
                className="inline-confirm"
                role="alertdialog"
                aria-labelledby={`analysis-delete-title-${selectedRun.id}`}
                aria-describedby={`analysis-delete-description-${selectedRun.id}`}
              >
                <div>
                  <strong id={`analysis-delete-title-${selectedRun.id}`}>이 분석 이력을 삭제할까요?</strong>
                  <p id={`analysis-delete-description-${selectedRun.id}`}>결과, 실행 단계, 검토 의견과 연결된 공유 링크가 함께 삭제되며 되돌릴 수 없습니다.</p>
                </div>
                <div className="confirm-actions">
                  <button
                    ref={confirmDeleteRef}
                    className="button destructive"
                    type="button"
                    disabled={deletingRunId === selectedRun.id}
                    onClick={() => void deleteRun(selectedRun.id)}
                  >
                    {deletingRunId === selectedRun.id ? "삭제 중…" : "분석 삭제 확인"}
                  </button>
                  <button className="button secondary" type="button" disabled={deletingRunId === selectedRun.id} onClick={() => closeDeleteConfirmation(selectedRun.id)}>
                    취소
                  </button>
                </div>
              </div>
            )}
            {selectedRun.status !== "succeeded" && (
              <AgentExecutionRail
                events={stepEvents}
                run={selectedRun}
                loading={artifactsLoading}
              />
            )}
          </>
        )}
        {artifactsError && <div className="notice error" role="alert">{artifactsError}</div>}
        {selectedRun?.status === "failed" ? <div className="notice error">{selectedRun.error?.message ?? "분석 실행이 실패했습니다."}</div> : selectedRun?.status === "running" ? <div className="loading-card">분석이 진행 중입니다.</div> : detailLoading ? <div className="loading-card" role="status">선택한 분석의 상세 결과를 불러오는 중…</div> : detailError && selectedRun ? <div className="notice error" role="alert">{detailError}<button type="button" onClick={() => void onRetryDetail(selectedRun.id)}>다시 시도</button></div> : selectedRun?.result ? (
          <>
            <div className="history-priority-stack">
              <AnalysisResultOverview result={selectedRun.result} />
              <DecisionList
                decisions={selectedRun.result.decisions}
                onOpenEvidence={onOpenEvidence}
                presentation="featured"
              />
              {comparisonLoading && <div className="loading-card" role="status">비교할 이전 성공 분석을 불러오는 중…</div>}
              {comparisonError && previous && (
                <div className="notice warning" role="alert">
                  이전 분석 비교를 불러오지 못했습니다. {comparisonError}
                  <button type="button" onClick={() => void onRetryComparison(previous.id)}>다시 시도</button>
                </div>
              )}
              <AnalysisComparison previous={previous?.result} latest={latest?.result} />
              <div className="decision-support-grid">
                <QuestionList
                  questions={selectedRun.result.questions}
                  onOpenEvidence={onOpenEvidence}
                  presentation="brief"
                />
                <PerspectiveTable
                  participants={selectedRun.result.participants}
                  onOpenEvidence={onOpenEvidence}
                  presentation="summary"
                />
              </div>
              <AgentExecutionRail
                events={stepEvents}
                run={selectedRun}
                loading={artifactsLoading}
              />
              <details className="analysis-secondary-details">
                <summary>
                  <span><strong>확장 분석 보기</strong><small>참여자 종합과 핵심어</small></span>
                  <CaretDownIcon aria-hidden="true" size={18} weight="regular" />
                </summary>
                <div className="analysis-secondary-content">
                  <ParticipantAgentPanel synthesis={selectedRun.result.participantAgents} />
                  <KeyTerms terms={selectedRun.result.keyTerms} />
                </div>
              </details>
            </div>
            <AnalysisFeedbackPanel
              result={selectedRun.result}
              annotations={annotations}
              loading={artifactsLoading}
              onCreate={onCreateAnnotation}
            />
          </>
        ) : <div className="empty-card">이 실행에는 표시할 결과가 없습니다.</div>}
      </article>
    </div>
  );
}

function AnalysisResultOverview({ result }: { result: ContextAnalysisResultV2 }) {
  const coverage = summarizeResultEvidenceCoverage(result);

  return (
    <section className="analysis-result-overview" aria-labelledby="analysis-result-overview-title">
      <header>
        <div>
          <p className="section-kicker">Analysis summary</p>
          <h2 id="analysis-result-overview-title">{result.projectTitle}</h2>
        </div>
        <EvidenceCoverageBadge {...coverage} label="근거 판독" />
      </header>
      {result.summary.overview.length > 0 ? (
        <ol>
          {result.summary.overview.slice(0, 3).map((item) => <li key={item}>{item}</li>)}
        </ol>
      ) : <p>이번 실행에서 별도의 요약 문장이 생성되지 않았습니다.</p>}
      <dl aria-label="분석 결과 핵심 수치">
        <div><dt>결정</dt><dd>{result.decisions.length}</dd></div>
        <div><dt>미결 질문</dt><dd>{result.questions.length}</dd></div>
        <div><dt>관점</dt><dd>{result.participants.length}</dd></div>
        <div><dt>근거 판독</dt><dd>{coverage.eligible === 0 ? "근거 미제공" : `${coverage.validated}/${coverage.eligible}`}</dd></div>
      </dl>
    </section>
  );
}

function EmptyAnalysis() {
  return <div className="empty-card large-empty"><strong>아직 성공한 분석이 없습니다.</strong><p>개요 탭에서 기록을 선택하고 새 분석을 실행해 주세요.</p></div>;
}

function statusLabel(status: AnalysisRunResource["status"]) {
  return { running: "진행 중", succeeded: "성공", failed: "실패", cancelled: "취소" }[status];
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

export default AnalysisHistory;

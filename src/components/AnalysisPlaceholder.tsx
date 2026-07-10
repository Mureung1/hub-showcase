type AnalysisPlaceholderStatus = "idle" | "loading" | "error";

type AnalysisPlaceholderProps = {
  status: AnalysisPlaceholderStatus;
  message?: string | null;
  surface: "summary" | "workspace";
};

const placeholderCopy: Record<
  AnalysisPlaceholderStatus,
  { kicker: string; title: string; description: string }
> = {
  idle: {
    kicker: "Ready for context",
    title: "분석을 시작해 주세요",
    description: "프로젝트 기록을 입력하거나 예시를 직접 불러오면 결과가 이곳에 표시됩니다.",
  },
  loading: {
    kicker: "Connecting context",
    title: "맥락을 연결하고 있습니다",
    description: "결정 배경, 참여자 관점, 미결 질문을 구분해 공유 구조로 만들고 있습니다.",
  },
  error: {
    kicker: "Analysis unavailable",
    title: "분석 결과를 표시하지 않았습니다",
    description: "이전 결과나 샘플로 대체하지 않았습니다. 입력을 확인한 뒤 다시 시도해 주세요.",
  },
};

function AnalysisPlaceholder({ status, message, surface }: AnalysisPlaceholderProps) {
  const copy = placeholderCopy[status];
  const headingId = surface === "summary" ? "summary-title" : "result-placeholder-title";

  return (
    <section
      className={`${surface === "summary" ? "summary-panel" : "result-placeholder"} analysis-placeholder ${status}`}
      aria-labelledby={headingId}
      aria-live={status === "loading" && surface === "summary" ? "polite" : undefined}
      aria-busy={status === "loading"}
    >
      <span className="placeholder-mark" aria-hidden="true" />
      <p className="section-kicker">{copy.kicker}</p>
      <h2 id={headingId}>{copy.title}</h2>
      <p>{message || copy.description}</p>
    </section>
  );
}

export default AnalysisPlaceholder;

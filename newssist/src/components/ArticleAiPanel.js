const SIMPLIFY_LEVELS = [
  { value: 'easy', label: '입문' },
  { value: 'medium', label: '일반' },
];

// 03_article.html 와이어프레임의 우측 AI 패널.
// "AI 요약"(난이도 무관, 단일 스타일)과 "쉽게 설명"(원문을 난이도에 맞게 다시 씀)은 서로 다른 기능이고,
// 통찰 난이도 토글은 "쉽게 설명"에만 영향을 준다 — "AI 요약" 클릭은 난이도와 무관하게 항상 같은 결과.
export default function ArticleAiPanel({
  mode,
  simplifyLevel,
  onSelectSimplifyLevel,
  onClickSummary,
  onClickSimplify,
  loading,
  error,
  content,
}) {
  return (
    <aside className="hidden lg:flex flex-col w-[400px] shrink-0 bg-surface-container-low border border-outline-variant rounded-xl sticky top-[104px] self-start">
      <div className="p-stack-md border-b border-outline-variant flex flex-col gap-stack-sm">
        <div className="flex items-center justify-between gap-stack-sm">
          <span className="font-label-mono text-label-mono uppercase tracking-wide text-on-surface-variant">
            통찰 난이도 (쉽게 설명 전용)
          </span>
          <div className="flex p-1 bg-surface rounded-xl border border-outline-variant">
            {SIMPLIFY_LEVELS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => onSelectSimplifyLevel(value)}
                className={`px-3 py-1.5 font-label-mono text-label-mono rounded-lg transition-all ${
                  simplifyLevel === value ? 'bg-btn-gray text-on-surface' : 'text-on-surface-variant'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-stack-sm">
          <button
            type="button"
            onClick={onClickSummary}
            className="flex-1 py-2.5 bg-primary text-on-primary font-label-mono text-label-mono rounded-lg flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">summarize</span>
            AI 요약
          </button>
          <button
            type="button"
            onClick={onClickSimplify}
            className="flex-1 py-2.5 bg-btn-gray text-on-surface font-label-mono text-label-mono rounded-lg flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">lightbulb</span>
            쉽게 설명
          </button>
        </div>
      </div>

      <div className="p-stack-md flex-1">
        <span className="font-label-mono text-label-mono uppercase tracking-wide text-primary">
          {mode === 'simplify' ? '쉽게 설명' : 'AI 요약'}
        </span>

        {!mode && (
          <p className="font-body-md text-body-md text-on-surface-variant mt-stack-sm">
            버튼을 누르면 AI가 이 기사를 요약하거나 쉽게 풀어서 보여드려요.
          </p>
        )}
        {loading && (
          <p className="font-body-md text-body-md text-on-surface-variant mt-stack-sm">생성 중...</p>
        )}
        {error && <p className="font-body-md text-body-md text-error mt-stack-sm">{error}</p>}
        {!loading && !error && content && (
          <p className="font-body-md text-body-lg text-on-surface italic leading-relaxed mt-stack-sm whitespace-pre-line">
            {content}
          </p>
        )}
      </div>

      <div className="p-stack-sm border-t border-outline-variant flex items-center gap-2">
        <span className="material-symbols-outlined text-on-surface-variant text-[16px]">cached</span>
        <span className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wide">
          같은 요청 재클릭 시 즉시 표시
        </span>
      </div>
    </aside>
  );
}

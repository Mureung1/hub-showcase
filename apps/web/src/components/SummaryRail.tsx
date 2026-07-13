import type { SessionMode } from "../session/types";

interface SummaryRailProps {
  mode: SessionMode;
  kinds: number; // 상품 종류(라인 수)
  totalQty: number; // 총 수량
  imminentCount: number; // 유통기한 임박 라인 수(입고만)
  pendingCount: number; // 미등록(등록 대기) 라인 수
  hasLines: boolean;
  onCommit: () => void;
  onClear: () => void;
}

const MODE_LABEL: Record<SessionMode, string> = { inbound: "입고", outbound: "출고" };

// 요약 레일(디자인). 요약 카드 → spacer → 확정 CTA → 전체 비우기.
// pending이 하나라도 있으면 CTA 잠금 + 사유("등록 대기 N건")를 상시 노출(왜 못 누르는지).
export function SummaryRail({
  mode,
  kinds,
  totalQty,
  imminentCount,
  pendingCount,
  hasLines,
  onCommit,
  onClear,
}: SummaryRailProps) {
  const label = MODE_LABEL[mode];
  const canCommit = hasLines && pendingCount === 0;

  return (
    <aside className={`rail rail--${mode}`}>
      <div className="rail__card">
        <h2 className="rail__title">요약</h2>
        <div className="rail__row">
          <span className="rail__key">상품 종류</span>
          <span className="rail__val">{kinds}종</span>
        </div>
        <div className="rail__row">
          <span className="rail__key">총 {label} 수량</span>
          <span className="rail__val">{totalQty}개</span>
        </div>
        {mode === "inbound" && imminentCount > 0 && (
          <div className="rail__alert">
            <span className="dot dot--amber" aria-hidden="true" />
            유통기한 임박 {imminentCount}건 포함
          </div>
        )}
      </div>

      <div className="rail__spacer" />

      {pendingCount > 0 && (
        <p className="rail__pending">등록 대기 {pendingCount}건 — 등록해야 확정할 수 있어요</p>
      )}

      <button
        type="button"
        className="rail__cta"
        disabled={!canCommit}
        onClick={onCommit}
      >
        {label} 확정{hasLines ? ` · ${totalQty}개` : ""}
      </button>

      {hasLines && (
        <button type="button" className="rail__clear" onClick={onClear}>
          전체 비우기
        </button>
      )}
    </aside>
  );
}

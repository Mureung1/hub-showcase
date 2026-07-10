import type { SessionMode } from "../session/types";

interface CommitBarProps {
  mode: SessionMode;
  totalQty: number;
  itemCount: number;
  pendingCount: number;
  onCommit: () => void;
}

const MODE_LABEL: Record<SessionMode, string> = { inbound: "입고", outbound: "출고" };

// 하단 바: 총 품목 수 + 커밋(모드별 확정). pending이 하나라도 있으면 커밋 잠금 +
// "등록 대기 N건"을 상시 표시해 왜 못 누르는지 보이게 한다.
export function CommitBar({ mode, totalQty, itemCount, pendingCount, onCommit }: CommitBarProps) {
  const canCommit = itemCount > 0 && pendingCount === 0;
  return (
    <footer className="commitbar">
      <span className="commitbar__count">
        총 <strong>{totalQty}</strong>개 · {itemCount}품목
      </span>
      <div className="commitbar__actions">
        {pendingCount > 0 && (
          <span className="commitbar__pending">등록 대기 {pendingCount}건</span>
        )}
        <button
          type="button"
          className="btn btn--cta"
          disabled={!canCommit}
          onClick={onCommit}
        >
          {MODE_LABEL[mode]} 확정
        </button>
      </div>
    </footer>
  );
}

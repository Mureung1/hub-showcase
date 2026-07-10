import type { ScanLine } from "../session/types";

interface ScanLineRowProps {
  line: ScanLine;
  recent: boolean;
  onInc: () => void;
  onDec: () => void;
}

// 영수증 한 행: 상품명 · 카테고리 · 상태뱃지 + 수량 +/-. recent면 방금 찍힘을 강조.
export function ScanLineRow({ line, recent, onInc, onDec }: ScanLineRowProps) {
  return (
    <li className={`line-row${recent ? " line-row--recent" : ""}`}>
      <div className="line-row__main">
        <span className="line-row__name">{line.productName}</span>
        <span className="line-row__meta">
          <span className="line-row__cat">{line.category}</span>
          <span className="badge badge--ready">등록</span>
        </span>
      </div>
      <div className="qty">
        <button
          type="button"
          className="qty__btn"
          onClick={onDec}
          disabled={line.quantity <= 1}
          aria-label="수량 감소"
        >
          −
        </button>
        <span className="qty__value">{line.quantity}</span>
        <button
          type="button"
          className="qty__btn"
          onClick={onInc}
          aria-label="수량 증가"
        >
          +
        </button>
      </div>
    </li>
  );
}

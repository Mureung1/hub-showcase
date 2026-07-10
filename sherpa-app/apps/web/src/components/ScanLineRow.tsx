import type { ScanLine } from "../session/types";

interface ScanLineRowProps {
  line: ScanLine;
  recent: boolean;
  onEdit: () => void;
  onInc: () => void;
  onDec: () => void;
}

// 영수증 한 행. ready = 상품명·카테고리·등록 뱃지. pending = 바코드·미등록 뱃지(탭하면 등록 모달).
// recent면 방금 찍힘을 강조. 수량 +/-는 두 상태 공통.
export function ScanLineRow({ line, recent, onEdit, onInc, onDec }: ScanLineRowProps) {
  const isPending = line.status === "pending";
  const className =
    "line-row" +
    (recent ? " line-row--recent" : "") +
    (isPending ? " line-row--pending" : "");

  return (
    <li className={className}>
      {isPending ? (
        <button type="button" className="line-row__main line-row__tap" onClick={onEdit}>
          <span className="line-row__name line-row__name--mono">{line.barcode}</span>
          <span className="line-row__meta">
            <span className="badge badge--pending">미등록</span>
            <span className="line-row__hint">탭하여 등록</span>
          </span>
        </button>
      ) : (
        <div className="line-row__main">
          <span className="line-row__name">{line.productName}</span>
          <span className="line-row__meta">
            <span className="line-row__cat">{line.category}</span>
            <span className="badge badge--ready">등록</span>
          </span>
        </div>
      )}

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

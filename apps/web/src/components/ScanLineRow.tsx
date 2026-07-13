import type { ScanLine, SessionMode } from "../session/types";
import { categoryColor } from "../lib/categoryColor";
import { expiryStatus } from "../lib/date";

interface ScanLineRowProps {
  line: ScanLine;
  recent: boolean;
  mode: SessionMode;
  threshDays: number;
  onEdit: () => void; // pending 행 탭 → 등록 모달
  onExpiry: (iso: string) => void;
  onInc: () => void;
  onDec: () => void;
  onRemove: () => void;
}

// 입고 목록 한 행(디자인). ready = 카테고리 점 · 상품명 + 임박/지남 뱃지 · 유통기한 date input ·
// 수량 스테퍼 · ✕. pending(Sherpa 고유) = 바코드 + 미등록 뱃지(탭→등록) · 스테퍼 · ✕.
// 유통기한 입력·임박 뱃지는 입고 모드에서만(출고는 FEFO라 라인에 유통기한 없음).
// ✕ 삭제는 커밋 전 draft 제거라 확인 없이 즉시(재스캔으로 복구 가능). 전체 비우기만 확인 모달.
export function ScanLineRow({
  line,
  recent,
  mode,
  threshDays,
  onEdit,
  onExpiry,
  onInc,
  onDec,
  onRemove,
}: ScanLineRowProps) {
  const isPending = line.status === "pending";
  const isInbound = mode === "inbound";
  const status = isInbound && !isPending ? expiryStatus(line.expiryDate, threshDays) : null;

  const className =
    "linerow" +
    (recent ? " linerow--recent" : "") +
    (isPending ? " linerow--pending" : "");

  return (
    <li className={className}>
      {isPending ? (
        <button type="button" className="linerow__main linerow__tap" onClick={onEdit}>
          <span className="dot dot--pending" aria-hidden="true" />
          <span className="linerow__body">
            <span className="linerow__name linerow__name--mono">{line.barcode}</span>
            <span className="linerow__sub">
              <span className="badge badge--pending">미등록</span>
              <span className="linerow__hint">탭하여 등록</span>
            </span>
          </span>
        </button>
      ) : (
        <div className="linerow__main">
          <span
            className="dot"
            style={{ background: categoryColor(line.category) }}
            aria-hidden="true"
          />
          <span className="linerow__body">
            <span className="linerow__titlerow">
              <span className="linerow__name">{line.productName}</span>
              {status === "imminent" && (
                <span className="badge badge--imminent">임박</span>
              )}
              {status === "expired" && (
                <span className="badge badge--expired">기한 지남</span>
              )}
            </span>
            <span className="linerow__sub">{line.category}</span>
          </span>
        </div>
      )}

      {isInbound && !isPending && (
        <label className="linerow__expiry">
          <span className="linerow__expiry-label">유통기한</span>
          <input
            type="date"
            className="linerow__date"
            value={line.expiryDate}
            onChange={(e) => onExpiry(e.target.value)}
            aria-label={`${line.productName} 유통기한`}
          />
        </label>
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
        <button type="button" className="qty__btn" onClick={onInc} aria-label="수량 증가">
          +
        </button>
      </div>

      <button
        type="button"
        className="linerow__remove"
        onClick={onRemove}
        aria-label={isPending ? "미등록 항목 삭제" : "목록에서 제거"}
      >
        ✕
      </button>
    </li>
  );
}

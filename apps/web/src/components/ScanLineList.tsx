import type { ScanLine, SessionMode } from "../session/types";
import { ScanLineRow } from "./ScanLineRow";

interface ScanLineListProps {
  lines: ScanLine[];
  lastLineId: string | null;
  mode: SessionMode;
  threshDays: number;
  onEdit: (id: string) => void;
  onExpiry: (id: string, iso: string) => void;
  onInc: (id: string) => void;
  onDec: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

const MODE_LABEL: Record<SessionMode, string> = { inbound: "입고", outbound: "출고" };

// 입고/출고 목록 카드(디자인). 헤더(제목 + 개수 + 전체 비우기) + 스크롤 본문 + 빈 상태.
export function ScanLineList({
  lines,
  lastLineId,
  mode,
  threshDays,
  onEdit,
  onExpiry,
  onInc,
  onDec,
  onRemove,
  onClear,
}: ScanLineListProps) {
  const hasLines = lines.length > 0;

  return (
    <section className="listcard">
      <header className="listcard__head">
        <h2 className="listcard__title">
          {MODE_LABEL[mode]} 목록 <span className="listcard__count">{lines.length}</span>
        </h2>
        {hasLines && (
          <button type="button" className="listcard__clear" onClick={onClear}>
            전체 비우기
          </button>
        )}
      </header>

      <div className="listcard__body">
        {hasLines ? (
          <ul className="line-list">
            {lines.map((line) => (
              <ScanLineRow
                key={line.id}
                line={line}
                recent={line.id === lastLineId}
                mode={mode}
                threshDays={threshDays}
                onEdit={() => onEdit(line.id)}
                onExpiry={(iso) => onExpiry(line.id, iso)}
                onInc={() => onInc(line.id)}
                onDec={() => onDec(line.id)}
                onRemove={() => onRemove(line.id)}
              />
            ))}
          </ul>
        ) : (
          <div className="listcard__empty">
            <span className="listcard__empty-icon" aria-hidden="true">
              {[4, 3, 6, 3, 3, 7, 3].map((w, i) => (
                <span key={i} style={{ width: w }} />
              ))}
            </span>
            <p className="listcard__empty-title">스캔하면 여기에 쌓여요</p>
            <p className="listcard__empty-hint">
              바코드를 찍거나 위의 빠른 스캔 칩을 눌러보세요
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

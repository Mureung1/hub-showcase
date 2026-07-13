import type { ScanLine } from "../session/types";
import { ScanLineRow } from "./ScanLineRow";

interface ScanLineListProps {
  lines: ScanLine[];
  lastLineId: string | null;
  onEdit: (id: string) => void;
  onInc: (id: string) => void;
  onDec: (id: string) => void;
}

export function ScanLineList({
  lines,
  lastLineId,
  onEdit,
  onInc,
  onDec,
}: ScanLineListProps) {
  if (lines.length === 0) {
    return <p className="list-empty">스캔한 상품이 여기에 누적됩니다.</p>;
  }
  return (
    <ul className="line-list">
      {lines.map((line) => (
        <ScanLineRow
          key={line.id}
          line={line}
          recent={line.id === lastLineId}
          onEdit={() => onEdit(line.id)}
          onInc={() => onInc(line.id)}
          onDec={() => onDec(line.id)}
        />
      ))}
    </ul>
  );
}

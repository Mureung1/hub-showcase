import { SEED_PRODUCTS } from "../seed";
import { categoryColor } from "../lib/categoryColor";

interface DemoChipsProps {
  onScan: (barcode: string) => void;
}

// "데모 · 빠른 스캔" 칩 행(디자인). 실물 스캐너 없이 스캔을 시뮬레이션하는 데모용 트리거 —
// seed 상품 바코드를 눌러 등록됨 분기를, 미등록은 임의 바코드 수동 입력으로 확인한다.
export function DemoChips({ onScan }: DemoChipsProps) {
  return (
    <div className="demochips">
      <span className="demochips__label">데모 · 빠른 스캔</span>
      {SEED_PRODUCTS.map((p) => (
        <button
          key={p.barcode}
          type="button"
          className="demochips__chip"
          onClick={() => onScan(p.barcode)}
        >
          <span
            className="dot"
            style={{ background: categoryColor(p.category) }}
            aria-hidden="true"
          />
          {p.name}
        </button>
      ))}
    </div>
  );
}

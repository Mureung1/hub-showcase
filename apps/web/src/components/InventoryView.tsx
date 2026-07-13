import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { productRepository } from "../repository/DexieProductRepository";
import { lotRepository } from "../repository/DexieLotRepository";
import { buildInventory, urgentCount, type InventoryRow } from "../lib/inventory";
import { categoryColor } from "../lib/categoryColor";
import { formatMonthDay, ddayLabel } from "../lib/date";
import { useThresholdStore } from "../store/thresholdStore";

type Filter = "all" | "expiry" | "low";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "expiry", label: "유통기한 임박" },
  { key: "low", label: "재고 부족" },
];

// 재고 탭(디자인). 전체 상품의 재고 합·가까운 유통기한·상태를 한 테이블에서. 검색/필터는 화면 로컬,
// 데이터는 useLiveQuery로 반응적으로 읽어 커밋 시 자동 갱신.
export function InventoryView() {
  const threshDays = useThresholdStore((s) => s.threshDays);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const rows = useLiveQuery(async () => {
    const [products, lots] = await Promise.all([
      productRepository.getAll(),
      lotRepository.getAll(),
    ]);
    return buildInventory(products, lots, threshDays);
  }, [threshDays]);

  const total = rows ?? [];
  const alerts = urgentCount(total);

  const shown = useMemo(() => filterRows(total, filter, query), [total, filter, query]);

  return (
    <div className="pane">
      <div className="toolbar">
        <input
          className="toolbar__search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="상품 검색"
          aria-label="상품 검색"
        />
        <div className="segbar" role="group" aria-label="필터">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`segbar__btn${filter === f.key ? " is-active" : ""}`}
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="toolbar__spacer" />
        <span className="toolbar__count">
          {shown.length}종 표시 · 주의 {alerts}건
        </span>
      </div>

      <div className="table">
        <div className="table__head">
          <div>상품</div>
          <div>분류</div>
          <div>현재 재고</div>
          <div>가까운 유통기한</div>
          <div>상태</div>
        </div>
        <div className="table__body">
          {shown.length === 0 ? (
            <div className="table__empty">
              {total.length === 0
                ? "아직 재고가 없어요. 입고하면 여기에 표시됩니다."
                : "조건에 맞는 상품이 없어요."}
            </div>
          ) : (
            shown.map((r) => <InventoryRowView key={r.product.id} row={r} />)
          )}
        </div>
      </div>
    </div>
  );
}

function InventoryRowView({ row }: { row: InventoryRow }) {
  return (
    <div className="table__row">
      <div className="table__name">
        <span
          className="dot"
          style={{ background: categoryColor(row.product.category) }}
          aria-hidden="true"
        />
        <span className="table__namefx">{row.product.name}</span>
      </div>
      <div className="table__cat">{row.product.category}</div>
      <div className={`table__stock${row.low ? " is-low" : ""}`}>{row.stock}개</div>
      <div className="table__exp">
        {row.nearestExpiry ? (
          <>
            <span className="table__expdate">
              {formatMonthDay(new Date(row.nearestExpiry))}
            </span>
            <span className={`table__dday table__dday--${row.expiry ?? "plenty"}`}>
              {ddayLabel(row.dday!)}
            </span>
          </>
        ) : (
          <span className="table__expnone">—</span>
        )}
      </div>
      <div className="table__status">
        {row.low && <span className="badge badge--low">재고 부족</span>}
        {row.expiry === "imminent" && <span className="badge badge--imminent">임박</span>}
        {row.expiry === "expired" && <span className="badge badge--expired">기한 지남</span>}
        {!row.urgent && <span className="table__ok">정상</span>}
      </div>
    </div>
  );
}

function filterRows(rows: InventoryRow[], filter: Filter, query: string): InventoryRow[] {
  const q = query.trim().toLowerCase();
  return rows.filter((r) => {
    if (filter === "expiry" && r.expiry === null) return false;
    if (filter === "low" && !r.low) return false;
    if (q === "") return true;
    return (
      r.product.name.toLowerCase().includes(q) ||
      r.product.barcode.includes(q) ||
      r.product.category.toLowerCase().includes(q)
    );
  });
}

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { productRepository } from "../repository/DexieProductRepository";
import { lotRepository } from "../repository/DexieLotRepository";
import {
  groupLotsByDay,
  monthCells,
  monthLabel,
  prevMonth,
  nextMonth,
} from "../lib/calendar";
import { categoryColor } from "../lib/categoryColor";
import { dDay, ddayLabel, formatFullDay, todayISO } from "../lib/date";
import { useThresholdStore } from "../store/thresholdStore";

const THRESH_OPTIONS = [3, 5, 7];
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 유통기한 탭(디자인). 월 캘린더로 만료 예정을 조망 + 임박 기준(D-day) 조절. 셀 색은 그날 최소 D-day로.
export function ExpiryView() {
  const threshDays = useThresholdStore((s) => s.threshDays);
  const setThreshDays = useThresholdStore((s) => s.setThreshDays);

  const today = todayISO();
  const now = new Date();
  const [calY, setCalY] = useState(now.getFullYear());
  const [calM, setCalM] = useState(now.getMonth()); // 0-based
  const [selDate, setSelDate] = useState<string | null>(today);

  const data = useLiveQuery(async () => {
    const [products, lots] = await Promise.all([
      productRepository.getAll(),
      lotRepository.getAll(),
    ]);
    return { products, lots };
  }, []);

  const lots = data?.lots ?? [];
  const products = data?.products ?? [];

  const productById = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );
  const byDay = useMemo(() => groupLotsByDay(lots), [lots]);
  const cells = useMemo(
    () => monthCells(calY, calM, byDay, threshDays),
    [calY, calM, byDay, threshDays]
  );
  const selItems = useMemo(() => {
    if (!selDate) return [];
    return (byDay.get(selDate) ?? []).map((lot) => ({
      lot,
      product: productById.get(lot.productId),
    }));
  }, [selDate, byDay, productById]);

  function goPrev() {
    const { year, month0 } = prevMonth(calY, calM);
    setCalY(year);
    setCalM(month0);
  }
  function goNext() {
    const { year, month0 } = nextMonth(calY, calM);
    setCalY(year);
    setCalM(month0);
  }

  return (
    <div className="pane pane--expiry">
      <section className="cal">
        <div className="cal__toolbar">
          <div className="cal__nav">
            <button type="button" className="cal__navbtn" onClick={goPrev} aria-label="이전 달">
              ‹
            </button>
            <span className="cal__label">{monthLabel(calY, calM)}</span>
            <button type="button" className="cal__navbtn" onClick={goNext} aria-label="다음 달">
              ›
            </button>
          </div>
          <span className="cal__spacer" />
          <span className="cal__threshlabel">임박 기준</span>
          <div className="segbar" role="group" aria-label="임박 기준">
            {THRESH_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                className={`segbar__btn${threshDays === n ? " is-active" : ""}`}
                aria-pressed={threshDays === n}
                onClick={() => setThreshDays(n)}
              >
                {n}일
              </button>
            ))}
          </div>
        </div>

        <div className="cal__weekhead">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className={
                "cal__weekday" +
                (i === 0 ? " cal__weekday--sun" : i === 6 ? " cal__weekday--sat" : "")
              }
            >
              {w}
            </div>
          ))}
        </div>

        <div className="cal__grid">
          {cells.map((cell, i) =>
            cell.iso === null ? (
              <div key={`b${i}`} className="cal__cell cal__cell--blank" />
            ) : (
              <button
                key={cell.iso}
                type="button"
                className={
                  `cal__cell cal__cell--${cell.status}` +
                  (cell.iso === today ? " is-today" : "") +
                  (cell.iso === selDate ? " is-selected" : "")
                }
                onClick={() => setSelDate(cell.iso)}
              >
                <span className="cal__daynum">{cell.day}</span>
                {cell.count > 0 && <span className="cal__count">{cell.count}</span>}
              </button>
            )
          )}
        </div>

        <div className="cal__legend">
          <span className="cal__legenditem">
            <span className="dot dot--expired" aria-hidden="true" />
            기한 지남
          </span>
          <span className="cal__legenditem">
            <span className="dot dot--amber" aria-hidden="true" />
            임박
          </span>
          <span className="cal__legenditem">
            <span className="dot dot--plenty" aria-hidden="true" />
            여유
          </span>
        </div>
      </section>

      <aside className="seldaypanel">
        <div className="seldaypanel__label">선택한 날짜</div>
        <div className="seldaypanel__date">
          {selDate ? formatFullDay(new Date(selDate)) : "날짜를 선택하세요"}
        </div>
        <div className="seldaypanel__sub">만료 예정 {selItems.length}건</div>
        <div className="seldaypanel__divider" />
        <div className="seldaypanel__body">
          {selItems.length === 0 ? (
            <div className="seldaypanel__empty">이 날 만료 예정인 상품이 없어요</div>
          ) : (
            selItems.map(({ lot, product }) => {
              const d = dDay(lot.expiryDate);
              const status = d < 0 ? "expired" : d <= threshDays ? "imminent" : "plenty";
              return (
                <div key={lot.id} className="seldayrow">
                  <span
                    className="dot"
                    style={{ background: categoryColor(product?.category ?? "") }}
                    aria-hidden="true"
                  />
                  <div className="seldayrow__body">
                    <div className="seldayrow__name">{product?.name ?? "(알 수 없음)"}</div>
                    <div className="seldayrow__sub">
                      {product?.category ?? "-"} · 재고 {lot.quantity}개
                    </div>
                  </div>
                  <span className={`badge badge--${status}`}>{ddayLabel(d)}</span>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
}

import { useEffect, useState } from "react";
import { DEMO_PRODUCTS } from "../data";
import { statusFromDday } from "../status";
import StatusBadge from "./StatusBadge";

// 데모 애니메이션: 시간이 흐르는 것처럼 남은 일수를 조금씩 줄여
// 신선 → 임박 → 만료로 배지 색이 바뀌는 모습을 보여준다.
const STEP_MS = 2200;
const MAX_BASE = Math.max(...DEMO_PRODUCTS.map((p) => p.dday)); // 가장 여유있는 상품
const CYCLE = MAX_BASE + 2; // 모두 만료된 뒤 처음으로 리셋

export default function DemoCard() {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const reduce =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // 정적으로 유지

    const id = setInterval(() => {
      setOffset((o) => (o + 1) % CYCLE);
    }, STEP_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="demo"
      role="img"
      aria-label="실시간 매대 데모: 상품별 재고 수량과 유통기한 상태(신선·임박·만료)를 보여주는 카드"
    >
      <div className="demo-top">
        <span className="demo-title">
          <span aria-hidden="true">🧺</span> 실시간 매대
        </span>
        <span className="demo-live">
          <span className="pulse" aria-hidden="true" />
          LIVE
        </span>
      </div>

      <ul className="demo-list">
        {DEMO_PRODUCTS.map((p) => {
          const dday = p.dday - offset;
          const status = statusFromDday(dday);
          return (
            <li className="demo-row" key={p.sku}>
              <span className="demo-emoji" aria-hidden="true">
                {p.emoji}
              </span>
              <span>
                <span className="demo-name">{p.name}</span>
                <span className="demo-meta mono">SKU {p.sku}</span>
              </span>
              <span className="demo-right">
                <StatusBadge status={status} dday={dday} />
                <span className="demo-qty mono">
                  재고 {p.qty}
                  {p.unit}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="demo-foot">
        <span>신선 · 임박 · 만료 자동 판정</span>
        <span className="mono">임박 기준 D-3</span>
      </div>
    </div>
  );
}

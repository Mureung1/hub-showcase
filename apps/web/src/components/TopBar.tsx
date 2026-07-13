import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { productRepository } from "../repository/DexieProductRepository";
import { lotRepository } from "../repository/DexieLotRepository";
import { buildInventory, urgentCount } from "../lib/inventory";
import { formatMonthDay, formatTime } from "../lib/date";
import { useThresholdStore } from "../store/thresholdStore";

// 브랜드 상단바(디자인 §공통 크롬). 햄버거 · 로고(산 모양) + "Sherpa" · 구분선 · "재고 관리" ·
// 주의 N건 pill(위급 상품 수, 실시간) · 실시간 날짜/시각.
export function TopBar() {
  const [nowDate, setNowDate] = useState(() => new Date());
  const threshDays = useThresholdStore((s) => s.threshDays);

  // 커밋으로 Lot이 바뀌면 자동 갱신(local-first 리액티브 읽기).
  const alerts = useLiveQuery(async () => {
    const [products, lots] = await Promise.all([
      productRepository.getAll(),
      lotRepository.getAll(),
    ]);
    return urgentCount(buildInventory(products, lots, threshDays));
  }, [threshDays]);

  // 분 단위로 시각 갱신(상단바 시계는 분까지만 표시).
  useEffect(() => {
    const id = window.setInterval(() => setNowDate(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <header className="topbar">
      <span className="topbar__menu" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>

      <span className="topbar__logo" aria-hidden="true">
        <svg width="17" height="14" viewBox="0 0 17 14">
          <polygon points="8.5,1 16,13 1,13" fill="#8CB56A" />
          <polygon points="8.5,1 11.5,13 5.5,13" fill="#D98A4E" />
        </svg>
      </span>
      <span className="topbar__brand">Sherpa</span>

      <span className="topbar__divider" aria-hidden="true">
        |
      </span>
      <span className="topbar__sub">재고 관리</span>

      <span className="topbar__spacer" />

      {alerts != null && alerts > 0 && (
        <span className="topbar__alert" role="status">
          <span className="dot dot--amber" aria-hidden="true" />
          주의 {alerts}건
        </span>
      )}

      <span className="topbar__clock">
        <span>{formatMonthDay(nowDate)}</span>
        <span>{formatTime(nowDate)}</span>
      </span>
    </header>
  );
}

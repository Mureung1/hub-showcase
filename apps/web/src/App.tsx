import { useEffect, useState } from "react";
import { seedProducts, seedLots } from "./seed";
import { TopBar } from "./components/TopBar";
import { TabBar, type Tab } from "./components/TabBar";
import { ScanScreen } from "./components/ScanScreen";
import { InventoryView } from "./components/InventoryView";
import { ExpiryView } from "./components/ExpiryView";

export default function App() {
  const [tab, setTab] = useState<Tab>("in");

  // 데모 시드는 앱 최상위에서 한 번(상품 → Lot 순). 각 뷰는 useLiveQuery로 반응적으로 읽는다.
  useEffect(() => {
    void seedProducts().then(seedLots);
  }, []);

  // 세 뷰를 모두 마운트해 두고 비활성은 숨긴다 — 스캔 세션 draft·캘린더 선택일 등 화면 상태를
  // 탭을 오가도 잃지 않게. (useLiveQuery 구독 비용은 미미.)
  return (
    <div className="app">
      <TopBar />
      <TabBar tab={tab} onChange={setTab} />
      <main className="viewhost">
        <section className="viewpane" hidden={tab !== "in"}>
          <ScanScreen />
        </section>
        <section className="viewpane" hidden={tab !== "stock"}>
          <InventoryView />
        </section>
        <section className="viewpane" hidden={tab !== "expiry"}>
          <ExpiryView />
        </section>
      </main>
    </div>
  );
}

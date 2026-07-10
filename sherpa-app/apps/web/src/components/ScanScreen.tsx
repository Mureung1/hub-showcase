import { useEffect, useReducer, useRef, useState } from "react";
import { seedProducts } from "../seed";
import { productRepository } from "../repository/DexieProductRepository";
import { scanReducer, initialScanState } from "../session/scanReducer";
import { DevScanInput } from "./DevScanInput";
import { ScanLineList } from "./ScanLineList";

// 홈 = 스캔 화면. 세션 상태(lines)를 useReducer로 소유하고 레이아웃을 조립한다.
export function ScanScreen() {
  const [state, dispatch] = useReducer(scanReducer, initialScanState);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    void seedProducts();
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2500);
  }

  async function handleScan(raw: string) {
    const barcode = raw.trim();
    if (barcode === "") return;
    const product = await productRepository.findByBarcode(barcode);
    if (product) {
      dispatch({ type: "SCAN_KNOWN", product });
    } else {
      // S1: 미등록은 세션에 넣지 않고 안내만. pending 행·등록 모달은 S4.
      showToast(`미등록 상품입니다 · ${barcode}`);
    }
  }

  const totalQty = state.lines.reduce((sum, l) => sum + l.quantity, 0);

  return (
    <div className="app">
      <header className="topbar">
        <span className="topbar__brand">셰르파</span>
        <span className="topbar__sub">스캔</span>
      </header>

      <main className="stage">
        <DevScanInput onScan={handleScan} />
        <ScanLineList
          lines={state.lines}
          lastLineId={state.lastLineId}
          onInc={(id) => dispatch({ type: "INC", lineId: id })}
          onDec={(id) => dispatch({ type: "DEC", lineId: id })}
        />
      </main>

      <footer className="commitbar">
        <span className="commitbar__count">
          총 <strong>{totalQty}</strong>개 · {state.lines.length}품목
        </span>
      </footer>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

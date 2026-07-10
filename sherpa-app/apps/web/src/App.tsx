import { useEffect, useRef, useState } from "react";
import { db } from "./db";
import { seedProducts, SEED_PRODUCTS } from "./seed";
import { ScanInput } from "./components/ScanInput";
import { ScanResult, type ScanState } from "./components/ScanResult";

export default function App() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<ScanState>({ status: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);

  // seed 후 입력에 포커스 — 바로 연속 스캔 가능하게.
  useEffect(() => {
    void seedProducts().then(() => inputRef.current?.focus());
  }, []);

  async function handleScan(raw: string) {
    const barcode = raw.trim();
    // 입력을 비우고 다시 포커스 → 연속 스캔.
    setQuery("");
    inputRef.current?.focus();
    if (barcode === "") return;

    const product = await db.products.where("barcode").equals(barcode).first();
    setResult(
      product
        ? { status: "found", product }
        : { status: "notFound", barcode }
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <span className="topbar__brand">셰르파</span>
        <span className="topbar__sub">바코드로 상품 조회</span>
      </header>

      <main className="stage">
        <ScanInput
          value={query}
          onChange={setQuery}
          onScan={handleScan}
          inputRef={inputRef}
        />
        <ScanResult state={result} />
      </main>

      {/* Slice 0 검증용 임시 안내 — 등록/미등록 두 분기를 눈으로 확인하기 위함. 실사용 UI 아님. */}
      <footer className="devhint">
        <span className="devhint__label">테스트용 등록 바코드</span>
        {SEED_PRODUCTS.map((p) => (
          <code key={p.barcode} className="devhint__code">
            {p.barcode}
          </code>
        ))}
        <span className="devhint__note">그 외 바코드는 “미등록”으로 갈라집니다.</span>
      </footer>
    </div>
  );
}

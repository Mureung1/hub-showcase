import { useRef, useState } from "react";

interface ScanBarProps {
  onScan: (barcode: string) => void;
}

// 세로 막대 9개 = 바코드 아이콘(디자인). 순수 장식이라 폭만 다르게 고정.
const BARS = [3, 2, 4, 2, 2, 5, 2, 3, 2];

// 스캔바(디자인 입고 탭 상단). 좌: 바코드 아이콘 + "바코드 스캔" + 스캐너 연결 표시.
// 가운데: 입력창(수동 입력·이름/바코드). 우: 스캔 버튼.
// 실물 스캐너 버스트는 document 레벨 useScanner가 별도로 처리 — 여기 입력창은 수동/개발용.
// Enter 또는 스캔 버튼 → 확정 후 값 비우고 재포커스(연속 입력).
export function ScanBar({ onScan }: ScanBarProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function submit() {
    onScan(value);
    setValue("");
    inputRef.current?.focus();
  }

  return (
    <form
      className="scanbar"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="scanbar__brand">
        <span className="scanbar__icon" aria-hidden="true">
          {BARS.map((w, i) => (
            <span key={i} style={{ width: w }} />
          ))}
        </span>
        <span className="scanbar__labels">
          <span className="scanbar__title">바코드 스캔</span>
          <span className="scanbar__status">
            <span className="scanbar__dot" aria-hidden="true" />
            스캐너 연결됨
          </span>
        </span>
      </div>

      <input
        ref={inputRef}
        className="scanbar__input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="상품을 스캔하거나 바코드·이름을 입력하세요"
        aria-label="바코드 입력"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        inputMode="numeric"
        autoFocus
      />

      <button type="submit" className="scanbar__btn">
        스캔
      </button>
    </form>
  );
}

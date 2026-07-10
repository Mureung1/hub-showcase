import { useRef, useState } from "react";

interface DevScanInputProps {
  onScan: (barcode: string) => void;
}

/**
 * 개발용 visible 입력칸 — 스캐너/카메라 없이 EAN-13을 손으로 타이핑해 테스트.
 * Enter로 확정 → 값 비우고 재포커스(연속 입력). 실물 스캐너 감지(document keydown)는 S3.
 */
export function DevScanInput({ onScan }: DevScanInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form
      className="scan-form"
      onSubmit={(e) => {
        e.preventDefault();
        onScan(value);
        setValue("");
        inputRef.current?.focus();
      }}
    >
      <input
        ref={inputRef}
        className="scan-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="바코드 입력 (개발용) · Enter로 스캔"
        aria-label="바코드 입력"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        inputMode="numeric"
        autoFocus
      />
    </form>
  );
}

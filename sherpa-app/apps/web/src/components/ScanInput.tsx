import type { RefObject } from "react";

interface ScanInputProps {
  value: string;
  onChange: (value: string) => void;
  onScan: (barcode: string) => void;
  inputRef: RefObject<HTMLInputElement>;
}

/**
 * 실물 USB 바코드 스캐너(keyboard-wedge)가 그대로 타이핑 후 Enter를 보내는
 * 인터페이스. Enter(=form submit)로 확정한다. 목업이 아니라 실제 입력 경로.
 */
export function ScanInput({ value, onChange, onScan, inputRef }: ScanInputProps) {
  return (
    <form
      className="scan-form"
      onSubmit={(e) => {
        e.preventDefault();
        onScan(value);
      }}
    >
      <input
        ref={inputRef}
        className="scan-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="바코드를 스캔하세요"
        aria-label="바코드 입력"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
      />
    </form>
  );
}

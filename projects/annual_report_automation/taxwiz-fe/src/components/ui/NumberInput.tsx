import React, { useState, useCallback } from 'react';
import styles from './NumberInput.module.css';

interface NumberInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  unit?: string;
  min?: number;
  max?: number;
  disabled?: boolean;
  /** 빠른 입력 버튼에 쓸 금액들 — 빈 배열을 주면 버튼 자체를 숨김(퍼센트·개수 필드용) */
  quickAmounts?: number[];
}

/** 숫자에 천단위 콤마 포맷 */
function formatNumber(n: number): string {
  return n.toLocaleString('ko-KR');
}

/** 콤마 제거 후 순수 숫자 파싱 */
function parseNumber(s: string): number | null {
  const clean = s.replace(/,/g, '');
  if (clean === '') return null;
  const n = Number(clean);
  return isNaN(n) ? null : n;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  placeholder = '금액을 입력하세요',
  unit = '원',
  min,
  max,
  disabled = false,
  quickAmounts = [1000000, 5000000, 10000000],
}) => {
  const [displayValue, setDisplayValue] = useState<string>(
    value !== null ? formatNumber(value) : ''
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^\d]/g, '');
      const num = parseNumber(raw);

      if (num !== null && max !== undefined && num > max) return;
      if (num !== null && min !== undefined && num < min) return;

      setDisplayValue(raw ? formatNumber(Number(raw)) : '');
      onChange(num);
    },
    [onChange, min, max]
  );

  const isEmpty = displayValue === '';

  return (
    <div className={styles.wrapper}>
      <div className={[styles.inputBox, isEmpty ? '' : styles.hasValue].join(' ')}>
        <input
          type="text"
          inputMode="numeric"
          className={styles.input}
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={`금액 입력 (단위: ${unit})`}
        />
        {unit && <span className={styles.unit}>{unit}</span>}
      </div>

      {/* 빠른 입력 버튼 */}
      {quickAmounts.length > 0 && (
      <div className={styles.quickButtons}>
        {quickAmounts.map((amount) => (
          <button
            key={amount}
            type="button"
            className={styles.quickBtn}
            onClick={() => {
              const next = (value ?? 0) + amount;
              setDisplayValue(formatNumber(next));
              onChange(next);
            }}
            disabled={disabled}
          >
            +{(amount / 10000).toLocaleString('ko-KR')}만
          </button>
        ))}
        <button
          type="button"
          className={[styles.quickBtn, styles.clearBtn].join(' ')}
          onClick={() => {
            setDisplayValue('');
            onChange(null);
          }}
          disabled={disabled || isEmpty}
        >
          지우기
        </button>
      </div>
      )}
    </div>
  );
};

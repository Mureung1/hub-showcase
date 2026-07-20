import React, { useState } from 'react';

/** Text input. variant="box" (실제 박스 형태 — paper 배경 + focus 시 wedgwood 테두리 + 옅은 링) or "underline"
    (손글씨 밑줄 — 초대 문구 입력 등 letter-paper 전용). Lemon never used on inputs (§7). */
export function Input({ variant = 'box', label, placeholder, value, onChange, style, ...rest }) {
  const [focus, setFocus] = useState(false);
  const borderColor = focus ? 'var(--wedgwood)' : 'var(--line)';
  const base = {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-body-size)',
    color: 'var(--ink)',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color var(--dur-transition) var(--ease-soft), box-shadow var(--dur-transition) var(--ease-soft)',
  };
  const shape =
    variant === 'underline'
      ? { border: 'none', borderBottom: `1.5px solid ${borderColor}`, background: 'transparent', padding: '8px 2px', borderRadius: 0 }
      : { border: `1px solid ${borderColor}`, background: 'var(--paper)', padding: '10px 14px', borderRadius: 'var(--radius-md)', boxShadow: focus ? 'var(--shadow-focus-wedgwood)' : 'none' };
  return (
    <label style={{ display: 'block', ...style }}>
      {label ? (
        <span style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: 'var(--text-caption-size)', color: 'var(--text-caption)', marginBottom: 'var(--space-1)' }}>
          {label}
        </span>
      ) : null}
      <input
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{ ...base, ...shape }}
        {...rest}
      />
    </label>
  );
}

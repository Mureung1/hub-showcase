import React from 'react';

/** Checkbox — fills wedgwood-deep when checked with a 0.9→1.05→1 pop (0.35s, §7).
    완료만 조용히 쌓인다: unchecked state is never emphasized. */
export function Checkbox({ checked = false, onChange, label, style }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 'var(--text-body-size)', color: checked ? 'var(--ink)' : 'var(--ink-soft)', ...style }}>
      <style>{`@keyframes lco-check-pop { 0% { transform: scale(0.9); } 60% { transform: scale(1.05); } 100% { transform: scale(1); } }`}</style>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange && onChange(e.target.checked)}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
      />
      <span
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '4px',
          border: `1.3px solid ${checked ? 'var(--wedgwood-deep)' : 'var(--wedgwood)'}`,
          background: checked ? 'var(--wedgwood-deep)' : 'transparent',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          animation: checked ? 'lco-check-pop var(--dur-check) ease' : 'none',
        }}
      >
        {checked ? (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5L10 17.5L19 6.5" />
          </svg>
        ) : null}
      </span>
      {label}
    </label>
  );
}

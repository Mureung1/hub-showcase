import React from 'react';

/** 나뭇잎 평가 (별점 대체) — leaf 채움은 lemon-deep, 빈 잎은 괘선 톤. 결산(Harvest)용. */
export function LeafRating({ value = 0, max = 3, size = 16, onChange, label, style }) {
  const Leaf = ({ filled, onClick }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      onClick={onClick}
      style={{ cursor: onChange ? 'pointer' : 'default' }}
      fill={filled ? 'var(--lemon-deep)' : 'none'}
      stroke={filled ? 'var(--lemon-deep)' : 'var(--line)'}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 19C5 11.5 11 5.5 19.5 4.5C18.5 13.5 12.5 19.5 5 19Z" />
    </svg>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: label ? 'space-between' : 'flex-start', gap: 'var(--space-3)', ...style }}>
      {label ? <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-body-size)', color: 'var(--text-caption)' }}>{label}</span> : null}
      <span style={{ display: 'flex', gap: '3px' }}>
        {Array.from({ length: max }, (_, i) => (
          <Leaf key={i} filled={i < value} onClick={onChange ? () => onChange(i + 1) : undefined} />
        ))}
      </span>
    </div>
  );
}

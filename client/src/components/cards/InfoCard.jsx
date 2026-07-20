import React from 'react';

/** 일반 정보 카드 (§5) — 실선 테두리, 배경 #FBF9F3, 리스트로 반복 가능. 카드 간 간격 8~10px. */
export function InfoCard({ title, children, selected = false, onClick, style }) {
  return (
    <div
      onClick={onClick}
      style={{
        border: `1px solid ${selected ? 'var(--wedgwood-deep)' : 'var(--border-card)'}`,
        borderRadius: 'var(--radius-lg)',
        background: 'var(--surface-card)',
        padding: 'var(--pad-card)',
        boxShadow: 'var(--shadow-info)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color var(--dur-transition) var(--ease-soft)',
        ...style,
      }}
    >
      {title ? (
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 'var(--text-h3)', lineHeight: 'var(--leading-h)', color: 'var(--ink)', marginBottom: children ? 'var(--space-2)' : 0 }}>
          {title}
        </div>
      ) : null}
      {children}
    </div>
  );
}

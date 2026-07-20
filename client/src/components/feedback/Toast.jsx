import React from 'react';

/** 토스트 (§10) — 크림 카드 + 얇은 웨지우드 테두리, 좌측 잎/체크 아이콘.
    색상으로 상태 구분 금지, 빨강 없음. 하단 중앙 슬라이드+페이드 0.3s, 2.5s 후 소멸은 호스트가 담당. */
export function Toast({ icon = 'leaf', children, style }) {
  const glyph =
    icon === 'check' ? (
      <path d="M5 12.5L10 17.5L19 6.5" />
    ) : (
      <g>
        <path d="M5 19C5 11.5 11 5.5 19.5 4.5C18.5 13.5 12.5 19.5 5 19Z" />
        <path d="M6 18C9.5 13.5 13.5 9 17.5 5.8" strokeWidth="1.05" />
      </g>
    );
  return (
    <div
      role="status"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        background: 'var(--surface-card)',
        border: '1px solid var(--wedgwood)',
        borderRadius: 'var(--radius-lg)',
        padding: '10px 16px',
        fontFamily: 'var(--font-body)',
        fontSize: '13px',
        color: 'var(--ink)',
        boxShadow: 'var(--shadow-fold)',
        ...style,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--wedgwood-deep)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {glyph}
      </svg>
      {children}
    </div>
  );
}

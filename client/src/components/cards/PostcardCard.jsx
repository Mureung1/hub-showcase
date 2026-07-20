import React from 'react';
import { Icon } from '../decor/Icon.jsx';

/** 엽서형 카드 (§5) — 점선 테두리 1.5px 웨지우드, 우상단 우표 자리(점선 + 잎 모티프), 종이가 살짝 뜬 카드 그림자(`--shadow-fold`, opacity 0.08).
    InfoCard(`--shadow-info`, opacity 0.04)보다 확실히 화려하게 — 화면당 최대 1개, 확정·결산처럼 "전달"하는 화면에만. */
export function PostcardCard({ stamp = true, children, style }) {
  return (
    <div
      style={{
        position: 'relative',
        border: 'var(--border-postcard-w) dashed var(--border-postcard)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--surface-raised)',
        padding: 'var(--pad-card)',
        boxShadow: 'var(--shadow-fold)',
        ...style,
      }}
    >
      {stamp ? (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            width: '24px',
            height: '30px',
            border: '1px dashed var(--wedgwood)',
            borderRadius: '2px',
            opacity: 0.8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="leaf" size={16} color="var(--wedgwood)" style={{ opacity: 0.9 }} />
        </span>
      ) : null}
      {children}
    </div>
  );
}

/** 엽서 카드 안의 라벨-값 한 줄. 점선 괘선으로 구분. */
export function PostcardRow({ label, children, style }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 'var(--space-3)',
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-body-size)',
        color: 'var(--ink)',
        padding: '6px 0',
        borderBottom: '1px dotted var(--line)',
        ...style,
      }}
    >
      <span style={{ color: 'var(--text-caption)', flexShrink: 0 }}>{label}</span>
      <span style={{ textAlign: 'right' }}>{children}</span>
    </div>
  );
}

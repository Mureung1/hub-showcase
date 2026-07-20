import React from 'react';

/** 원형 대신 손그림 느낌의 유기적 실루엣 — 완벽한 원이 아니라 참가자마다 살짝 다른 삐뚤빼뚤한 윤곽 (§6).
    wedgwood·lemon·rose pale을 멤버 순서대로 순환, 테두리는 딥 톤 1px. 사진 업로드 없음, 이니셜만. */

/* 5 hand-drawn blob outlines in a 0–100 viewBox, each a closed cubic-bezier loop with
   slightly irregular radii so no two neighbors look identical. Selected by index % 5. */
const BLOBS = [
  'M50 6C68 5 92 20 93 47C94 73 74 93 49 94C25 95 7 76 6 50C5 25 30 7 50 6Z',
  'M48 5C70 7 94 24 93 49C92 71 71 92 48 93C24 94 6 72 7 48C8 26 27 3 48 5Z',
  'M51 7C71 4 93 22 92 48C91 74 72 94 50 93C27 92 5 75 6 49C7 24 32 10 51 7Z',
  'M49 6C67 8 91 18 94 46C97 72 73 91 49 94C26 97 6 74 6 49C6 27 29 4 49 6Z',
  'M50 5C69 6 93 21 93 48C93 72 73 93 49 94C24 95 7 75 7 49C7 26 31 4 50 5Z',
];

export function Avatar({ name = '', index = 0, size = 32, style }) {
  size = Number(size) || 32;
  index = Number(index) || 0;
  const tones = [
    { bg: 'var(--wedgwood-pale)', border: 'var(--wedgwood-deep)', text: 'var(--wedgwood-deep)' },
    { bg: 'var(--lemon-pale)', border: 'var(--lemon-deep)', text: 'var(--lemon-deep)' },
    { bg: 'var(--rose-pale)', border: 'var(--rose-deep)', text: 'var(--rose-deep)' },
  ];
  const t = tones[((index % 3) + 3) % 3];
  const blob = BLOBS[((index % BLOBS.length) + BLOBS.length) % BLOBS.length];
  const initial = (name || '').trim().charAt(0);
  return (
    <span
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxSizing: 'border-box',
        ...style,
      }}
      aria-label={name}
    >
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
        <path d={blob} fill={t.bg} stroke={t.border} strokeWidth="2.5" />
      </svg>
      <span
        style={{
          position: 'relative',
          color: t.text,
          fontFamily: 'var(--font-heading)',
          fontSize: Math.round(size * 0.42),
          lineHeight: 1,
        }}
      >
        {initial || (
          <svg width={size * 0.42} height={size * 0.42} viewBox="0 0 24 24" fill="none" stroke={t.text} strokeWidth="1.5" strokeLinecap="round">
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx="12" cy="6.8" rx="2.5" ry="3.3" transform={`rotate(${a} 12 12)`} />
            ))}
            <circle cx="12" cy="12" r="2" />
          </svg>
        )}
      </span>
    </span>
  );
}

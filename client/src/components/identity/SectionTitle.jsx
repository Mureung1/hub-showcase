import React from 'react';

/** 화면 타이틀 블록 — 커시브 영문 라벨(Dancing Script) + letter-spacing 0.18em 스몰캡스 서브타이틀(§15-2).
    stippled=true는 자수 점묘 질감(§15-1) — 화면 최상단 타이틀 1곳에만. */
export function SectionTitle({ script, title, subtitle, stippled = false, align = 'center', scriptFont, style }) {
  const scriptFamily = scriptFont || 'var(--font-script)';
  const uid = React.useMemo(() => 'stip' + Math.random().toString(36).slice(2, 8), []);
  return (
    <div style={{ textAlign: align, ...style }}>
      {script ? (
        stippled ? (
          <svg width="100%" height="52" style={{ display: 'block' }} aria-label={script} role="img">
            <defs>
              <filter id={uid}>
                <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" result="n" />
                <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 9 -3.5" result="dots" />
                <feComposite in="SourceGraphic" in2="dots" operator="in" />
              </filter>
            </defs>
            <text
              x={align === 'center' ? '50%' : 0}
              y="38"
              textAnchor={align === 'center' ? 'middle' : 'start'}
              filter={`url(#${uid})`}
              style={{ fontFamily: scriptFamily, fontWeight: 700, fontSize: 'var(--text-script-lg)', fill: 'var(--ink)' }}
            >
              {script}
            </text>
          </svg>
        ) : (
          <div style={{ fontFamily: scriptFamily, fontWeight: 700, fontSize: 'var(--text-script-lg)', color: 'var(--ink)', lineHeight: 1.2 }}>{script}</div>
        )
      ) : null}
      {subtitle ? (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', letterSpacing: 'var(--tracking-subtitle)', textTransform: 'uppercase', color: 'var(--text-caption)', marginTop: '4px' }}>
          {subtitle}
        </div>
      ) : null}
      {title ? (
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-h2)', lineHeight: 'var(--leading-h)', color: 'var(--ink)', margin: '8px 0 0', fontWeight: 700 }}>{title}</h2>
      ) : null}
    </div>
  );
}

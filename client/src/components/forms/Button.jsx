import React, { useState } from 'react';

/** Pill button. 기본(웨지우드 딥) / 강조(레몬 딥) / 비활성.
    입체감: 기본 `--shadow-btn` + 상단 하이라이트(1px) → hover는 -1px 이동 + 그림자 확장(`--shadow-btn-hover`)
    → active는 +1px 이동 + 그림자 축소(`--shadow-btn-active`). 전부 `--ease-soft`, bounce 없음 (§1). */
export function Button({ variant = 'primary', size = 'md', disabled = false, block = false, children, onClick, style, ...rest }) {
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const bg = disabled
    ? 'var(--btn-disabled-bg)'
    : variant === 'accent'
      ? 'var(--btn-accent)'
      : 'var(--btn-primary)';
  const fg = disabled ? 'var(--btn-disabled-text)' : 'var(--text-on-deep)';

  const active = pressed && !disabled;
  const hover = hovered && !disabled && !active;
  const translateY = active ? 1 : hover ? -1 : 0;
  const shadow = disabled ? 'none' : active ? 'var(--shadow-btn-active)' : hover ? 'var(--shadow-btn-hover)' : 'var(--shadow-btn)';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => { setHovered(false); setPressed(false); }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      style={{
        display: block ? 'flex' : 'inline-flex',
        width: block ? '100%' : 'auto',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-2)',
        fontFamily: 'var(--font-body)',
        fontSize: size === 'sm' ? '12px' : 'var(--text-body-size)',
        padding: size === 'sm' ? '7px 16px' : '11px 24px',
        border: 'none',
        borderTop: disabled ? 'none' : `1px solid var(--btn-highlight)`,
        borderRadius: 'var(--radius-pill)',
        background: bg,
        color: fg,
        cursor: disabled ? 'default' : 'pointer',
        transform: `translateY(${translateY}px)`,
        boxShadow: shadow,
        transition: `transform var(--dur-press) var(--ease-soft), box-shadow var(--dur-press) var(--ease-soft)`,
        outlineColor: 'var(--focus-ring)',
        boxSizing: 'border-box',
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

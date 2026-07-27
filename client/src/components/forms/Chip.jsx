import React from 'react';

/** Chip/tag — background always pastel (lemon-pale or wedgwood-pale), text in the matching deep color (§7).
    `sticker` adds a faint drop shadow (0 2px 4px rgba(74,68,56,.08)) for a "paper sticker" feel — reference-mood §1-7.
    `onClick` turns it into a toggle button; `selected` inverts to the deep color (matches Button's deep tones). */
export function Chip({ tone = 'wedgwood', sticker = false, selected = false, onClick, children, style }) {
  const lemon = tone === 'lemon';
  const interactive = typeof onClick === 'function';
  return (
    <span
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        fontFamily: 'var(--font-body)',
        fontSize: '12px',
        padding: '5px 12px',
        borderRadius: 'var(--radius-pill)',
        cursor: interactive ? 'pointer' : 'default',
        background: selected ? (lemon ? 'var(--lemon-deep)' : 'var(--wedgwood-deep)') : lemon ? 'var(--chip-lemon-bg)' : 'var(--chip-wedgwood-bg)',
        color: selected ? 'var(--text-on-deep)' : lemon ? 'var(--chip-lemon-text)' : 'var(--chip-wedgwood-text)',
        border: `1px solid ${lemon ? 'var(--lemon)' : 'var(--wedgwood)'}`,
        boxShadow: sticker ? '0 2px 4px rgba(74,68,56,0.08)' : 'none',
        transition: 'background var(--dur-transition) var(--ease-soft), color var(--dur-transition) var(--ease-soft)',
        ...style,
      }}
    >
      {children}
    </span>
  );
}

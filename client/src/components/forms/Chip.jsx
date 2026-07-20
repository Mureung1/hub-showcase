import React from 'react';

/** Chip/tag — background always pastel (lemon-pale or wedgwood-pale), text in the matching deep color (§7).
    `sticker` adds a faint drop shadow (0 2px 4px rgba(74,68,56,.08)) for a "paper sticker" feel — reference-mood §1-7. */
export function Chip({ tone = 'wedgwood', sticker = false, children, style }) {
  const lemon = tone === 'lemon';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        fontFamily: 'var(--font-body)',
        fontSize: '12px',
        padding: '5px 12px',
        borderRadius: 'var(--radius-pill)',
        background: lemon ? 'var(--chip-lemon-bg)' : 'var(--chip-wedgwood-bg)',
        color: lemon ? 'var(--chip-lemon-text)' : 'var(--chip-wedgwood-text)',
        border: `1px solid ${lemon ? 'var(--lemon)' : 'var(--wedgwood)'}`,
        boxShadow: sticker ? '0 2px 4px rgba(74,68,56,0.08)' : 'none',
        ...style,
      }}
    >
      {children}
    </span>
  );
}

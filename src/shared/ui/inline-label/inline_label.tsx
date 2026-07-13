import type { ReactNode } from 'react';

import './inline_label.css';

export type InlineLabelTone = 'amber' | 'blue' | 'coral' | 'green';

export function InlineLabel({
  children,
  emoji,
  tone,
}: {
  children: ReactNode;
  emoji?: string;
  tone: InlineLabelTone;
}) {
  return (
    <span className={`inline-label inline-label--${tone}`}>
      {emoji ? <span aria-hidden="true">{emoji}</span> : null}
      {children}
    </span>
  );
}

import { useId } from 'react';

import { Button } from '@/shared/ui/button';

import './empty_state.css';

export type EmptyStateProps = {
  actionLabel: string;
  description: string;
  onAction: () => void;
  title: string;
};

export function EmptyState({
  actionLabel,
  description,
  onAction,
  title,
}: EmptyStateProps) {
  const instanceId = useId();
  const descriptionId = `${instanceId}-description`;
  const titleId = `${instanceId}-title`;

  return (
    <section
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      className="empty-state"
    >
      <span aria-hidden="true" className="empty-state__mark" />
      <h2 className="empty-state__title" id={titleId}>
        {title}
      </h2>
      <p className="empty-state__description" id={descriptionId}>
        {description}
      </p>
      <Button hierarchy="secondary" onClick={onAction} type="button">
        {actionLabel}
      </Button>
    </section>
  );
}

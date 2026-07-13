import { useId, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

import './status_message.css';

export type StatusMessageVariant = 'error' | 'success';

export type StatusMessageProps = {
  children: ReactNode;
  id?: string;
  title: string;
  variant: StatusMessageVariant;
};

export function StatusMessage({
  children,
  id,
  title,
  variant,
}: StatusMessageProps) {
  const instanceId = useId();
  const descriptionId = `${instanceId}-description`;
  const titleId = `${instanceId}-title`;
  const Icon = variant === 'error' ? AlertCircle : CheckCircle2;

  return (
    <section
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      className={`status-message status-message--${variant}`}
      id={id}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      <Icon aria-hidden="true" className="status-message__icon" />
      <div className="status-message__content">
        <strong className="status-message__title" id={titleId}>
          {title}
        </strong>
        <div className="status-message__description" id={descriptionId}>
          {children}
        </div>
      </div>
    </section>
  );
}

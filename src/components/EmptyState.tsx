import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state" role="status" aria-live="polite">
      <h2>{title}</h2>
      {description ? <p className="muted">{description}</p> : null}
      {action}
    </div>
  );
}

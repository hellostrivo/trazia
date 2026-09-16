interface StatusBadgeProps {
  tone?: 'success' | 'warning';
  children: string;
}

export function StatusBadge({ tone = 'success', children }: StatusBadgeProps) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

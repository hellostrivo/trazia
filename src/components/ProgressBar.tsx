interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
}

export function ProgressBar({ value, max = 100, label }: ProgressBarProps) {
  const safeValue = Math.min(Math.max(value, 0), max);
  const percentage = max === 0 ? 0 : (safeValue / max) * 100;

  return (
    <div aria-label={label ?? 'Progreso'}>
      <div className="progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={safeValue}>
        <span style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

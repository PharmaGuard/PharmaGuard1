import type { AlertSeverity } from '../types';

interface AlertBadgeProps {
  severity: AlertSeverity;
  size?: 'sm' | 'md';
}

export default function AlertBadge({ severity, size = 'md' }: AlertBadgeProps) {
  const base = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1';
  const styles: Record<AlertSeverity, string> = {
    red: 'bg-red-100 text-red-700 font-bold',
    amber: 'bg-amber-100 text-amber-700 font-semibold',
    green: 'bg-green-100 text-green-700 font-semibold',
  };
  const labels: Record<AlertSeverity, string> = {
    red: 'RED',
    amber: 'AMBER',
    green: 'GREEN',
  };

  return (
    <span className={`inline-flex items-center rounded font-mono uppercase tracking-wide ${base} ${styles[severity]}`}>
      {labels[severity]}
    </span>
  );
}

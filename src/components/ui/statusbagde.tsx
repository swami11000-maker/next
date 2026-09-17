import { Badge } from './badge';

interface StatusBadgeProps {
  status?: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const value = status?.toLowerCase().trim() ?? '';

  const config =
    value === 'success' || value === 'completed' || value === 'complete'
      ? {
          label: status || 'Success',
          className: 'border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100',
          dot: 'bg-emerald-500',
        }
      : value === 'pending' || value === 'panding' || value === 'processing'
        ? {
            label: status || 'Pending',
            className: 'border-yellow-200 bg-yellow-50 text-yellow-700 shadow-sm shadow-yellow-100',
            dot: 'bg-yellow-500',
          }
        : value === 'failed' || value === 'cancelled' || value === 'rejected'
          ? {
              label: status || 'Failed',
              className: 'border-red-200 bg-red-50 text-red-700 shadow-sm shadow-red-100',
              dot: 'bg-red-500',
            }
          : {
              label: status || 'Unknown',
              className: 'border-slate-200 bg-slate-50 text-slate-600 shadow-sm shadow-slate-100',
              dot: 'bg-slate-400',
            };

  return (
    <Badge variant="outline" className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide transition-all duration-200 hover:shadow-md ${config.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot} shadow-[0_0_0_2px_rgba(255,255,255,0.8)]`} />

      <span className="capitalize">{config.label}</span>
    </Badge>
  );
}

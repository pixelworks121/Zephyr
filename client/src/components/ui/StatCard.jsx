import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

// A compact stat card: label, value, optional icon, optional trend, optional accent.
export default function StatCard({
  label,
  value,
  icon: Icon,
  trend, // number, positive/negative percentage
  accent = 'text', // 'text' | 'success' | 'danger' | 'warning' | 'primary'
  hint,
}) {
  const accentColor = {
    text: 'text-text',
    success: 'text-success',
    danger: 'text-danger',
    warning: 'text-warning',
    primary: 'text-primary',
    info: 'text-info',
  }[accent] || 'text-text';

  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm text-text-secondary">{label}</p>
        {Icon && <Icon size={18} className="text-text-secondary" />}
      </div>
      <div className="mt-2 flex items-end gap-2">
        <span className={`text-2xl font-bold ${accentColor}`}>{value}</span>
        {typeof trend === 'number' && (
          <span
            className={`flex items-center text-xs font-medium mb-1 ${
              trend >= 0 ? 'text-success' : 'text-danger'
            }`}
          >
            {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-text-secondary">{hint}</p>}
    </div>
  );
}

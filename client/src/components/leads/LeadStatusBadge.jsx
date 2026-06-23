import { LEAD_STATUS_COLORS, LEAD_STATUS_LABELS } from '../../utils/constants';

export default function LeadStatusBadge({ status, size = 'md' }) {
  const color = LEAD_STATUS_COLORS[status] || '#9898a8';
  const label = LEAD_STATUS_LABELS[status] || status?.replace(/_/g, ' ') || 'Unknown';
  const sizeCls = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap ${sizeCls}`}
      style={{ backgroundColor: `${color}26`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

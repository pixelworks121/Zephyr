import { FileText, Phone, Mail, Calendar, Bell, ArrowRight } from 'lucide-react';
import { ACTIVITY_TYPE_COLORS } from '../../utils/constants';

const ICONS = {
  NOTE: FileText,
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Calendar,
  FOLLOW_UP: Bell,
  STATUS_CHANGE: ArrowRight,
};

export default function ActivityTypeIcon({ type, size = 16, withBg = false }) {
  const Icon = ICONS[type] || FileText;
  const color = ACTIVITY_TYPE_COLORS[type] || '#9898a8';

  if (withBg) {
    return (
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${color}26`, color }}
      >
        <Icon size={size} />
      </span>
    );
  }
  return <Icon size={size} style={{ color }} />;
}

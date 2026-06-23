import { Inbox } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  message,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface2 mb-4">
        <Icon size={26} className="text-text-secondary" />
      </div>
      <h3 className="text-base font-semibold text-text">{title}</h3>
      {message && <p className="mt-1 text-sm text-text-secondary max-w-sm">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

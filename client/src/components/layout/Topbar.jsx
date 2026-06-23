import { Menu, Bell } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

function initials(name = '') {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function Topbar({ title, onMenuClick }) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-20 h-16 bg-bg/80 backdrop-blur border-b border-border flex items-center gap-3 px-4 sm:px-6">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-2 rounded-lg text-text-secondary hover:text-text hover:bg-surface2"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      <h1 className="text-lg font-semibold text-text truncate flex-1">{title}</h1>

      <div className="flex items-center gap-3">
        <button
          className="relative p-2 rounded-lg text-text-secondary hover:text-text hover:bg-surface2"
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
        </button>
        <div className="hidden sm:flex items-center gap-2.5">
          <span className="text-sm text-text-secondary">{user?.name}</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-semibold">
            {initials(user?.name) || '?'}
          </div>
        </div>
      </div>
    </header>
  );
}

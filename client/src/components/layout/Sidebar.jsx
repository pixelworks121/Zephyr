import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Bell,
  Activity,
  BarChart3,
  UserCheck,
  FileText,
  Globe,
  LogOut,
  Zap,
  X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const employeeLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/leads', label: 'My Leads', icon: Users },
  { to: '/followups', label: 'Follow-Ups', icon: Bell },
  { to: '/activities', label: 'Activity Log', icon: Activity },
];

const adminLinks = [
  { to: '/admin', label: 'Admin Overview', icon: BarChart3 },
  { to: '/leads', label: 'All Leads', icon: Users },
  { to: '/admin/team', label: 'Team', icon: UserCheck },
  { to: '/admin/reports', label: 'Reports', icon: FileText },
  { to: '/admin/sources', label: 'Lead Sources', icon: Globe },
];

function initials(name = '') {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function Sidebar({ open, onClose }) {
  const { user, logout, isAdmin } = useAuth();
  const links = isAdmin ? adminLinks : employeeLinks;

  return (
    <>
      {/* Mobile overlay backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[260px] bg-surface border-r border-border flex flex-col
          transform transition-transform duration-200 lg:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Zap size={18} className="text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-text">Zephyr</p>
              <p className="text-[11px] text-text-secondary">Pixel Works</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-text-secondary hover:text-text"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/admin'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-text-secondary hover:text-text hover:bg-surface2'
                }`
              }
            >
              <link.icon size={18} />
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-border p-3 shrink-0">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-sm font-semibold">
              {initials(user?.name) || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text truncate">{user?.name || 'User'}</p>
              <p className="text-[11px] text-text-secondary">{user?.role || 'EMPLOYEE'}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-lg text-text-secondary hover:text-danger hover:bg-surface2 transition-colors"
              title="Log out"
              aria-label="Log out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

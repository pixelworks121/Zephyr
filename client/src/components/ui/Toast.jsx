import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import useToastStore from './useToast';

const CONFIG = {
  success: { icon: CheckCircle2, color: 'text-success', border: 'border-success/40' },
  error: { icon: XCircle, color: 'text-danger', border: 'border-danger/40' },
  warning: { icon: AlertTriangle, color: 'text-warning', border: 'border-warning/40' },
  info: { icon: Info, color: 'text-info', border: 'border-info/40' },
};

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-sm">
      {toasts.map((t) => {
        const cfg = CONFIG[t.type] || CONFIG.info;
        const Icon = cfg.icon;
        return (
          <div
            key={t.id}
            role="alert"
            className={`flex items-start gap-3 rounded-lg border ${cfg.border} bg-surface2 px-4 py-3 shadow-lg animate-slide-in-right`}
          >
            <Icon size={18} className={`${cfg.color} mt-0.5 shrink-0`} />
            <p className="flex-1 text-sm text-text break-words">{t.message}</p>
            <button
              onClick={() => remove(t.id)}
              className="text-text-secondary hover:text-text transition-colors shrink-0"
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-primary hover:bg-primary-dark text-white border border-transparent',
  secondary: 'bg-surface2 hover:bg-border text-text border border-border',
  danger: 'bg-danger hover:bg-danger/85 text-white border border-transparent',
  ghost: 'bg-transparent hover:bg-surface2 text-text-secondary hover:text-text border border-transparent',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  type = 'button',
  className = '',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/50
        ${VARIANTS[variant] || VARIANTS.primary} ${SIZES[size] || SIZES.md}
        ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

const VARIANTS = {
  success: 'bg-success/20 text-success',
  warning: 'bg-warning/20 text-warning',
  danger: 'bg-danger/20 text-danger',
  info: 'bg-info/20 text-info',
  primary: 'bg-primary/20 text-primary',
  default: 'bg-text-secondary/20 text-text-secondary',
};

const SIZES = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm',
};

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  color, // optional hex for fully custom coloring
  className = '',
}) {
  const style = color
    ? { backgroundColor: `${color}33`, color }
    : undefined;
  return (
    <span
      style={style}
      className={`inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap
        ${color ? '' : VARIANTS[variant] || VARIANTS.default} ${SIZES[size] || SIZES.md} ${className}`}
    >
      {children}
    </span>
  );
}

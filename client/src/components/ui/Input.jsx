export default function Input({
  label,
  error,
  icon: Icon,
  className = '',
  id,
  ...props
}) {
  const inputId = id || props.name || label;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-text-secondary mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
          />
        )}
        <input
          id={inputId}
          className={`w-full rounded-lg bg-surface2 border text-sm text-text placeholder:text-text-secondary/60
            py-2.5 ${Icon ? 'pl-10' : 'pl-3'} pr-3
            focus:outline-none focus:ring-2 transition-colors disabled:opacity-50
            ${error ? 'border-danger focus:ring-danger/40' : 'border-border focus:ring-primary/40 focus:border-primary'}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

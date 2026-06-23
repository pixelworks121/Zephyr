export default function Card({ children, className = '', padding = 'p-6', ...props }) {
  return (
    <div
      className={`bg-surface border border-border rounded-xl ${padding} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

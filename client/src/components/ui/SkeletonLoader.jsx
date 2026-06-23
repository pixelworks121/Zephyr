const Block = ({ className = '' }) => (
  <div className={`animate-pulse rounded bg-surface2 ${className}`} />
);

export default function SkeletonLoader({ rows = 3, type = 'list' }) {
  if (type === 'card') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-xl p-5 space-y-3">
            <Block className="h-5 w-2/3" />
            <Block className="h-4 w-1/2" />
            <Block className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="border-b border-border p-4">
          <Block className="h-5 w-40" />
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b border-border last:border-0">
            <Block className="h-4 flex-1" />
            <Block className="h-4 w-24" />
            <Block className="h-4 w-20" />
            <Block className="h-4 w-16" />
          </div>
        ))}
      </div>
    );
  }

  // list
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4">
          <Block className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Block className="h-4 w-1/3" />
            <Block className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

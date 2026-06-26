// Color-coded AI score. green 7-10, yellow 4-6, red 1-3, gray if null.
export function scoreColor(score) {
  if (score == null) return '#9898a8';
  if (score >= 7) return '#22c55e';
  if (score >= 4) return '#f59e0b';
  return '#ef4444';
}

export default function AiScore({ score, size = 'md', showOutOf = false, analyzing = false }) {
  const cls = size === 'lg' ? 'text-2xl font-bold' : 'text-sm font-semibold';

  // No score yet.
  if (score == null) {
    if (analyzing) {
      return (
        <span className={`inline-flex items-center gap-1.5 ${size === 'lg' ? 'text-sm' : 'text-xs'} text-text-secondary font-medium`}>
          <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
          Analyzing…
        </span>
      );
    }
    return (
      <span className={`${size === 'lg' ? 'text-sm' : 'text-xs'} text-text-secondary`}>
        Not analyzed
      </span>
    );
  }

  const color = scoreColor(score);
  const display = Math.round(score * 10) / 10;
  return (
    <span className={cls} style={{ color }}>
      {display}
      {showOutOf && <span className="text-text-secondary text-xs font-normal">/10</span>}
    </span>
  );
}

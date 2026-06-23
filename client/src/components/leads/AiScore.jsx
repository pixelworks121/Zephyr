// Color-coded AI score. green 7-10, yellow 4-6, red 1-3, gray if null.
export function scoreColor(score) {
  if (score == null) return '#9898a8';
  if (score >= 7) return '#22c55e';
  if (score >= 4) return '#f59e0b';
  return '#ef4444';
}

export default function AiScore({ score, size = 'md', showOutOf = false }) {
  const color = scoreColor(score);
  const display = score == null ? '—' : Math.round(score * 10) / 10;
  const cls = size === 'lg' ? 'text-2xl font-bold' : 'text-sm font-semibold';
  return (
    <span className={cls} style={{ color }}>
      {display}
      {showOutOf && score != null && <span className="text-text-secondary text-xs font-normal">/10</span>}
    </span>
  );
}

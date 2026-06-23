import { Loader2 } from 'lucide-react';

const SIZES = {
  sm: 16,
  md: 24,
  lg: 40,
};

export default function Spinner({ size = 'md', className = '' }) {
  return (
    <Loader2
      size={SIZES[size] || SIZES.md}
      className={`animate-spin text-primary ${className}`}
    />
  );
}

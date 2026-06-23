import { AlertTriangle } from 'lucide-react';
import Button from './Button';
import { getErrorMessage } from '../../services/api';

export default function ErrorState({ error, onRetry, title = 'Something went wrong' }) {
  const message =
    typeof error === 'string' ? error : getErrorMessage(error, 'Failed to load data.');

  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger/15 mb-4">
        <AlertTriangle size={26} className="text-danger" />
      </div>
      <h3 className="text-base font-semibold text-text">{title}</h3>
      <p className="mt-1 text-sm text-text-secondary max-w-sm">{message}</p>
      {onRetry && (
        <div className="mt-5">
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}

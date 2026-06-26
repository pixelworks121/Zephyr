import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Automatically refetches a single lead's data every 15 seconds
// until its AI score appears — then stops polling.
export default function AutoRefreshTrigger({ leadId, hasScore }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (hasScore) return; // already analyzed — no need to poll

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
    }, 15000); // check every 15 seconds

    return () => clearInterval(interval);
  }, [leadId, hasScore, queryClient]);

  return null; // renders nothing
}

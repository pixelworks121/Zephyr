import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import ConfirmDialog from '../ui/ConfirmDialog';
import { leadsAPI, getErrorMessage } from '../../services/api';
import { toast } from '../ui/useToast';

// Render-prop component: children(open) returns the trigger element.
// onDeleted optional callback (e.g. navigate away from detail page).
export default function DeleteLeadButton({ lead, children, onDeleted }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => leadsAPI.delete(lead.id),
    onSuccess: () => {
      toast.success('Lead deleted');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
      setOpen(false);
      onDeleted?.();
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to delete lead')),
  });

  return (
    <>
      {children(() => setOpen(true))}
      <ConfirmDialog
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={() => mutation.mutate()}
        title="Delete lead?"
        message={`This will permanently delete "${lead.companyName}" and all its activities and follow-ups. This cannot be undone.`}
        confirmLabel="Delete"
        dangerous
        loading={mutation.isPending}
      />
    </>
  );
}

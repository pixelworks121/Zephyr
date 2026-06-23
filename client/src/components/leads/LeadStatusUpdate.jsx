import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Card from '../ui/Card';
import Select from '../ui/Select';
import Button from '../ui/Button';
import LeadStatusBadge from './LeadStatusBadge';
import { leadsAPI, getErrorMessage } from '../../services/api';
import { toast } from '../ui/useToast';
import { LEAD_STATUSES, LEAD_STATUS_LABELS, toOptions } from '../../utils/constants';

export default function LeadStatusUpdate({ lead }) {
  const [status, setStatus] = useState(lead.status);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => leadsAPI.update(lead.id, { status }),
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['lead', lead.id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to update status')),
  });

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-text">Status</h3>
        <LeadStatusBadge status={lead.status} />
      </div>
      <Select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        options={toOptions(LEAD_STATUSES, LEAD_STATUS_LABELS)}
        className="mb-3"
      />
      <Button
        fullWidth
        onClick={() => mutation.mutate()}
        loading={mutation.isPending}
        disabled={status === lead.status}
      >
        Update Status
      </Button>
    </Card>
  );
}

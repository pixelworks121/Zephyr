import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Card from '../ui/Card';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { leadsAPI, employeesAPI, getErrorMessage } from '../../services/api';
import { toast } from '../ui/useToast';

export default function LeadAssignCard({ lead }) {
  const [assignedToId, setAssignedToId] = useState(lead.assignedToId || '');
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesAPI.getAll(),
    select: (res) => res.data,
  });

  const mutation = useMutation({
    mutationFn: () => leadsAPI.assign(lead.id, { assignedToId }),
    onSuccess: () => {
      toast.success('Lead assigned');
      queryClient.invalidateQueries({ queryKey: ['lead', lead.id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to assign lead')),
  });

  const options = (employees || []).map((e) => ({ value: e.id, label: e.name }));

  return (
    <Card>
      <h3 className="font-semibold text-text mb-3">Assign Lead</h3>
      <p className="text-sm text-text-secondary mb-3">
        Current: <span className="text-text">{lead.assignedTo?.name || 'Unassigned'}</span>
      </p>
      <Select
        value={assignedToId}
        onChange={(e) => setAssignedToId(e.target.value)}
        placeholder="Select employee"
        options={options}
        className="mb-3"
      />
      <Button
        fullWidth
        onClick={() => mutation.mutate()}
        loading={mutation.isPending}
        disabled={!assignedToId || assignedToId === lead.assignedToId}
      >
        Save Assignment
      </Button>
    </Card>
  );
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Loader2, Zap } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { pipelineAPI, getErrorMessage } from '../../services/api';
import { toast } from '../ui/useToast';
import { timeAgo } from '../../utils/formatDate';

export default function PipelineControlCard() {
  const queryClient = useQueryClient();

  const { data: status } = useQuery({
    queryKey: ['pipeline-status'],
    queryFn: () => pipelineAPI.getStatus(),
    select: (res) => res.data,
    refetchInterval: (query) => query.state.data?.isRunning ? 5000 : 30000,
  });

  const { data: usage } = useQuery({
    queryKey: ['pipeline-usage'],
    queryFn: () => pipelineAPI.getUsage(),
    select: (res) => res.data,
  });

  const run = useMutation({
    mutationFn: () => pipelineAPI.run(),
    onSuccess: () => {
      toast.success('Pipeline started — leads will appear shortly');
      queryClient.invalidateQueries({ queryKey: ['pipeline-status'] });
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to start pipeline')),
  });

  const isRunning = status?.isRunning;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-text flex items-center gap-2">
          <Zap size={18} className="text-primary" /> Discovery Pipeline
        </h3>
        {isRunning && (
          <span className="flex items-center gap-1.5 text-xs text-primary">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" /> Running
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-surface2 rounded-lg p-3">
          <p className="text-xs text-text-secondary">Leads Today</p>
          <p className="text-lg font-bold text-text">{status?.leadsToday ?? '—'}</p>
        </div>
        <div className="bg-surface2 rounded-lg p-3">
          <p className="text-xs text-text-secondary">This Week</p>
          <p className="text-lg font-bold text-text">{status?.leadsThisWeek ?? '—'}</p>
        </div>
      </div>

      {status?.lastRun && (
        <p className="text-xs text-text-secondary mb-3">Last run: {timeAgo(status.lastRun)}</p>
      )}

      {usage && (
        <div className="space-y-1 mb-4 text-xs text-text-secondary">
          <p>Hunter: {usage.hunter?.searches?.used ?? 0}/{usage.hunter?.searches?.limit ?? 25} searches</p>
          <p>Apollo: {usage.apollo?.credits?.used ?? 0}/{usage.apollo?.credits?.limit ?? 50} credits</p>
          <p>Google: {usage.googleSearch?.dailyLimit ?? 100} free queries/day</p>
        </div>
      )}

      <Button
        fullWidth
        onClick={() => run.mutate()}
        loading={run.isPending}
        disabled={isRunning}
      >
        {isRunning ? <><Loader2 size={16} className="animate-spin" /> Running…</> : <><Play size={16} /> Run Now</>}
      </Button>
    </Card>
  );
}

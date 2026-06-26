import { useQuery } from '@tanstack/react-query';
import { Bot, CheckCircle2, XCircle, MessagesSquare } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { aiAPI } from '../../services/api';

function AgentRow({ label, agent }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-surface2 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-xs text-text-secondary">{label}</p>
        <p className="text-sm text-text truncate capitalize">
          {agent?.provider || '—'}
          {agent?.model ? <span className="text-text-secondary"> / {agent.model}</span> : null}
        </p>
      </div>
      {agent?.configured ? (
        <Badge variant="success" size="sm"><CheckCircle2 size={12} /> Connected</Badge>
      ) : (
        <Badge variant="warning" size="sm"><XCircle size={12} /> Not Configured</Badge>
      )}
    </div>
  );
}

export default function AIStatusCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['ai-status'],
    queryFn: () => aiAPI.status(),
    select: (res) => res.data,
  });

  return (
    <Card>
      <h3 className="font-semibold text-text flex items-center gap-2 mb-4">
        <Bot size={18} className="text-primary" /> AI Agents
      </h3>

      {isLoading ? (
        <p className="text-sm text-text-secondary">Loading…</p>
      ) : (
        <div className="space-y-2.5">
          <AgentRow label="Agent 1 (Primary)" agent={data?.agents?.ai1} />
          <AgentRow label="Agent 2 (Reviewer)" agent={data?.agents?.ai2} />

          <div className="flex items-center gap-2 pt-1 text-sm">
            <MessagesSquare size={15} className="text-text-secondary" />
            <span className="text-text-secondary">Multi-Agent Discussion:</span>
            {data?.features?.multiAgentDiscussion ? (
              <span className="text-success font-medium">Enabled</span>
            ) : (
              <span className="text-warning font-medium">Requires both agents</span>
            )}
          </div>

          {data?.stats && (
            <p className="text-xs text-text-secondary pt-1">
              {data.stats.leadsWithScore} scored · {data.stats.leadsWithoutScore} unscored
              {data.stats.avgScore != null && ` · avg ${data.stats.avgScore}/10`}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

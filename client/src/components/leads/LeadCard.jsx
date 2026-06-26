import { useNavigate } from 'react-router-dom';
import LeadStatusBadge from './LeadStatusBadge';
import AiScore from './AiScore';
import { formatDate, isRecent } from '../../utils/formatDate';
import { countryFlag } from '../../utils/flags';

export default function LeadCard({ lead }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/leads/${lead.id}`)}
      className="w-full text-left bg-surface2 border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-text truncate">
          {countryFlag(lead.country)} {lead.companyName}
        </h3>
        <AiScore score={lead.aiScore} analyzing={lead.aiScore == null && isRecent(lead.createdAt)} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <LeadStatusBadge status={lead.status} />
        <span className="text-xs text-text-secondary">{formatDate(lead.createdAt)}</span>
      </div>
      <p className="mt-2 text-xs text-text-secondary truncate">
        {lead.assignedTo?.name ? `Assigned to ${lead.assignedTo.name}` : 'Unassigned'}
      </p>
    </button>
  );
}

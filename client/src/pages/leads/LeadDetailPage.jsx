import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ExternalLink,
  Mail,
  Phone,
  Linkedin,
  Twitter,
  Pencil,
  Trash2,
  Globe,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import ErrorState from '../../components/ui/ErrorState';
import CopyButton from '../../components/ui/CopyButton';
import LeadStatusBadge from '../../components/leads/LeadStatusBadge';
import AiScore from '../../components/leads/AiScore';
import LeadFormModal from '../../components/leads/LeadFormModal';
import DeleteLeadButton from '../../components/leads/DeleteLeadButton';
import LeadStatusUpdate from '../../components/leads/LeadStatusUpdate';
import LeadAssignCard from '../../components/leads/LeadAssignCard';
import LeadFollowUps from '../../components/leads/LeadFollowUps';
import LeadActivityTimeline from '../../components/leads/LeadActivityTimeline';
import AIAnalysisButton from '../../components/admin/AIAnalysisButton';
import { leadsAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { formatDate } from '../../utils/formatDate';
import {
  LEAD_SOURCE_LABELS,
  BUSINESS_SIZE_LABELS,
} from '../../utils/constants';

function InfoRow({ icon: Icon, label, children }) {
  if (!children) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon size={15} className="text-text-secondary mt-0.5 shrink-0" />
      <div>
        <span className="text-text-secondary">{label}: </span>
        <span className="text-text break-all">{children}</span>
      </div>
    </div>
  );
}

function TextCard({ title, text, copyable }) {
  if (!text) return null;
  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-text">{title}</h3>
        {copyable && <CopyButton text={text} />}
      </div>
      <p className="text-sm text-text-secondary whitespace-pre-wrap">{text}</p>
    </Card>
  );
}

export default function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [editOpen, setEditOpen] = useState(false);

  const { data: lead, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['lead', id],
    queryFn: () => leadsAPI.getById(id),
    select: (res) => res.data,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader type="card" rows={2} />
        <SkeletonLoader type="list" rows={3} />
      </div>
    );
  }

  if (isError) {
    return <ErrorState error={error} onRetry={refetch} title="Could not load lead" />;
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column (60%) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Header card */}
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-text">{lead.companyName}</h1>
                  {lead.website && (
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-secondary hover:text-primary"
                    >
                      <ExternalLink size={18} />
                    </a>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <LeadStatusBadge status={lead.status} size="lg" />
                  <span className="text-xs text-text-secondary">
                    {LEAD_SOURCE_LABELS[lead.source] || lead.source}
                  </span>
                </div>
                <p className="mt-3 text-sm text-text-secondary">
                  {[lead.country, lead.industry, BUSINESS_SIZE_LABELS[lead.businessSize]]
                    .filter(Boolean)
                    .join(' · ') || 'No details'}
                </p>
              </div>

              <div className="flex flex-col items-end gap-3 shrink-0">
                <div className="text-right">
                  <p className="text-xs text-text-secondary">AI Score</p>
                  <AiScore score={lead.aiScore} size="lg" showOutOf />
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                      <Pencil size={14} /> Edit
                    </Button>
                    <DeleteLeadButton lead={lead} onDeleted={() => navigate('/leads')}>
                      {(open) => (
                        <Button variant="danger" size="sm" onClick={open}>
                          <Trash2 size={14} /> Delete
                        </Button>
                      )}
                    </DeleteLeadButton>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Contact info */}
          <Card>
            <h3 className="font-semibold text-text mb-3">Lead Information</h3>
            <div className="space-y-2.5">
              <InfoRow icon={Mail} label="Contact">
                {lead.contactName}
              </InfoRow>
              {lead.email && (
                <div className="flex items-start gap-2 text-sm">
                  <Mail size={15} className="text-text-secondary mt-0.5" />
                  <a href={`mailto:${lead.email}`} className="text-primary hover:underline break-all">
                    {lead.email}
                  </a>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-start gap-2 text-sm">
                  <Phone size={15} className="text-text-secondary mt-0.5" />
                  <a href={`tel:${lead.phone}`} className="text-primary hover:underline">
                    {lead.phone}
                  </a>
                </div>
              )}
              {lead.website && (
                <div className="flex items-start gap-2 text-sm">
                  <Globe size={15} className="text-text-secondary mt-0.5" />
                  <a
                    href={lead.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline break-all"
                  >
                    {lead.website}
                  </a>
                </div>
              )}
              {lead.linkedinUrl && (
                <div className="flex items-start gap-2 text-sm">
                  <Linkedin size={15} className="text-text-secondary mt-0.5" />
                  <a
                    href={lead.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline break-all"
                  >
                    LinkedIn
                  </a>
                </div>
              )}
              {lead.twitterUrl && (
                <div className="flex items-start gap-2 text-sm">
                  <Twitter size={15} className="text-text-secondary mt-0.5" />
                  <a
                    href={lead.twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline break-all"
                  >
                    Twitter
                  </a>
                </div>
              )}
              <div className="pt-2 border-t border-border text-xs text-text-secondary">
                Created {formatDate(lead.createdAt)} · Updated {formatDate(lead.updatedAt)}
              </div>
            </div>
          </Card>

          {/* AI analysis */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text">AI Analysis</h3>
              <AIAnalysisButton leadId={lead.id} currentScore={lead.aiScore} onComplete={refetch} />
            </div>
            
            {(!lead.whyGoodProspect && !lead.recommendedServices && !lead.aiAnalysis) ? (
              <p className="text-sm text-text-secondary">No AI analysis available for this lead yet.</p>
            ) : (
              <div className="space-y-4">
                {lead.whyGoodProspect && (
                  <div>
                    <p className="text-xs font-medium text-text-secondary mb-1">Why Good Prospect</p>
                    <p className="text-sm text-text whitespace-pre-wrap">{lead.whyGoodProspect}</p>
                  </div>
                )}
                {lead.recommendedServices && (
                  <div>
                    <p className="text-xs font-medium text-text-secondary mb-1">Recommended Services</p>
                    <p className="text-sm text-text whitespace-pre-wrap">{lead.recommendedServices}</p>
                  </div>
                )}
                {lead.aiAnalysis && (
                  (() => {
                    let discussionTranscript = null;
                    try {
                      discussionTranscript = JSON.parse(lead.aiAnalysis);
                    } catch (e) {
                      // Not JSON
                    }

                    if (Array.isArray(discussionTranscript)) {
                      return (
                        <div>
                          <p className="text-xs font-medium text-text-secondary mb-2">Agent Discussion Timeline</p>
                          <div className="space-y-3">
                            {discussionTranscript.map((msg, idx) => (
                              <div key={idx} className={`p-3 rounded-lg border ${msg.agent.includes('Alpha') ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-purple-500/10 border-purple-500/20'}`}>
                                <div className="flex justify-between items-center mb-1">
                                  <span className={`text-xs font-semibold ${msg.agent.includes('Alpha') ? 'text-indigo-400' : 'text-purple-400'}`}>{msg.agent}</span>
                                  <span className="text-[10px] text-text-secondary uppercase">Round {msg.round} • {msg.type}</span>
                                </div>
                                <p className="text-sm text-text whitespace-pre-wrap">{msg.content}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div>
                        <p className="text-xs font-medium text-text-secondary mb-1">Analysis</p>
                        <p className="text-sm text-text whitespace-pre-wrap">{lead.aiAnalysis}</p>
                      </div>
                    );
                  })()
                )}
              </div>
            )}
          </Card>

          <TextCard title="Email Template" text={lead.emailTemplate} copyable />
          <TextCard title="Call Script" text={lead.callScript} copyable />
        </div>

        {/* Right column (40%) */}
        <div className="lg:col-span-2 space-y-6">
          {isAdmin && <LeadAssignCard lead={lead} />}
          <LeadStatusUpdate lead={lead} />
          <LeadFollowUps lead={lead} />
          <LeadActivityTimeline lead={lead} />
        </div>
      </div>

      <LeadFormModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        mode="edit"
        lead={lead}
      />
    </div>
  );
}

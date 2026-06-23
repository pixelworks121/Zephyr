import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { aiAPI, getErrorMessage } from '../../services/api';
import { toast } from '../ui/useToast';
import { useAuth } from '../../hooks/useAuth';

// Renders the discussion transcript as a chat timeline.
function DiscussionTranscript({ discussion }) {
  if (!discussion || discussion.length === 0) return null;
  return (
    <div className="mt-4 space-y-3">
      <h4 className="text-sm font-semibold text-text">Agent Discussion</h4>
      {discussion.map((msg, i) => {
        const isAlpha = msg.agent.includes('Alpha');
        return (
          <div key={i} className={`flex ${isAlpha ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              isAlpha ? 'bg-primary/15 border border-primary/30' : 'bg-[#a855f7]/15 border border-[#a855f7]/30'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-semibold ${isAlpha ? 'text-primary' : 'text-[#a855f7]'}`}>
                  {msg.agent}
                </span>
                <Badge variant="default" size="sm">Round {msg.round}</Badge>
              </div>
              <p className="text-text-secondary whitespace-pre-wrap text-xs">{msg.content}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AIAnalysisButton({ leadId, currentScore, onComplete }) {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [discussion, setDiscussion] = useState(null);
  const [showDiscussion, setShowDiscussion] = useState(false);

  const analyzeMutation = useMutation({
    mutationFn: () => aiAPI.analyze(leadId),
    onSuccess: (res) => {
      toast.success(`AI Analysis complete — Score: ${res.data?.aiResult?.finalScore}/10`);
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      onComplete?.();
    },
    onError: (err) => toast.error(getErrorMessage(err, 'AI analysis failed')),
  });

  const discussMutation = useMutation({
    mutationFn: () => aiAPI.discuss(leadId),
    onSuccess: (res) => {
      const data = res.data;
      toast.success(`Discussion complete — Consensus: ${data?.finalScore}/10`);
      setDiscussion(data?.discussion || []);
      setShowDiscussion(true);
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      onComplete?.();
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Discussion failed')),
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={currentScore ? 'secondary' : 'primary'}
          size="sm"
          onClick={() => analyzeMutation.mutate()}
          loading={analyzeMutation.isPending}
        >
          <Sparkles size={14} /> {currentScore ? 'Re-analyze' : 'Run AI Analysis'}
        </Button>

        {isAdmin && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => discussMutation.mutate()}
            loading={discussMutation.isPending}
          >
            <MessageSquare size={14} /> Multi-Agent Discussion
          </Button>
        )}
      </div>

      {discussion && discussion.length > 0 && (
        <div>
          <button
            onClick={() => setShowDiscussion((v) => !v)}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {showDiscussion ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showDiscussion ? 'Hide' : 'Show'} discussion transcript
          </button>
          {showDiscussion && <DiscussionTranscript discussion={discussion} />}
        </div>
      )}
    </div>
  );
}

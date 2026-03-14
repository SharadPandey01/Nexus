import { useState, useEffect } from 'react';
import { getApprovals, handleApproval } from '../services/api';
import { CheckCircle, XCircle, Clock, AlertTriangle, MessageSquare, Edit3 } from 'lucide-react';

const ApprovalsHub = () => {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const data = await getApprovals();
      setApprovals(data?.approvals || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch pending approvals from Nexus Core.');
      // Fallback mock data for styling purposes if backend isn't running
      setApprovals([
        {
          id: 'mock_1',
          agent: 'hermes',
          action: 'send_mass_email',
          description: 'Drafted welcome emails for 450 valid participants.',
          impact: 'Will send 450 emails via SMTP.',
          status: 'pending'
        },
        {
          id: 'mock_2',
          agent: 'fortuna',
          action: 'send_sponsor_pitch',
          description: 'Drafted pitch email for TechGlobal Corp.',
          impact: 'Potential $10,000 revenue increase.',
          status: 'pending'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const onAction = async (id, actionType) => {
    try {
      // Optimistic UI update
      setApprovals(prev => prev.filter(app => app.id !== id));
      await handleApproval(id, actionType);
    } catch (err) {
      console.error('Approval action failed', err);
      // Revert optimistic update on failure by re-fetching
      fetchApprovals();
    }
  };

  const agentColorMap = {
    chronos: 'bg-agents-chronos/20 text-agents-chronos border-agents-chronos/30',
    hermes: 'bg-agents-hermes/20 text-agents-hermes border-agents-hermes/30',
    apollo: 'bg-agents-apollo/20 text-agents-apollo border-agents-apollo/30',
    athena: 'bg-agents-athena/20 text-agents-athena border-agents-athena/30',
    fortuna: 'bg-warning/20 text-warning border-warning/30',
  };

  if (loading && approvals.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-white mb-1">Approvals Hub</h1>
          <p className="text-text-secondary text-sm">Review and authorize pending autonomous actions.</p>
        </div>
        <div className="flex items-center gap-2 bg-black/40 border border-white/10 px-4 py-2 rounded-lg">
          <Clock size={16} className="text-primary" />
          <span className="text-sm font-medium">{approvals.length} Pending</span>
        </div>
      </div>

      {error && (
        <div className="bg-error/10 border border-error/30 text-error px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertTriangle size={16} />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {approvals.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
            <CheckCircle className="text-success" size={32} />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">You're all caught up!</h3>
          <p className="text-text-secondary max-w-sm">
            There are no pending actions requiring human authorization. The swarm is operating normally.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {approvals.map((approval) => (
            <div key={approval.id} className="glass-card flex flex-col h-full border hover:border-white/20 transition-colors">
              <div className="p-5 flex-1">
                <div className="flex items-start justify-between mb-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border lowercase ${agentColorMap[approval.agent.toLowerCase()] || 'bg-gray-800 text-gray-300 border-gray-700'}`}>
                    agent: {approval.agent}
                  </span>
                  <span className="text-xs font-mono text-gray-500">{approval.id}</span>
                </div>
                
                <h3 className="text-lg font-bold text-white mb-2 capitalize">{String(approval.action).replace(/_/g, ' ')}</h3>
                <p className="text-gray-300 text-sm mb-4 leading-relaxed overflow-x-auto whitespace-pre-wrap">
                  {typeof approval.description === 'object' 
                    ? (approval.description.text || approval.description.body || JSON.stringify(approval.description, null, 2)) 
                    : approval.description}
                </p>

                <div className="bg-black/40 rounded border border-white/5 p-3 mb-4 flex items-start gap-2">
                  <AlertTriangle size={14} className="text-warning mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-xs text-gray-400 font-semibold uppercase block mb-1">Predicted Impact</span>
                    <span className="text-sm text-gray-200 overflow-x-auto whitespace-pre-wrap">
                      {typeof approval.impact === 'object' 
                        ? (approval.impact.details || approval.impact.summary || JSON.stringify(approval.impact, null, 2)) 
                        : approval.impact}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 p-4 bg-white/5 rounded-b-xl flex items-center justify-between gap-3">
                <button 
                  onClick={() => onAction(approval.id, 'reject')}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded border border-error/50 text-error hover:bg-error/10 transition-colors text-sm font-semibold"
                >
                  <XCircle size={16} /> Reject
                </button>
                <button 
                  onClick={() => onAction(approval.id, 'edit')}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded border border-white/20 text-gray-300 hover:bg-white/10 transition-colors text-sm font-semibold"
                >
                  <Edit3 size={16} /> Edit
                </button>
                <button 
                  onClick={() => onAction(approval.id, 'approve')}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded bg-success/20 text-success border border-success/50 hover:bg-success/30 transition-colors text-sm font-semibold"
                >
                  <CheckCircle size={16} /> Authorize
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApprovalsHub;

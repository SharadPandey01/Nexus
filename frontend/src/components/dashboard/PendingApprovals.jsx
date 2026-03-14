import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Edit3, XCircle, ArrowRight } from 'lucide-react';
import { getApprovals, handleApproval } from '../../services/api';

const PendingApprovals = () => {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    getApprovals()
      .then(res => setApprovals(res?.approvals || []))
      .catch(() => setApprovals([]))
      .finally(() => setLoading(false));
  }, []);

  const agentColorMap = {
    Hermes: { color: 'text-agents-hermes', bg: 'bg-agents-hermes/10' },
    Apollo: { color: 'text-agents-apollo', bg: 'bg-agents-apollo/10' },
    Chronos: { color: 'text-agents-chronos', bg: 'bg-agents-chronos/10' },
    Athena: { color: 'text-agents-athena', bg: 'bg-agents-athena/10' },
    'Nexus Core': { color: 'text-primary', bg: 'bg-primary/10' },
    Fortuna: { color: 'text-warning', bg: 'bg-warning/10' },
  };

  const onAction = async (id, action) => {
    setProcessing(id);
    try {
      await handleApproval(id, action);
      setApprovals(prev => prev.filter(a => a.id !== id));
    } catch (e) {
      console.error('Approval action failed:', e);
    }
    setProcessing(null);
  };

  // Fallback data
  const items = Array.isArray(approvals) ? approvals : [];

  return (
    <div className="glass-card shadow-sm">
      <div className="p-5 border-b border-white/10 flex justify-between items-center bg-black/20 rounded-t-xl">
        <h3 className="font-semibold text-white flex items-center">
          <span className="bg-error w-2 h-2 rounded-full mr-2"></span>
          Pending Approvals
          <span className="ml-2 bg-white/10 text-gray-300 text-xs px-2 py-0.5 rounded-full">{items.length}</span>
        </h3>
        <Link to="/dashboard/approvals" className="text-xs text-primary hover:text-white transition-colors flex items-center gap-1 font-medium">
          View All <ArrowRight size={12} />
        </Link>
      </div>
      
      <div className="p-5 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1].map(i => (
              <div key={i} className="border border-white/5 rounded-lg p-4">
                <div className="skeleton h-4 w-1/2 mb-3" />
                <div className="skeleton h-12 mb-3" />
                <div className="flex gap-2"><div className="flex-1 skeleton h-8" /><div className="flex-1 skeleton h-8" /></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {items.slice(0, 1).map((item) => {
              if (!item) return null;
              const agentName = item.agent && typeof item.agent === 'string' ? item.agent : '';
              const colors = agentColorMap[agentName] || { color: 'text-gray-400', bg: 'bg-gray-800' };
              const initial = agentName ? agentName.charAt(0).toUpperCase() : '?';
              return (
                <div key={item.id || Math.random()} className="border border-white/10 rounded-lg p-4 bg-black/40 transition-colors hover:border-white/20">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center">
                      <div className={`p-2 rounded mr-3 ${colors.bg} ${colors.color}`}>
                         {initial}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">{item.action || item.title || 'Pending Task'}</h4>
                        <div className="text-xs text-text-secondary">{item.description || item.desc || 'No description provided'} • {item.impact || 'Normal Impact'}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-black/30 p-3 rounded-md mb-4 border border-white/10">
                    <p className="text-sm text-gray-300 font-serif italic text-ellipsis overflow-hidden whitespace-nowrap">
                      "{item.description || item.preview || 'No preview available'}"
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => onAction(item.id, 'approve')}
                      disabled={processing === item.id}
                      className="flex-1 bg-success/10 hover:bg-success/20 text-success border border-success/30 py-2 rounded-md text-xs font-medium flex items-center justify-center transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} className="mr-1.5" /> Approve
                    </button>
                    <button
                      onClick={() => onAction(item.id, 'edit')}
                      disabled={processing === item.id}
                      className="flex-1 bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 py-2 rounded-md text-xs font-medium flex items-center justify-center transition-colors disabled:opacity-50"
                    >
                      <Edit3 size={14} className="mr-1.5" /> Edit
                    </button>
                    <button
                      onClick={() => onAction(item.id, 'reject')}
                      disabled={processing === item.id}
                      className="bg-error/10 hover:bg-error/20 text-error border border-error/30 px-3 py-2 rounded-md text-xs font-medium flex items-center justify-center transition-colors disabled:opacity-50"
                    >
                      <XCircle size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
            {items.length === 0 && (
              <div className="text-center py-8 text-text-secondary text-sm">
                No pending approvals. The swarm is idle.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PendingApprovals;

import { useState, useEffect } from 'react';
import { Activity as ActivityIcon, Calendar, Mail, Share2, BarChart, DollarSign, Cpu, FileText, ArrowRight, RefreshCw, Loader2, Clock, Zap } from 'lucide-react';
import { getActivity, getAgentStatus } from '../../services/api';

/** Capitalize helper — "chronos" → "Chronos" */
const cap = (s) => s ? s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'System';

const agentIcons = {
  Chronos: Calendar, Hermes: Mail, Apollo: Share2, Athena: BarChart,
  'Nexus Core': Cpu, Fortuna: DollarSign, System: FileText, system: FileText, organizer: FileText,
};

const agentTheme = {
  Chronos:      { bg: 'bg-agents-chronos', text: 'text-agents-chronos', border: 'border-agents-chronos/30', dot: 'bg-agents-chronos' },
  Hermes:       { bg: 'bg-agents-hermes',  text: 'text-agents-hermes',  border: 'border-agents-hermes/30',  dot: 'bg-agents-hermes' },
  Apollo:       { bg: 'bg-agents-apollo',  text: 'text-agents-apollo',  border: 'border-agents-apollo/30',  dot: 'bg-agents-apollo' },
  Athena:       { bg: 'bg-agents-athena',  text: 'text-agents-athena',  border: 'border-agents-athena/30',  dot: 'bg-agents-athena' },
  'Nexus Core': { bg: 'bg-primary',        text: 'text-primary',        border: 'border-primary/30',        dot: 'bg-primary' },
  Fortuna:      { bg: 'bg-warning',        text: 'text-warning',        border: 'border-warning/30',        dot: 'bg-warning' },
  System:       { bg: 'bg-gray-600',       text: 'text-gray-400',       border: 'border-gray-700',          dot: 'bg-gray-500' },
};

const statusStyles = {
  working: { label: 'Working', color: 'text-warning', dot: 'bg-warning animate-pulse', badge: 'bg-warning/10 border-warning/20 text-warning' },
  done:    { label: 'Done',    color: 'text-success', dot: 'bg-success',               badge: 'bg-success/10 border-success/20 text-success' },
  idle:    { label: 'Idle',    color: 'text-gray-500',dot: 'bg-gray-600',              badge: 'bg-gray-800 border-gray-700 text-gray-500' },
  error:   { label: 'Error',   color: 'text-error',   dot: 'bg-error animate-pulse',   badge: 'bg-error/10 border-error/20 text-error' },
};

const AgentActivity = () => {
  const [activities, setActivities] = useState([]);
  const [agents, setAgents] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [actRes, statusRes] = await Promise.all([getActivity(), getAgentStatus()]);
      setActivities(actRes?.activities || []);
      setAgents(statusRes?.agents || {});
    } catch { }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchData(); }, []);

  const formatTime = (ts) => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch { return ts; }
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch { return ''; }
  };

  const agentList = [
    { key: 'chronos',  name: 'Chronos',  role: 'Scheduler' },
    { key: 'hermes',   name: 'Hermes',   role: 'Mail Agent' },
    { key: 'apollo',   name: 'Apollo',   role: 'Content Creator' },
    { key: 'athena',   name: 'Athena',   role: 'Analytics Engine' },
    { key: 'fortuna',  name: 'Fortuna',  role: 'Finance Advisor' },
  ];

  return (
    <div className="space-y-6 h-full pb-8">
      {/* Page Header */}
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
              <ActivityIcon size={22} className="text-primary" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-white drop-shadow-sm">Agent Activity</h2>
              <p className="text-text-secondary text-sm">Full transparency into swarm reasoning and state transitions.</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-card border border-gray-700 text-white hover:bg-gray-800 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── LEFT: Agent Status Panel ─── */}
        <div className="lg:col-span-1 border border-gray-800 bg-card rounded-xl shadow-sm flex flex-col h-[calc(100vh-220px)]">
          <div className="p-4 border-b border-gray-800 bg-gray-900/40 rounded-t-xl">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Zap size={16} className="text-primary" />
              Swarm Status
            </h3>
          </div>

          <div className="p-4 flex-1 overflow-y-auto space-y-3">
            {agentList.map(({ key, name, role }) => {
              const status = agents[key] || {};
              const st = statusStyles[status.status] || statusStyles.idle;
              const theme = agentTheme[name] || agentTheme.System;
              const Icon = agentIcons[name] || FileText;

              return (
                <div key={key} className={`bg-black/30 border ${theme.border} rounded-lg p-4 transition-all hover:border-white/15`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-9 h-9 rounded-full ${theme.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon size={16} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-bold ${theme.text}`}>{name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${st.badge}`}>
                          {st.label}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-500">{role}</span>
                    </div>
                  </div>

                  {/* Last task */}
                  {status.last_task && (
                    <div className="bg-black/40 rounded px-3 py-2 mt-2 border border-white/5">
                      <span className="text-[10px] text-gray-500 uppercase font-bold block mb-0.5">Last Task</span>
                      <p className="text-xs text-gray-300 truncate">{status.last_task}</p>
                    </div>
                  )}

                  {/* Last active */}
                  {status.last_active && (
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-600">
                      <Clock size={10} />
                      {formatTime(status.last_active)} · {formatDate(status.last_active)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── RIGHT: Activity Timeline ─── */}
        <div className="lg:col-span-2 border border-gray-800 bg-card rounded-xl shadow-sm flex flex-col h-[calc(100vh-220px)] relative">
          <div className="p-4 border-b border-gray-800 bg-gray-900/40 sticky top-0 z-10 rounded-t-xl flex justify-between items-center">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <ActivityIcon size={16} className="text-primary" />
              Activity Timeline
              <span className="text-xs text-gray-500 font-normal">({activities.length} entries)</span>
            </h3>
          </div>

          <div className="p-6 flex-1 overflow-y-auto relative">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-gray-500">
                <Loader2 size={24} className="animate-spin mr-3" /> Loading activity log...
              </div>
            ) : activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                  <ActivityIcon size={28} className="text-gray-600" />
                </div>
                <h4 className="text-white font-semibold mb-1">No activity recorded yet</h4>
                <p className="text-sm text-gray-500 max-w-xs">
                  When agents process requests, their actions will appear here in real time. Try creating an event or running a schedule optimization.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Timeline line */}
                <div className="absolute left-[39px] top-6 bottom-6 w-[2px] bg-gray-800 z-0" />

                {activities.map((item, idx) => {
                  const name = cap(item.agent);
                  const theme = agentTheme[name] || agentTheme.System;
                  const Icon = agentIcons[name] || agentIcons[item.agent] || FileText;
                  const time = formatTime(item.timestamp);
                  const detail = item.details || '';
                  const action = item.action?.replace(/_/g, ' ') || '';

                  return (
                    <div key={item.id || idx} className="relative z-10 pl-16">
                      {/* Timeline dot */}
                      <div className={`absolute left-0 w-10 h-10 rounded-full border-4 border-card ${theme.bg} flex items-center justify-center shadow-lg`}>
                        <Icon size={16} className="text-white" />
                      </div>

                      {/* Card */}
                      <div className={`bg-black/30 border ${theme.border} rounded-lg p-4 w-full hover:border-white/15 transition-colors`}>
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${theme.text}`}>{name}</span>
                            {action && (
                              <span className={`text-[10px] px-2 py-0.5 rounded border ${theme.border} ${theme.text} font-mono`}>
                                {action}
                              </span>
                            )}
                          </div>
                          {time && <span className="text-[10px] text-gray-500 font-mono">{time}</span>}
                        </div>

                        {detail && (
                          <p className="text-sm text-gray-300 leading-relaxed">{detail}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentActivity;

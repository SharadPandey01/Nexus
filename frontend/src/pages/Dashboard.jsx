import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import EventOverview from '../components/dashboard/EventOverview';
import QuickInsights from '../components/dashboard/QuickInsights';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import PendingApprovals from '../components/dashboard/PendingApprovals';
import EventBriefModal from '../components/dashboard/EventBriefModal';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { FileDown, Calendar, Mail, Feather, BarChart3, DollarSign, ArrowUpRight, Cpu } from 'lucide-react';
import { getAgentStatus } from '../services/api';

const agents = [
  {
    name: 'Chronos',
    role: 'Schedule Architect',
    icon: Calendar,
    path: '/dashboard/schedule',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    border: 'border-blue-500/30',
    glow: 'shadow-blue-500/10',
    iconColor: 'text-blue-400',
    dotColor: 'bg-blue-400',
  },
  {
    name: 'Hermes',
    role: 'Mail & Outreach',
    icon: Mail,
    path: '/dashboard/mail',
    gradient: 'from-emerald-500/20 to-teal-500/20',
    border: 'border-emerald-500/30',
    glow: 'shadow-emerald-500/10',
    iconColor: 'text-emerald-400',
    dotColor: 'bg-emerald-400',
  },
  {
    name: 'Apollo',
    role: 'Content Studio',
    icon: Feather,
    path: '/dashboard/content',
    gradient: 'from-orange-500/20 to-amber-500/20',
    border: 'border-orange-500/30',
    glow: 'shadow-orange-500/10',
    iconColor: 'text-orange-400',
    dotColor: 'bg-orange-400',
  },
  {
    name: 'Athena',
    role: 'Analytics Console',
    icon: BarChart3,
    path: '/dashboard/athena',
    gradient: 'from-purple-500/20 to-violet-500/20',
    border: 'border-purple-500/30',
    glow: 'shadow-purple-500/10',
    iconColor: 'text-purple-400',
    dotColor: 'bg-purple-400',
  },
  {
    name: 'Fortuna',
    role: 'Finance & Budget',
    icon: DollarSign,
    path: '/dashboard/finance',
    gradient: 'from-amber-500/20 to-yellow-500/20',
    border: 'border-amber-500/30',
    glow: 'shadow-amber-500/10',
    iconColor: 'text-amber-400',
    dotColor: 'bg-amber-400',
  },
];

const Dashboard = () => {
  const [briefOpen, setBriefOpen] = useState(false);
  const [agentStatuses, setAgentStatuses] = useState({});

  useEffect(() => {
    // Poll agent status every 3 seconds
    const fetchStatus = () => {
      getAgentStatus()
        .then(res => {
          if (res && typeof res === 'object' && res.agents) {
            setAgentStatuses(res.agents);
          }
        })
        .catch(console.error);
    };
    
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 h-full pb-8">
      {/* ── Header ── */}
      <div className="flex justify-between items-end animate-fade-up">
        <h2 className="text-3xl font-bold tracking-tight text-white drop-shadow-sm">Dashboard Overview</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setBriefOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-white hover:bg-primary/20 transition-colors text-sm font-semibold shadow-lg shadow-primary/10"
          >
            <FileDown size={16} />
            Export Brief
          </button>
          <div className="text-sm text-text-secondary glass-card border-white/10 px-3 py-1.5 rounded-md flex items-center gap-2 shadow-inner shadow-black/20">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span>Live Mode: <span className="text-success font-medium">Connected</span></span>
          </div>
        </div>
      </div>

      {/* ── Event Overview ── */}
      <div className="animate-fade-up" style={{ animationDelay: '80ms' }}>
        <ErrorBoundary fallbackMessage="Failed to load event overview.">
          <EventOverview />
        </ErrorBoundary>
      </div>

      {/* ── Agent Quick Access ── */}
      <div className="animate-fade-up" style={{ animationDelay: '140ms' }}>
        <div className="flex items-center gap-2 mb-3">
          <Cpu size={16} className="text-primary" />
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">AI Swarm</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {agents.map((agent, i) => {
            const Icon = agent.icon;
            
            // Map the agent name to the key returned by the API (usually lowercase)
            const agentKey = agent.name.toLowerCase();
            const data = (agentStatuses && agentStatuses[agentKey]) || { status: 'idle' };
            const isWorking = data.status === 'working';
            
            // Dynamic status ring
            const statusColor = isWorking ? 'bg-error' : agent.dotColor;
            const statusText = isWorking ? 'Working' : 'Idle';
            const statusPulse = isWorking ? 'animate-pulse' : '';
            
            return (
              <Link
                key={agent.name}
                to={agent.path}
                className={`group relative bg-gradient-to-br ${agent.gradient} border ${isWorking ? 'border-error/40' : agent.border} rounded-xl p-4 hover:scale-[1.03] transition-all duration-200 shadow-lg ${agent.glow} overflow-hidden`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {/* Subtle corner glow */}
                <div className={`absolute -top-6 -right-6 w-16 h-16 rounded-full blur-2xl transition-colors ${isWorking ? 'bg-error/20' : 'bg-white/5 group-hover:bg-white/10'}`} />

                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg bg-black/30 border border-white/5 ${agent.iconColor}`}>
                    <Icon size={18} />
                  </div>
                  <ArrowUpRight size={14} className="text-gray-600 group-hover:text-white transition-colors mt-1" />
                </div>
                <div className="relative">
                  <p className="text-sm font-bold text-white mb-0.5">{agent.name}</p>
                  <p className="text-[10px] text-gray-400 font-medium">{agent.role}</p>
                </div>
                {/* Status dot */}
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${statusColor} ${statusPulse}`} />
                  <span className="text-[9px] text-gray-500 font-medium">{statusText}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-up" style={{ animationDelay: '220ms' }}>
        <div className="lg:col-span-2 space-y-6">
          <ErrorBoundary fallbackMessage="Failed to load activity feed.">
            <ActivityFeed />
          </ErrorBoundary>
        </div>
        <div className="space-y-6">
          <ErrorBoundary fallbackMessage="Failed to load approvals hub.">
            <PendingApprovals />
          </ErrorBoundary>
          <ErrorBoundary fallbackMessage="Failed to load insights.">
            <QuickInsights />
          </ErrorBoundary>
        </div>
      </div>

      {/* Event Brief PDF Modal */}
      <EventBriefModal isOpen={briefOpen} onClose={() => setBriefOpen(false)} />
    </div>
  );
};

export default Dashboard;

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import EventOverview from '../components/dashboard/EventOverview';
import QuickInsights from '../components/dashboard/QuickInsights';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import PendingApprovals from '../components/dashboard/PendingApprovals';
import EventBriefModal from '../components/dashboard/EventBriefModal';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { FileDown, Calendar, Mail, Feather, BarChart3, DollarSign, Cpu } from 'lucide-react';
import { getAgentStatus } from '../services/api';

const agents = [
  {
    name: 'Chronos',
    role: 'Schedule Architect',
    icon: Calendar,
    path: '/dashboard/schedule',
    iconColor: 'text-blue-400',
    glow: 'group-hover:shadow-[0_0_40px_-10px_rgba(59,130,246,0.5)]',
    flare: 'from-blue-500/20',
  },
  {
    name: 'Hermes',
    role: 'Mail & Outreach',
    icon: Mail,
    path: '/dashboard/mail',
    iconColor: 'text-emerald-400',
    glow: 'group-hover:shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]',
    flare: 'from-emerald-500/20',
  },
  {
    name: 'Apollo',
    role: 'Content Studio',
    icon: Feather,
    path: '/dashboard/content',
    iconColor: 'text-purple-400',
    glow: 'group-hover:shadow-[0_0_40px_-10px_rgba(168,85,247,0.5)]',
    flare: 'from-purple-500/20',
  },
  {
    name: 'Athena',
    role: 'Analytics Console',
    icon: BarChart3,
    path: '/dashboard/athena',
    iconColor: 'text-amber-400',
    glow: 'group-hover:shadow-[0_0_40px_-10px_rgba(251,191,36,0.5)]',
    flare: 'from-amber-500/20',
  },
  {
    name: 'Fortuna',
    role: 'Finance & Budget',
    icon: DollarSign,
    path: '/dashboard/finance',
    iconColor: 'text-rose-400',
    glow: 'group-hover:shadow-[0_0_40px_-10px_rgba(244,63,94,0.5)]',
    flare: 'from-rose-500/20',
  },
];

const Dashboard = () => {
  const [briefOpen, setBriefOpen] = useState(false);
  const [agentStatuses, setAgentStatuses] = useState({});

  useEffect(() => {
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
          {agents.map((agent, i) => {
            const Icon = agent.icon;

            const agentKey = agent.name.toLowerCase();
            const data = (agentStatuses && agentStatuses[agentKey]) || { status: 'idle' };
            const isWorking = data.status === 'working';

            const statusLabel = isWorking ? 'Working…' : 'Idle';
            const statusClass = isWorking ? 'animate-pulse' : 'opacity-50';

            return (
              <Link
                key={agent.name}
                to={agent.path}
                className={`group relative p-8 rounded-2xl transition-all duration-500
                  hover:-translate-y-2 text-left
                  bg-gradient-to-br from-white/[0.05] to-transparent
                  backdrop-blur-2xl border border-white/[0.1]
                  hover:border-white/[0.2] ${agent.glow} overflow-hidden`}
                style={{ animationDelay: `${200 + i * 80}ms` }}
              >
                {/* Glow flare */}
                <div className={`absolute -inset-px bg-gradient-to-br ${agent.flare} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10`} />

                {/* Icon */}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6
                  bg-white/[0.05] border border-white/[0.1]
                  group-hover:scale-110 transition-transform duration-500"
                >
                  <Icon className={`w-6 h-6 ${agent.iconColor} filter drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]`} />
                </div>

                <h4 className="text-xl font-bold text-white mb-1">{agent.name}</h4>

                <div className={`text-[10px] font-black uppercase tracking-widest ${agent.iconColor} ${statusClass}`}>
                  {statusLabel}
                </div>

                {/* Decorative corner light */}
                <div className="absolute top-0 right-0 w-16 h-16 bg-white/[0.02] blur-xl pointer-events-none" />
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
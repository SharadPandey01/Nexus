import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Mail, FileText, Share2, BarChart, DollarSign, Cpu, ArrowRight, Loader2 } from 'lucide-react';
import { getActivity } from '../../services/api';
import { useWebSocket } from '../../hooks/useWebSocket';

/** Capitalize helper — "chronos" → "Chronos", "nexus core" → "Nexus Core" */
const cap = (s) => s ? s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'System';

const agentIcons = {
    Chronos: Calendar,
    Hermes: Mail,
    Apollo: Share2,
    Athena: BarChart,
    'Nexus Core': Cpu,
    Fortuna: DollarSign,
    System: FileText,
    system: FileText,
    organizer: FileText,
};

const agentTheme = {
    Chronos:     { border: 'border-agents-chronos', text: 'text-agents-chronos', bg: 'bg-agents-chronos', accent: 'border-l-agents-chronos' },
    Hermes:      { border: 'border-agents-hermes',  text: 'text-agents-hermes',  bg: 'bg-agents-hermes',  accent: 'border-l-agents-hermes' },
    Apollo:      { border: 'border-agents-apollo',  text: 'text-agents-apollo',  bg: 'bg-agents-apollo',  accent: 'border-l-agents-apollo' },
    Athena:      { border: 'border-agents-athena',  text: 'text-agents-athena',  bg: 'bg-agents-athena',  accent: 'border-l-agents-athena' },
    'Nexus Core':{ border: 'border-primary',        text: 'text-primary',        bg: 'bg-primary',        accent: 'border-l-primary' },
    Fortuna:     { border: 'border-warning',        text: 'text-warning',        bg: 'bg-warning',        accent: 'border-l-warning' },
    System:      { border: 'border-gray-500',       text: 'text-gray-400',       bg: 'bg-gray-500',       accent: 'border-l-gray-500' },
};

const ActivityFeed = () => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getActivity()
            .then(res => setActivities(res?.activities || []))
            .catch(() => setActivities([]))
            .finally(() => setLoading(false));
    }, []);

    // Live updates via WebSocket
    const { isConnected } = useWebSocket('/ws/stream', {
        onMessage: (msg) => {
            if (msg.type === 'agent_activity' || msg.type === 'activity') {
                const newItem = {
                    id: Date.now(),
                    timestamp: msg.timestamp || new Date().toISOString(),
                    agent: msg.data?.agent || 'system',
                    action: msg.data?.action || '',
                    details: msg.data?.details || msg.data?.text || '',
                    status: msg.data?.status || 'done',
                };
                setActivities(prev => [newItem, ...prev].slice(0, 50));
            }
        },
    });

    const formatTime = (ts) => {
        if (!ts) return '';
        try {
            const d = new Date(ts);
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch { return ts; }
    };

    return (
        <div className="glass-card shadow-sm h-full flex flex-col min-h-[400px]">
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex justify-between items-center rounded-t-xl bg-black/20">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    Live Activity Feed
                    <span className={`flex items-center text-xs px-2 py-0.5 rounded-full border ${isConnected ? 'text-success bg-success/10 border-success/20' : 'text-gray-400 bg-gray-800 border-gray-700'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isConnected ? 'bg-success animate-pulse' : 'bg-gray-500'}`} />
                        {isConnected ? 'Live' : '...'}
                    </span>
                </h3>
                <Link to="/dashboard/activity" className="text-xs text-primary hover:text-white transition-colors flex items-center gap-1 font-medium">
                    View All <ArrowRight size={12} />
                </Link>
            </div>

            <div className="p-5 flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-12 text-gray-500">
                        <Loader2 size={20} className="animate-spin mr-2" /> Loading feed...
                    </div>
                ) : activities.filter(a => a.agent?.toLowerCase() !== 'system').length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3">
                            <FileText size={20} className="text-gray-600" />
                        </div>
                        <p className="text-sm text-gray-500 mb-1">No AI swarm activity yet</p>
                        <p className="text-xs text-gray-600">Agent actions will appear here in real time.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {activities
                            .filter(a => a.agent?.toLowerCase() !== 'system')
                            .slice(0, 8)
                            .map((item) => {
                            const name = cap(item.agent);
                            const theme = agentTheme[name] || agentTheme.System;
                            const Icon = agentIcons[name] || agentIcons[item.agent] || FileText;
                            const text = item.details || item.action?.replace(/_/g, ' ') || '';
                            const time = formatTime(item.timestamp);

                            return (
                                <div key={item.id || item.timestamp} className={`flex gap-3 bg-black/30 border border-white/5 rounded-lg p-3 border-l-2 ${theme.accent} hover:border-white/10 transition-colors`}>
                                    <div className={`w-7 h-7 rounded-full bg-black border-2 ${theme.border} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                        <Icon size={12} className={theme.text} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className={`text-xs font-bold ${theme.text}`}>{name}</span>
                                            {item.action && (
                                                <span className="text-[10px] text-gray-500 font-mono">{item.action.replace(/_/g, ' ')}</span>
                                            )}
                                            {time && <span className="text-[10px] text-gray-600 ml-auto flex-shrink-0">{time}</span>}
                                        </div>
                                        <p className="text-xs text-gray-400 leading-relaxed truncate">{text}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityFeed;
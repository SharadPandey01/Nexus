import { useState, useEffect } from 'react';
import { Calendar, Mail, FileText, Share2, BarChart, DollarSign, Cpu } from 'lucide-react';
import { getActivity } from '../../services/api';
import { useWebSocket } from '../../hooks/useWebSocket';

const agentIcons = {
    Chronos: Calendar,
    Hermes: Mail,
    Apollo: Share2,
    Athena: BarChart,
    'Nexus Core': Cpu,
    Fortuna: DollarSign,
    System: FileText,
};

const agentColors = {
    Chronos: 'border-agents-chronos',
    Hermes: 'border-agents-hermes',
    Apollo: 'border-agents-apollo',
    Athena: 'border-agents-athena',
    'Nexus Core': 'border-primary',
    Fortuna: 'border-warning',
    System: 'border-gray-500',
};

const ActivityFeed = () => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch initial history
    useEffect(() => {
        getActivity()
            .then(setActivities)
            .catch(() => setActivities([]))
            .finally(() => setLoading(false));
    }, []);

    // Live updates via WebSocket
    const { isConnected } = useWebSocket('/ws/activity', {
        onMessage: (msg) => {
            if (msg.type === 'agent_activity' || msg.type === 'activity') {
                const newItem = {
                    id: Date.now(),
                    time: msg.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    agent: msg.data?.agent || 'System',
                    text: msg.data?.text || '',
                    status: msg.data?.status || 'done',
                    details: msg.data?.details || null,
                };
                setActivities(prev => [newItem, ...prev].slice(0, 50));
            }
        },
    });

    // Fallback data if API fails
    const items = activities.length > 0 ? activities : [
        { id: 1, time: '12:34 PM', agent: 'Chronos', text: 'Detected 2 schedule conflicts in Day 2. Resolving...', status: 'working' },
        { id: 2, time: '12:33 PM', agent: 'Hermes', text: 'Processed 347 participants from CSV. 12 invalid emails flagged.', status: 'done' },
        { id: 3, time: '12:31 PM', agent: 'Apollo', text: 'Generated 3 promotional post variants for LinkedIn.', status: 'done', details: 'Based on historical data, recommended posting at 2 PM.' },
        { id: 4, time: '12:20 PM', agent: 'System', text: 'Registration CSV uploaded by Organizer', status: 'done' },
    ];

    return (
        <div className="glass-card shadow-sm h-full flex flex-col min-h-[400px]">
            {/* Updated Header background to #404146 (matching the reference image's UI hierarchy) */}
            <div className="p-5 border-b border-white/10 flex justify-between items-center rounded-t-xl bg-black/20">
                <h3 className="font-semibold text-white">Live Activity Feed</h3>
                <span className={`flex items-center text-xs px-2 py-1 rounded border ${isConnected ? 'text-success bg-success/10 border-success/20' : 'text-gray-400 bg-gray-800 border-gray-700'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isConnected ? 'bg-success animate-ping' : 'bg-gray-500'}`}></span>
                    {isConnected ? 'Streaming' : 'Connecting...'}
                </span>
            </div>

            <div className="p-5 flex-1 overflow-y-auto">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex gap-4">
                                <div className="w-8 h-8 rounded-full skeleton" />
                                <div className="flex-1 space-y-2"><div className="h-4 skeleton w-3/4" /><div className="h-3 skeleton w-1/2" /></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-6 relative">
                        <div className="absolute left-[15px] top-6 bottom-6 w-[2px] bg-gray-800" />
                        {items.map((item) => {
                            const Icon = agentIcons[item.agent] || FileText;
                            const color = agentColors[item.agent] || 'border-gray-500';
                            return (
                                <div key={item.id} className="relative flex gap-4">
                                    <div className={`w-8 h-8 rounded-full bg-black border-2 ${color} flex items-center justify-center z-10 flex-shrink-0 shadow-sm`}>
                                        <Icon size={14} className={color.replace('border-', 'text-')} />
                                    </div>
                                    <div className="flex-1 mt-1">
                                        <div className="flex items-baseline gap-2 mb-1">
                                            <span className="text-xs text-gray-400 font-mono">{item.time}</span>
                                            <span className={`text-xs font-bold ${color.replace('border-', 'text-')}`}>{item.agent}</span>
                                            {item.status === 'working' && <span className="text-[10px] text-warning bg-warning/10 px-1.5 py-0.5 rounded border border-warning/20">Working</span>}
                                        </div>
                                        {/* Updated inner card background to #404146 */}
                                        <div className="bg-black/30 border border-white/10 rounded-lg p-3 text-sm text-gray-300">
                                            <p>{item.text}</p>
                                            {item.details && (
                                                <p className="mt-2 text-xs text-gray-500 border-t border-white/10 pt-2">{item.details}</p>
                                            )}
                                        </div>
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
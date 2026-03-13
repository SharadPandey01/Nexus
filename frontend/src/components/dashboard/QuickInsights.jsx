import { useState, useEffect } from 'react';
import { Lightbulb, AlertTriangle, TrendingUp } from 'lucide-react';
import { getInsights } from '../../services/api';

const iconMap = {
    warning: AlertTriangle,
    info: TrendingUp,
    success: Lightbulb,
};
const colorMap = {
    warning: { color: 'text-warning', bg: 'bg-warning/10 border-warning/20' },
    info: { color: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
    success: { color: 'text-success', bg: 'bg-success/10 border-success/20' },
};

const QuickInsights = () => {
    const [insights, setInsights] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getInsights()
            .then(setInsights)
            .catch(() => setInsights([]))
            .finally(() => setLoading(false));
    }, []);

    // Fallback
    const items = insights.length > 0 ? insights : [
        { id: 1, type: 'warning', title: 'Capacity Warning', desc: 'Workshop C has 45 registrants but Room 2 only seats 40.', action: 'Suggest Swap' },
        { id: 2, type: 'info', title: 'Registration Velocity', desc: 'Velocity is 23% slower than last week. Target is 500.', action: 'Push Promo' },
        { id: 3, type: 'success', title: 'Audience Insight', desc: '42% of registrants are students. Highly engaged.', action: '' },
    ];

    return (
        <div className="glass-card shadow-sm h-full flex flex-col">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-black/20 rounded-t-xl">
                <h3 className="font-semibold text-white flex items-center">
                    <span className="text-agents-athena mr-2">📊</span> Athena Insights
                </h3>
            </div>

            <div className="p-5 flex-1 space-y-4">
                {loading ? (
                    <div className="space-y-3">
                        {[1,2,3].map(i => (
                            <div key={i} className="p-4 rounded-lg border border-white/5">
                                <div className="skeleton h-4 w-1/3 mb-2" />
                                <div className="skeleton h-3 w-2/3" />
                            </div>
                        ))}
                    </div>
                ) : (
                    items.map(item => {
                        const c = colorMap[item.type] || colorMap.info;
                        const Icon = iconMap[item.type] || TrendingUp;
                        return (
                            <div key={item.id} className={`p-4 rounded-lg border ${c.bg} flex gap-4 transition-all hover:-translate-y-0.5 bg-black/40`}>
                                <div className={`mt-0.5 ${c.color}`}>
                                    <Icon size={18} />
                                </div>
                                <div className="flex-1">
                                    <h4 className={`text-sm font-semibold mb-1 ${c.color}`}>{item.title}</h4>
                                    <p className="text-sm text-gray-300 mb-3">{item.desc}</p>
                                    {item.action && (
                                        <button className="text-xs font-medium bg-black/50 hover:bg-white/10 text-white px-3 py-1.5 rounded transition-colors border border-white/20">
                                            {item.action}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default QuickInsights;

import { useState, useEffect } from 'react';
import { Users, Calendar, MapPin, Loader2 } from 'lucide-react';
import { getDashboard } from '../../services/api';

const EventOverview = () => {
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getDashboard()
            .then(setEvent)
            .catch(() => setEvent(null))
            .finally(() => setLoading(false));
    }, []);

    const data = event || {
        name: loading ? 'Loading...' : 'No Active Event',
        venue: loading ? '...' : 'TBD',
        days: 0,
        attendees: 0,
        sessions: 0,
        speakers: 0,
        status: 'draft',
    };

    const stats = [
        { label: 'Days', value: data.days, sub: 'Total' },
        { label: 'Attendees', value: data.attendees, sub: 'Target' },
        { label: 'Sessions', value: data.sessions, sub: 'Scheduled' },
        { label: 'Speakers', value: data.speakers, sub: 'Confirmed' },
    ];

    return (
        <div className="glass-card p-6 shadow-sm">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-xl font-bold text-white mb-1">{data.name}</h3>
                    <p className="text-sm text-text-secondary flex items-center">
                        <MapPin size={14} className="mr-1" /> {data.venue}
                    </p>
                </div>
                <div className="flex items-center space-x-2 text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                    <Loader2 size={12} className="animate-spin mr-1" />
                    <span>{loading ? 'Loading...' : 'Event Active'}</span>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.map((s, i) => (
                    <div key={s.label} className="p-4 bg-black/40 rounded-lg border border-white/10 hover:border-white/20 transition-colors shadow-inner animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
                        <div className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">{s.label}</div>
                        <div className="text-2xl font-bold text-white flex items-end">
                            {loading ? <span className="skeleton w-12 h-8 inline-block" /> : s.value}
                            <span className="text-sm text-gray-500 font-normal ml-2">{s.sub}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EventOverview;

import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, Users, Settings2, AlertTriangle, Loader2 } from 'lucide-react';
import { getSessions, optimizeSchedule } from '../../services/api';

const colorByType = {
  keynote: 'bg-primary/20 border-primary/40 text-blue-100',
  workshop: 'bg-agents-apollo/20 border-agents-apollo/40 text-purple-100',
  panel: 'bg-agents-hermes/20 border-agents-hermes/40 text-green-100',
  break: 'bg-gray-800 border-gray-700 text-gray-300',
};
const conflictColor = 'bg-error/20 border-error/50 text-red-100 shadow-[0_0_15px_rgba(239,68,68,0.2)]';

const ScheduleView = () => {
  const [sessions, setSessions] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState(null);

  useEffect(() => {
    getSessions()
      .then(data => {
        setSessions(data);
        setConflicts(data.filter(s => s.has_conflict));
      })
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  const handleOptimize = async () => {
    setOptimizing(true);
    try {
      const result = await optimizeSchedule();
      setOptimizeResult(result);
      // Refresh sessions
      const updated = await getSessions();
      setSessions(updated);
      setConflicts(updated.filter(s => s.has_conflict));
    } catch (e) {
      console.error('Optimize failed:', e);
    }
    setOptimizing(false);
  };

  // Rooms for header
  const rooms = [...new Set(sessions.map(s => s.room))].filter(r => r && r !== 'Dining Pavilion').slice(0, 3);
  if (rooms.length === 0) rooms.push('Main Hall', 'Room A', 'Room B');

  return (
    <div className="space-y-6 h-full pb-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white drop-shadow-sm mb-2">Master Schedule</h2>
          <p className="text-text-secondary">Drag and drop sessions to reschedule. Chronos will automatically detect conflicts.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-card border border-gray-700 rounded-lg text-sm hover:bg-gray-800 transition-colors">
            <Settings2 size={16} /> Constraints
          </button>
          <button
            onClick={handleOptimize}
            disabled={optimizing}
            className="flex items-center gap-2 px-4 py-2 bg-agents-chronos/10 text-agents-chronos border border-agents-chronos/30 rounded-lg text-sm font-medium hover:bg-agents-chronos/20 transition-colors shadow-[0_0_10px_rgba(96,165,250,0.1)] disabled:opacity-50"
          >
            {optimizing ? <Loader2 size={16} className="animate-spin" /> : <CalendarIcon size={16} />}
            {optimizing ? 'Optimizing...' : 'Auto-Optimize'}
          </button>
        </div>
      </div>

      {/* Optimize Result Banner */}
      {optimizeResult && (
        <div className="bg-success/10 border border-success/50 rounded-lg p-4 flex items-start gap-4">
          <div className="bg-success/20 p-2 rounded-full text-success mt-0.5">✓</div>
          <div className="flex-1">
            <h4 className="text-success font-semibold text-sm mb-1">Optimization Complete</h4>
            <p className="text-sm text-green-200/80 mb-2">{optimizeResult.conflicts_resolved} conflicts resolved.</p>
            <ul className="space-y-1 text-xs text-gray-400">
              {optimizeResult.changes_made?.map((c, i) => <li key={i}>• {c}</li>)}
            </ul>
            <button onClick={() => setOptimizeResult(null)} className="mt-2 text-xs text-gray-500 hover:text-white">Dismiss</button>
          </div>
        </div>
      )}

      {/* Conflict Banner */}
      {conflicts.length > 0 && !optimizeResult && (
        <div className="bg-error/10 border border-error/50 rounded-lg p-4 flex items-start gap-4">
          <div className="bg-error/20 p-2 rounded-full text-error mt-0.5">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <h4 className="text-error font-semibold text-sm mb-1">Schedule Conflict Detected</h4>
            <p className="text-sm text-red-200/80 mb-3">
              {conflicts.length} session(s) have scheduling conflicts.
            </p>
            <div className="flex gap-3">
              <button onClick={handleOptimize} className="text-xs bg-error text-white px-3 py-1.5 rounded font-medium hover:bg-red-600 transition-colors">
                Chronos: Auto-Resolve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Grid */}
      <div className="bg-card border border-gray-800 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        <div className={`grid border-b border-gray-800 bg-gray-900/50 text-xs font-semibold text-gray-400 uppercase tracking-wider`} style={{ gridTemplateColumns: `100px repeat(${rooms.length}, 1fr)` }}>
          <div className="p-4 border-r border-gray-800 text-center">Time</div>
          {rooms.map(r => (
            <div key={r} className="p-4 border-r border-gray-800 last:border-r-0">{r}</div>
          ))}
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-4">
              {[1,2,3,4].map(i => <div key={i} className="animate-pulse h-20 bg-gray-800 rounded-lg" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map(session => (
                <div
                  key={session.id}
                  className={`rounded-md border p-3 flex flex-col cursor-grab hover:brightness-110 transition-all ${session.has_conflict ? conflictColor : (colorByType[session.type] || colorByType.workshop)}`}
                >
                  <div className="font-semibold text-sm leading-tight mb-1">{session.title}</div>
                  <div className="text-xs opacity-80 flex items-center gap-3 mb-1.5 flex-wrap">
                    <span className="flex items-center"><Clock size={10} className="mr-0.5"/> {session.time}</span>
                    <span className="flex items-center"><MapPin size={10} className="mr-0.5"/> {session.room}</span>
                    {session.has_conflict && <span className="text-error font-bold">⚠ CONFLICT</span>}
                  </div>
                  {session.speaker && (
                    <div className="text-xs font-medium flex items-center mt-auto">
                      <Users size={12} className="mr-1 opacity-70" /> {session.speaker}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleView;

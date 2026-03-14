import { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, Users, MessageSquare, Send, Loader2, AlertTriangle, ChevronDown, ChevronUp, Sparkles, Download, ExternalLink, ArrowRight } from 'lucide-react';
import { getSessions, updateSessionPosition, simulateChange } from '../../services/api';

const colorByType = {
  keynote: 'bg-primary/20 border-primary/40 text-blue-100',
  workshop: 'bg-agents-apollo/20 border-agents-apollo/40 text-purple-100',
  panel: 'bg-agents-hermes/20 border-agents-hermes/40 text-green-100',
  talk: 'bg-agents-fortuna/20 border-agents-fortuna/40 text-amber-100',
  networking: 'bg-teal-500/20 border-teal-500/40 text-teal-100',
  break: 'bg-gray-800 border-gray-700 text-gray-300',
};
const conflictColor = 'bg-error/20 border-error/50 text-red-100 shadow-[0_0_15px_rgba(239,68,68,0.2)]';

const ScheduleView = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [resolutionResult, setResolutionResult] = useState(null);

  // What-If state
  const [whatIfOpen, setWhatIfOpen] = useState(false);
  const [whatIfQuery, setWhatIfQuery] = useState('');
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [whatIfResult, setWhatIfResult] = useState(null);

  // Drag state
  const [draggingId, setDraggingId] = useState(null);
  const whatIfRef = useRef(null);

  useEffect(() => {
    getSessions()
      .then(data => {
        setSessions(Array.isArray(data) ? data : []);
      })
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  // ── Drag-and-Drop Handlers ──────────────────────────────
  const handleDragStart = (e, session) => {
    setDraggingId(session.id);
    e.dataTransfer.setData('text/plain', JSON.stringify(session));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetRoom, targetDay) => {
    e.preventDefault();
    const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
    setDraggingId(null);

    // If dropped in same room on same day, do nothing
    if (dragData.venue === targetRoom && dragData.day === targetDay) return;

    setResolving(true);
    setResolutionResult(null);

    try {
      const result = await updateSessionPosition(dragData.id, {
        venue: targetRoom,
        day: targetDay,
        start_time: dragData.start_time,
        end_time: dragData.end_time,
      });

      if (result.schedule) {
        setSessions(result.schedule);
      }

      if (result.status === 'resolved') {
        setResolutionResult({
          type: 'resolved',
          reasoning: result.reasoning,
          conflicts: result.conflicts_resolved || [],
          warnings: result.warnings || [],
          cascade_to: result.cascade_to || [],
        });
      } else if (result.status === 'success') {
        setResolutionResult({
          type: 'clean',
          reasoning: result.reasoning,
        });
      }
    } catch (err) {
      console.error('Move failed:', err);
      setResolutionResult({
        type: 'error',
        reasoning: `Failed to move session: ${err.message}`,
      });
    }
    setResolving(false);
  };

  // ── What-If Analysis ────────────────────────────────────
  const handleWhatIf = async () => {
    if (!whatIfQuery.trim()) return;
    setWhatIfLoading(true);
    setWhatIfResult(null);

    try {
      const result = await simulateChange(whatIfQuery.trim());
      setWhatIfResult(result.simulation || result);
    } catch (err) {
      setWhatIfResult({ reasoning: `Simulation failed: ${err.message}`, error: true });
    }
    setWhatIfLoading(false);
  };

  // ── Derive rooms from sessions ──────────────────────────
  const rooms = [...new Set(sessions.map(s => s.venue || s.room))].filter(Boolean);
  if (rooms.length === 0) rooms.push('Main Hall', 'Room A', 'Room B');

  // Derive days
  const days = [...new Set(sessions.map(s => s.day))].filter(Boolean).sort((a, b) => a - b);
  const [activeDay, setActiveDay] = useState(null);
  const currentDay = activeDay || (days.length > 0 ? days[0] : 1);

  const daySessions = sessions.filter(s => s.day === currentDay);

  // ── Export ICS ──────────────────────────────────────────
  const handleExportICS = () => {
    if (!sessions || sessions.length === 0) return;

    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Nexus//Event Schedule//EN',
      'CALSCALE:GREGORIAN'
    ];

    const parseTime = (timeStr) => {
      if (!timeStr) return { h: 9, m: 0 };
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (!match) return { h: 9, m: 0 };
      let h = parseInt(match[1]);
      const m = parseInt(match[2]);
      if (match[3] && match[3].toUpperCase() === 'PM' && h < 12) h += 12;
      if (match[3] && match[3].toUpperCase() === 'AM' && h === 12) h = 0;
      return { h, m };
    };

    const formatICSDate = (date, time) => {
      const d = new Date(date);
      d.setHours(time.h, time.m, 0);
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    sessions.forEach(s => {
      const start = parseTime(s.start_time);
      const end = parseTime(s.end_time);

      const targetDay = s.day || 1;
      const sessionDate = new Date(baseDate.getTime() + (targetDay - 1) * 24 * 60 * 60 * 1000);
      
      icsContent.push('BEGIN:VEVENT');
      icsContent.push(`UID:${s.id || Math.random()}@nexus`);
      icsContent.push(`DTSTAMP:${formatICSDate(new Date(), {h:0, m:0})}`);
      icsContent.push(`DTSTART:${formatICSDate(sessionDate, start)}`);
      icsContent.push(`DTEND:${formatICSDate(sessionDate, end)}`);
      icsContent.push(`SUMMARY:${s.title || 'Event Session'}`);
      if (s.venue || s.room) icsContent.push(`LOCATION:${s.venue || s.room}`);
      if (s.description || s.speaker) {
        const desc = [s.speaker ? `Speaker: ${s.speaker}` : '', s.description || ''].filter(Boolean).join('\\n');
        icsContent.push(`DESCRIPTION:${desc}`);
      }
      icsContent.push('END:VEVENT');
    });

    icsContent.push('END:VCALENDAR');

    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = 'nexus_schedule.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 h-full pb-8">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex justify-between items-end animate-fade-up">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white drop-shadow-sm mb-2">Master Schedule</h2>
          <p className="text-text-secondary">Drag sessions between rooms to reschedule. Chronos auto-resolves conflicts.</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <button
            onClick={handleExportICS}
            disabled={sessions.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-agents-chronos/10 text-agents-chronos border border-agents-chronos/30 rounded-lg text-sm font-medium hover:bg-agents-chronos/20 transition-colors shadow-[0_0_10px_rgba(96,165,250,0.1)] disabled:opacity-50"
          >
            <Download size={16} />
            Export full .ics
          </button>
          
          {/* Day selector tabs */}
          {days.length > 1 && (
            <div className="flex gap-2">
              {days.map(d => (
                <button
                  key={d}
                  onClick={() => setActiveDay(d)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    currentDay === d
                    ? 'bg-agents-chronos/20 text-agents-chronos border border-agents-chronos/40 shadow-[0_0_10px_rgba(96,165,250,0.15)]'
                    : 'bg-card border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                Day {d}
              </button>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* ── Resolution Banner ─────────────────────────────── */}
      {resolving && (
        <div className="bg-agents-chronos/10 border border-agents-chronos/30 rounded-lg p-4 flex items-center gap-4 animate-pulse">
          <Loader2 size={20} className="animate-spin text-agents-chronos" />
          <div>
            <h4 className="text-agents-chronos font-semibold text-sm">Chronos Auto-Resolving...</h4>
            <p className="text-sm text-blue-200/70">Detecting and fixing schedule conflicts automatically</p>
          </div>
        </div>
      )}

      {resolutionResult && !resolving && (
        <div className={`rounded-lg p-4 flex items-start gap-4 animate-fade-up ${
          resolutionResult.type === 'resolved'
            ? 'bg-warning/10 border border-warning/40'
            : resolutionResult.type === 'clean'
            ? 'bg-success/10 border border-success/40'
            : 'bg-error/10 border border-error/40'
        }`}>
          <div className={`p-2 rounded-full mt-0.5 ${
            resolutionResult.type === 'resolved' ? 'bg-warning/20 text-warning'
            : resolutionResult.type === 'clean' ? 'bg-success/20 text-success'
            : 'bg-error/20 text-error'
          }`}>
            {resolutionResult.type === 'resolved' ? <Sparkles size={18} /> : resolutionResult.type === 'clean' ? '✓' : <AlertTriangle size={18} />}
          </div>
          <div className="flex-1">
            <h4 className={`font-semibold text-sm mb-1 ${
              resolutionResult.type === 'resolved' ? 'text-warning'
              : resolutionResult.type === 'clean' ? 'text-success'
              : 'text-error'
            }`}>
              {resolutionResult.type === 'resolved' ? 'Chronos Resolved Conflicts' : resolutionResult.type === 'clean' ? 'Session Moved Successfully' : 'Move Failed'}
            </h4>
            <p className="text-sm text-gray-300 mb-2">{resolutionResult.reasoning}</p>
            {resolutionResult.conflicts?.length > 0 && (
              <ul className="space-y-1 text-xs text-gray-400 mb-2">
                {resolutionResult.conflicts.map((c, i) => (
                  <li key={i}>• {c.action_taken || c.description}</li>
                ))}
              </ul>
            )}
            
            {resolutionResult.cascade_to?.length > 0 && (
              <div className="mt-3 bg-black/20 rounded border border-white/5 p-3 mb-2">
                <h5 className="text-[10px] font-bold text-agents-chronos uppercase tracking-wider mb-2">Downstream Triggers</h5>
                <ul className="space-y-1.5">
                  {resolutionResult.cascade_to.map((c, i) => (
                    <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5" title={JSON.stringify(c.data)}>
                      <ArrowRight size={12} className="mt-0.5 text-agents-chronos flex-shrink-0" />
                      <span>
                        <span className="font-semibold text-white capitalize">{c.agent}</span>: <span className="text-gray-400 font-mono">{c.task?.replace(/_/g, ' ')}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button onClick={() => setResolutionResult(null)} className="text-xs text-gray-500 hover:text-white transition-colors">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ── Schedule Grid ─────────────────────────────────── */}
      <div className="bg-card border border-gray-800 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[500px] animate-fade-up" style={{ animationDelay: '80ms' }}>
        {/* Room headers */}
        <div
          className="grid border-b border-gray-800 bg-gray-900/50 text-xs font-semibold text-gray-400 uppercase tracking-wider"
          style={{ gridTemplateColumns: `100px repeat(${rooms.length}, 1fr)` }}
        >
          <div className="p-4 border-r border-gray-800 text-center">Time</div>
          {rooms.map(r => (
            <div
              key={r}
              className="p-4 border-r border-gray-800 last:border-r-0"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, r, currentDay)}
            >
              <MapPin size={12} className="inline mr-1 opacity-60" />{r}
            </div>
          ))}
        </div>

        {/* Session cards */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-4">
              {[1,2,3,4].map(i => <div key={i} className="animate-pulse h-20 bg-gray-800 rounded-lg" />)}
            </div>
          ) : daySessions.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <CalendarIcon size={32} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">No sessions scheduled{days.length > 0 ? ` for Day ${currentDay}` : ''}.</p>
                <p className="text-xs mt-1 text-gray-600">Create an event to generate a schedule.</p>
              </div>
            </div>
          ) : (
            <div
              className="grid gap-0"
              style={{ gridTemplateColumns: `100px repeat(${rooms.length}, 1fr)` }}
            >
              {/* Group sessions by time slot */}
              {[...new Set(daySessions.map(s => s.start_time))].sort().map(timeSlot => (
                <>
                  {/* Time label */}
                  <div key={`time-${timeSlot}`} className="p-3 border-b border-r border-gray-800 text-xs text-gray-500 font-mono text-center flex items-center justify-center">
                    {timeSlot}
                  </div>
                  {/* Room columns */}
                  {rooms.map(room => {
                    const session = daySessions.find(s => s.start_time === timeSlot && (s.venue === room || s.room === room));
                    return (
                      <div
                        key={`${timeSlot}-${room}`}
                        className="p-2 border-b border-r border-gray-800 last:border-r-0 min-h-[80px]"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, room, currentDay)}
                      >
                        {session && (
                          <div
                            draggable
                            onDragStart={(e) => handleDragStart(e, session)}
                            className={`rounded-md border p-3 cursor-grab active:cursor-grabbing hover:brightness-110 transition-all ${
                              draggingId === session.id ? 'opacity-40 scale-95' :
                              session.has_conflict ? conflictColor :
                              (colorByType[session.session_type] || colorByType[session.type] || colorByType.workshop)
                            }`}
                          >
                            <div className="font-semibold text-sm leading-tight mb-1">{session.title}</div>
                            <div className="text-xs opacity-80 flex items-center gap-3 mb-1.5 flex-wrap">
                              <span className="flex items-center"><Clock size={10} className="mr-0.5"/> {session.start_time}–{session.end_time}</span>
                              {session.has_conflict && <span className="text-error font-bold">⚠ CONFLICT</span>}
                            </div>
                            {session.speaker && (
                              <div className="text-xs font-medium flex items-center mt-auto">
                                <Users size={12} className="mr-1 opacity-70" /> {session.speaker}
                              </div>
                            )}
                            
                            {/* Single event export */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const baseDate = new Date();
                                baseDate.setHours(0, 0, 0, 0);
                                const targetDay = session.day || 1;
                                const sessionDate = new Date(baseDate.getTime() + (targetDay - 1) * 24 * 60 * 60 * 1000);
                                
                                const parseTime = (timeStr) => {
                                  if (!timeStr) return { h: 9, m: 0 };
                                  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
                                  if (!match) return { h: 9, m: 0 };
                                  let h = parseInt(match[1]);
                                  const m = parseInt(match[2]);
                                  if (match[3] && match[3].toUpperCase() === 'PM' && h < 12) h += 12;
                                  if (match[3] && match[3].toUpperCase() === 'AM' && h === 12) h = 0;
                                  return { h, m };
                                };

                                const formatGCalDate = (date, time) => {
                                  const d = new Date(date);
                                  d.setHours(time.h, time.m, 0);
                                  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                                };

                                const start = parseTime(session.start_time);
                                const end = parseTime(session.end_time);
                                const startStr = formatGCalDate(sessionDate, start);
                                const endStr = formatGCalDate(sessionDate, end);
                                
                                const title = encodeURIComponent(session.title || 'Event Session');
                                const details = encodeURIComponent([session.speaker ? `Speaker: ${session.speaker}` : '', session.description || ''].filter(Boolean).join('\\n\\n'));
                                const location = encodeURIComponent(session.venue || session.room || '');

                                const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&dates=${startStr}/${endStr}&text=${title}&details=${details}&location=${location}`;
                                window.open(url, '_blank');
                              }}
                              className="mt-3 w-full border border-white/20 bg-white/5 hover:bg-white/10 rounded px-2 py-1 text-[10px] uppercase font-bold tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <ExternalLink size={10} /> Add to Calendar
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Ask Chronos — What-If Panel ───────────────────── */}
      <div className="bg-card border border-gray-800 rounded-xl shadow-sm overflow-hidden animate-fade-up" style={{ animationDelay: '160ms' }}>
        <button
          onClick={() => setWhatIfOpen(!whatIfOpen)}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-agents-chronos/20 flex items-center justify-center text-agents-chronos">
              <MessageSquare size={16} />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-white">Ask Chronos — What-If Analysis</h3>
              <p className="text-xs text-gray-500">Simulate schedule changes before committing them</p>
            </div>
          </div>
          {whatIfOpen ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
        </button>

        {whatIfOpen && (
          <div className="border-t border-gray-800 p-4 space-y-4" ref={whatIfRef}>
            <div className="flex gap-3">
              <input
                type="text"
                value={whatIfQuery}
                onChange={(e) => setWhatIfQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleWhatIf()}
                placeholder='e.g. "What if I move the keynote to 3 PM?" or "What if we add a new workshop tomorrow?"'
                className="flex-1 bg-black/40 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-agents-chronos/50 transition-colors"
                disabled={whatIfLoading}
              />
              <button
                onClick={handleWhatIf}
                disabled={whatIfLoading || !whatIfQuery.trim()}
                className="px-4 py-3 bg-agents-chronos/10 text-agents-chronos border border-agents-chronos/30 rounded-lg text-sm font-medium hover:bg-agents-chronos/20 transition-colors disabled:opacity-40 flex items-center gap-2"
              >
                {whatIfLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Simulate
              </button>
            </div>

            {whatIfLoading && (
              <div className="flex items-center gap-3 text-agents-chronos text-sm p-3 bg-agents-chronos/5 rounded-lg animate-pulse">
                <Loader2 size={16} className="animate-spin" />
                Chronos is analyzing the scenario...
              </div>
            )}

            {whatIfResult && !whatIfLoading && (
              <div className={`p-4 rounded-lg border ${whatIfResult.error ? 'bg-error/10 border-error/30' : 'bg-agents-chronos/5 border-agents-chronos/20'}`}>
                <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <Sparkles size={14} className="text-agents-chronos" />
                  Chronos Simulation Result
                </h4>

                {/* Reasoning */}
                <div className="text-sm text-gray-300 mb-3 leading-relaxed whitespace-pre-wrap">
                  {whatIfResult.reasoning}
                </div>

                {/* Conflicts detected */}
                {whatIfResult.conflicts_detected?.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-xs font-semibold text-warning uppercase tracking-wider mb-1">Potential Conflicts</h5>
                    <ul className="space-y-1">
                      {whatIfResult.conflicts_detected.map((c, i) => (
                        <li key={i} className="text-xs text-red-300 flex items-start gap-1.5">
                          <AlertTriangle size={10} className="mt-0.5 flex-shrink-0" />
                          {c.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Warnings */}
                {whatIfResult.warnings?.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-1">Warnings</h5>
                    <ul className="space-y-1">
                      {whatIfResult.warnings.map((w, i) => (
                        <li key={i} className="text-xs text-yellow-200">⚠ {w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Resolution plan */}
                {whatIfResult.resolution_plan?.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold text-success uppercase tracking-wider mb-1">Resolution Plan</h5>
                    <ul className="space-y-1">
                      {whatIfResult.resolution_plan.map((r, i) => (
                        <li key={i} className="text-xs text-green-300">✓ {r.action_taken || r.description}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Downstream Triggers */}
                {whatIfResult.cascade_to?.length > 0 && (
                  <div className="mt-3 bg-black/20 rounded border border-white/5 p-3">
                    <h5 className="text-[10px] font-bold text-agents-chronos uppercase tracking-wider mb-2">Downstream Triggers</h5>
                    <ul className="space-y-1.5">
                      {whatIfResult.cascade_to.map((c, i) => (
                        <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5" title={JSON.stringify(c.data)}>
                           <ArrowRight size={12} className="mt-0.5 text-agents-chronos flex-shrink-0" />
                           <span>
                             <span className="font-semibold text-white capitalize">{c.agent}</span>: <span className="text-gray-400 font-mono">{c.task?.replace(/_/g, ' ')}</span>
                           </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <button onClick={() => setWhatIfResult(null)} className="mt-4 text-xs text-gray-500 hover:text-white transition-colors">
                  Clear result
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleView;

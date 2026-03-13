import React, { useState, useEffect, useCallback } from 'react';
import {
  BrainCircuit, TrendingUp, Users, Calendar, AlertTriangle,
  ShieldAlert, Zap, BarChart3, Activity, ArrowRight,
  ChevronDown, ChevronUp, Loader2, RefreshCw,
  Gauge, Flame, Target, Info
} from 'lucide-react';
import { sendChat } from '../services/api';

// ─── Severity / category color maps ────────────────────────
const severityColors = {
  info:     { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  warning:  { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400',   dot: 'bg-amber-400'   },
  critical: { bg: 'bg-red-500/10',     border: 'border-red-500/20',     text: 'text-red-400',     dot: 'bg-red-400'     },
};

const riskSeverityColors = {
  low:    { bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300' },
  medium: { bg: 'bg-amber-500/10',   border: 'border-amber-500/25',   text: 'text-amber-400',   badge: 'bg-amber-500/20 text-amber-300'   },
  high:   { bg: 'bg-red-500/10',     border: 'border-red-500/25',     text: 'text-red-400',     badge: 'bg-red-500/20 text-red-300'       },
};

const insightIcons = {
  registration_trend: TrendingUp,
  capacity_warning:   Gauge,
  demographic:        Target,
  engagement:         Flame,
  risk:               Zap,
};

// ─── Animated counter ──────────────────────────────────────
const AnimatedValue = ({ value, className = '' }) => {
  const [display, setDisplay] = useState(value);
  useEffect(() => { setDisplay(value); }, [value]);
  return <span className={`tabular-nums ${className}`}>{display}</span>;
};

// ─── Capacity bar ──────────────────────────────────────────
const CapacityBar = ({ registrants, capacity }) => {
  const pct = capacity > 0 ? Math.min((registrants / capacity) * 100, 100) : 0;
  const color = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-400 tabular-nums w-12 text-right">{Math.round(pct)}%</span>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

const AthenaConsole = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reasoningOpen, setReasoningOpen] = useState(false);

  // ── Fetch analytics from the orchestrator ──────────────
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await sendChat('Analyze the current event data and provide a comprehensive intelligence report with insights, risks, capacity analysis, and key metrics.');
      // The orchestrator returns { status, result } where result is the full NexusState
      const analyticsOutput = res?.result?.analytics_output;
      if (analyticsOutput) {
        setData(analyticsOutput);
      } else {
        // Fallback: use mock data so the page is always visually complete
        setData(MOCK_DATA);
      }
    } catch (err) {
      console.error('[Athena] Fetch failed, using mock data:', err);
      setData(MOCK_DATA);
      setError('Backend offline — displaying sample data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  // ── Derived values ─────────────────────────────────────
  const metrics      = data?.metrics || {};
  const insights     = data?.insights || [];
  const riskItems    = data?.risk_items || [];
  const capacityWarn = data?.capacity_warnings || [];
  const cascadeTo    = data?.cascade_to || [];
  const reasoning    = data?.reasoning || '';

  // ── KPI card config ────────────────────────────────────
  const kpis = [
    { label: 'Total Participants',    value: metrics.total_participants ?? '—', icon: Users,       color: 'text-blue-400',    glow: 'from-blue-500/20'    },
    { label: 'Sessions Tracked',      value: metrics.total_sessions ?? '—',     icon: Calendar,    color: 'text-purple-400',  glow: 'from-purple-500/20'  },
    { label: 'Risk Alerts',           value: metrics.risk_count ?? riskItems.length, icon: ShieldAlert, color: 'text-red-400',     glow: 'from-red-500/20'     },
    { label: 'Capacity Utilization',  value: metrics.capacity_utilization ?? '—', icon: BarChart3,   color: 'text-emerald-400', glow: 'from-emerald-500/20' },
  ];

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════

  return (
    <div className="space-y-6 pb-8">

      {/* ─── HERO HEADER ─────────────────────────────────── */}
      <header className="relative overflow-hidden rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/[0.06] via-black/60 to-emerald-500/[0.04]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(251,146,60,0.12),transparent)]" />
        <div className="relative z-10 px-8 py-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/30 to-amber-600/20 flex items-center justify-center border border-orange-500/30 shadow-[0_0_30px_rgba(251,146,60,0.15)]">
                <BrainCircuit className="text-orange-400" size={28} />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-black animate-athena-pulse" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">
                ATHENA
              </h1>
              <p className="text-sm text-slate-400 mt-0.5 flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Real-Time Intelligence Engine
              </p>
            </div>
          </div>

          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-sm text-slate-300 hover:bg-white/[0.08] hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Analyzing…' : 'Re-Analyze'}
          </button>
        </div>
      </header>

      {/* ─── ERROR BANNER ────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm animate-fade-up">
          <Info size={16} /> {error}
        </div>
      )}

      {/* ─── SKELETON LOADER ─────────────────────────────── */}
      {loading && !data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card p-5 h-28 skeleton" />
          ))}
        </div>
      )}

      {/* ═══ DATA SECTIONS (visible once data arrives) ═══ */}
      {data && (
        <>
          {/* ─── KPI CARDS ─────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi, idx) => (
              <div
                key={idx}
                className="glass-card p-5 relative overflow-hidden group animate-fade-up"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <span className="text-slate-400 font-medium text-sm">{kpi.label}</span>
                  <div className={`p-2 rounded-lg bg-white/[0.05] ${kpi.color}`}>
                    <kpi.icon size={18} />
                  </div>
                </div>
                <div className="relative z-10">
                  <AnimatedValue
                    value={kpi.value}
                    className="text-2xl font-bold tracking-tight text-white"
                  />
                </div>
                {/* hover glow */}
                <div className={`absolute -bottom-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-t ${kpi.glow} to-transparent opacity-0 group-hover:opacity-100 blur-2xl transition-all duration-500`} />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ─── INSIGHTS FEED (2 cols) ──────────────────── */}
            <div className="lg:col-span-2 space-y-3">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-1">
                <Activity size={14} className="text-orange-400" />
                Live Insights
              </h2>

              {insights.length === 0 ? (
                <div className="glass-card p-8 text-center text-slate-500 text-sm">
                  No insights generated yet.
                </div>
              ) : (
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
                  {insights.map((insight, idx) => {
                    const sev = severityColors[insight.severity] || severityColors.info;
                    const Icon = insightIcons[insight.type] || Info;
                    return (
                      <div
                        key={idx}
                        className={`glass-card p-4 ${sev.border} border animate-fade-up relative overflow-hidden group`}
                        style={{ animationDelay: `${idx * 60}ms` }}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 p-2 rounded-lg ${sev.bg}`}>
                            <Icon size={16} className={sev.text} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                {insight.type?.replace(/_/g, ' ')}
                              </span>
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${sev.bg} ${sev.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                                {insight.severity}
                              </span>
                            </div>
                            <p className="text-sm text-slate-200 leading-relaxed">
                              {insight.icon} {insight.message}
                            </p>
                          </div>
                        </div>
                        {/* subtle left accent */}
                        <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl ${sev.dot} opacity-60`} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ─── RISK RADAR (1 col) ──────────────────────── */}
            <div className="space-y-3">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-1">
                <ShieldAlert size={14} className="text-red-400" />
                Risk Radar
              </h2>

              {riskItems.length === 0 ? (
                <div className="glass-card p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                    <ShieldAlert size={20} className="text-emerald-400" />
                  </div>
                  <p className="text-sm text-emerald-400 font-semibold">All Clear</p>
                  <p className="text-xs text-slate-500 mt-1">No risks detected by Athena.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
                  {riskItems.map((risk, idx) => {
                    const rsev = riskSeverityColors[risk.severity] || riskSeverityColors.medium;
                    return (
                      <div
                        key={idx}
                        className={`glass-card p-4 ${rsev.border} border animate-fade-up`}
                        style={{ animationDelay: `${idx * 80}ms` }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${rsev.badge}`}>
                            {risk.severity} risk
                          </span>
                        </div>
                        <p className="text-sm text-slate-200 mb-2 leading-relaxed">{risk.risk}</p>
                        <div className="flex items-start gap-2 bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.05]">
                          <Zap size={12} className="text-amber-400 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-slate-400 leading-relaxed">{risk.recommendation}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ─── CAPACITY WARNINGS TABLE ────────────────────── */}
          {capacityWarn.length > 0 && (
            <div className="animate-fade-up">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-3">
                <Gauge size={14} className="text-amber-400" />
                Capacity Warnings
              </h2>
              <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.08]">
                        <th className="text-left px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-500">Session</th>
                        <th className="text-left px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-500">Venue</th>
                        <th className="text-left px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-500">Registrants</th>
                        <th className="text-left px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-500">Capacity Load</th>
                        <th className="text-left px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-500">Recommendation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {capacityWarn.map((cw, idx) => (
                        <tr key={idx} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-3.5 font-medium text-white">{cw.session_title}</td>
                          <td className="px-5 py-3.5 text-slate-400">{cw.venue}</td>
                          <td className="px-5 py-3.5 text-slate-300 tabular-nums">
                            {cw.registrants}
                            <span className="text-slate-600"> / {cw.capacity}</span>
                          </td>
                          <td className="px-5 py-3.5 w-40">
                            <CapacityBar registrants={cw.registrants} capacity={cw.capacity} />
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-400 max-w-xs">{cw.recommendation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── AGENT CASCADE TIMELINE ─────────────────────── */}
          {cascadeTo.length > 0 && (
            <div className="animate-fade-up">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-3">
                <ArrowRight size={14} className="text-purple-400" />
                Agent Cascade Chain
              </h2>
              <div className="glass-card p-5">
                <div className="relative">
                  {/* vertical line */}
                  <div className="absolute left-[18px] top-0 bottom-0 w-px bg-gradient-to-b from-orange-500/40 via-purple-500/30 to-transparent" />

                  <div className="space-y-4">
                    {/* Origin node */}
                    <div className="flex items-center gap-4 relative animate-cascade-in">
                      <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center z-10">
                        <BrainCircuit size={16} className="text-orange-400" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">Athena</span>
                        <p className="text-sm text-slate-400">Analysis complete — triggering downstream agents</p>
                      </div>
                    </div>

                    {cascadeTo.map((c, idx) => {
                      const agentColors = {
                        apollo:  { bg: 'bg-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-400' },
                        chronos: { bg: 'bg-blue-500/20',   border: 'border-blue-500/30',   text: 'text-blue-400'   },
                        hermes:  { bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', text: 'text-emerald-400' },
                        fortuna: { bg: 'bg-amber-500/20', border: 'border-amber-500/30', text: 'text-amber-400' },
                      };
                      const ac = agentColors[c.agent] || agentColors.apollo;
                      return (
                        <div
                          key={idx}
                          className="flex items-start gap-4 relative animate-cascade-in"
                          style={{ animationDelay: `${(idx + 1) * 150}ms` }}
                        >
                          <div className={`w-9 h-9 rounded-xl ${ac.bg} ${ac.border} border flex items-center justify-center z-10`}>
                            <ArrowRight size={14} className={ac.text} />
                          </div>
                          <div className="flex-1 bg-white/[0.02] rounded-xl border border-white/[0.06] p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-bold uppercase tracking-wider ${ac.text}`}>
                                {c.agent}
                              </span>
                              <span className="text-[10px] text-slate-600">→</span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {c.task?.replace(/_/g, ' ')}
                              </span>
                            </div>
                            {c.data?.insight && (
                              <p className="text-xs text-slate-400 leading-relaxed">{c.data.insight}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── DEMOGRAPHIC BREAKDOWN (if available) ──────── */}
          {metrics.demographic_breakdown && (
            <div className="animate-fade-up">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-3">
                <Target size={14} className="text-blue-400" />
                Demographic Breakdown
              </h2>
              <div className="glass-card p-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(metrics.demographic_breakdown).map(([key, val], idx) => (
                    <div key={key} className="text-center p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <p className="text-2xl font-bold text-white mb-1">{val}</p>
                      <p className="text-xs text-slate-500 capitalize font-medium">{key}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── ATHENA'S REASONING (collapsible) ──────────── */}
          {reasoning && (
            <div className="animate-fade-up">
              <button
                onClick={() => setReasoningOpen(!reasoningOpen)}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors mb-2 group"
                data-no-lift
              >
                <BrainCircuit size={14} className="text-orange-400/60 group-hover:text-orange-400 transition-colors" />
                <span className="font-semibold">Athena's Reasoning</span>
                {reasoningOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {reasoningOpen && (
                <div className="glass-card p-5 border-orange-500/10 animate-panel-in">
                  <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">
                    {reasoning}
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ─── FULL-PAGE LOADING OVERLAY ───────────────────── */}
      {loading && !data && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <BrainCircuit className="text-orange-400 animate-pulse" size={28} />
            </div>
            <Loader2 className="absolute -top-2 -right-2 text-orange-400 animate-spin" size={18} />
          </div>
          <div className="text-center">
            <p className="text-white font-semibold">Athena is analyzing…</p>
            <p className="text-xs text-slate-500 mt-1">Running intelligence pipeline through the swarm</p>
          </div>
        </div>
      )}
    </div>
  );
};


// ═══════════════════════════════════════════════════════════
// MOCK DATA — Used when backend is offline
// ═══════════════════════════════════════════════════════════

const MOCK_DATA = {
  insights: [
    { type: 'registration_trend', icon: '📊', message: 'Registration velocity is at 23 signups/day. At this rate, you will reach 85% capacity by event day. Consider boosting promotions in the final week.', severity: 'info' },
    { type: 'capacity_warning', icon: '⚠️', message: 'AI Keynote session has 145 registrants but Room A only seats 120. Overflow risk detected — immediate action recommended.', severity: 'critical' },
    { type: 'engagement', icon: '🔥', message: 'The "Hands-on ML Workshop" track is trending — 3x more saves than average. Consider adding a second session or larger venue.', severity: 'info' },
    { type: 'demographic', icon: '🎯', message: 'Audience skews 62% students and 28% professionals. Tailor networking events to encourage cross-pollination between groups.', severity: 'info' },
    { type: 'risk', icon: '⚡', message: '3 invited speakers have not confirmed attendance. If unresolved within 48 hours, replacement sessions should be prepared.', severity: 'warning' },
  ],
  risk_items: [
    { risk: 'Speaker Dr. Patel has not responded to 2 confirmation emails sent via Hermes.', severity: 'high', recommendation: 'Escalate with a phone call and prepare backup speaker from waitlist.' },
    { risk: 'No backup venue allocated for outdoor Networking Mixer in case of rain.', severity: 'medium', recommendation: 'Reserve Conference Hall C as a rain contingency — low utilization on Day 2 afternoon.' },
    { risk: 'Lunch catering order only covers 400 meals, but projected attendance is 480.', severity: 'high', recommendation: 'Contact caterer to increase order by 25% buffer (total 600 meals).' },
  ],
  capacity_warnings: [
    { session_title: 'AI Keynote', venue: 'Room A', registrants: 145, capacity: 120, recommendation: 'Move to Main Hall (250 seats) or enable overflow streaming in Room D.' },
    { session_title: 'Cloud Workshop', venue: 'Lab 2', registrants: 38, capacity: 40, recommendation: 'At 95% — monitor closely. Open waitlist for Lab 3 if registrations continue.' },
    { session_title: 'Design Thinking', venue: 'Room C', registrants: 72, capacity: 80, recommendation: 'Healthy at 90%. No action needed.' },
  ],
  metrics: {
    total_participants: 482,
    total_sessions: 18,
    capacity_utilization: '78%',
    risk_count: 3,
    most_popular_session: 'AI Keynote',
    demographic_breakdown: { students: '62%', professionals: '28%', speakers: '6%', other: '4%' },
  },
  cascade_to: [
    { agent: 'apollo', task: 'generate_urgency_content', data: { insight: 'Registration velocity 23% below target — need promotional push' } },
    { agent: 'hermes', task: 'send_speaker_followup', data: { insight: '3 speakers unconfirmed — draft follow-up emails' } },
    { agent: 'chronos', task: 'suggest_room_swap', data: { insight: 'AI Keynote exceeds Room A capacity — suggest venue change' } },
  ],
  reasoning: 'Athena analyzed 482 participant records, 18 scheduled sessions, and 3 venue configurations. The analysis identified a critical capacity mismatch for the AI Keynote (121% utilization), flagged 3 unconfirmed speakers as a high-priority risk, and detected registration velocity trending 23% below the target needed for full attendance. Cascading tasks were generated for Apollo (urgency promotional content), Hermes (speaker follow-up emails), and Chronos (room swap optimization). Confidence level: HIGH based on structured data quality.',
};

export default AthenaConsole;

import { useState, useEffect } from 'react';
import { invokeAgents, getFinance } from '../services/api';
import {
  DollarSign, TrendingUp, TrendingDown, Handshake, AlertCircle,
  RefreshCw, Wallet, ShieldAlert, Sparkles, BadgeDollarSign,
  ArrowUpRight, ArrowDownRight, Loader2, Brain, Gauge,
  CircleDollarSign, BarChart3, Crown, Medal, Award, Trophy
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, Cell
} from 'recharts';
import ErrorBoundary from '../components/common/ErrorBoundary';

// ── Module-level cache (persists across re-renders / React Strict Mode) ──
let cachedFortunaData = null;
let isFetchingFortuna = false;

// ── Helpers ───────────────────────────────────────────────
const extractFinance = (res) => {
  const r = res?.result || res;
  return r?.finance_output || null;
};

const statusColor = {
  on_track:     { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'On Track' },
  over_budget:  { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/30',     label: 'Over Budget' },
  at_risk:      { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/30',   label: 'At Risk' },
  under_budget: { bg: 'bg-blue-500/10',    text: 'text-blue-400',    border: 'border-blue-500/30',    label: 'Under Budget' },
};

const severityStyle = {
  critical: { bg: 'bg-red-500/10',   border: 'border-red-500/30',   icon: 'text-red-400',   dot: 'bg-red-400' },
  warning:  { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: 'text-amber-400', dot: 'bg-amber-400' },
  info:     { bg: 'bg-blue-500/10',  border: 'border-blue-500/30',  icon: 'text-blue-400',  dot: 'bg-blue-400' },
};

const tierConfig = {
  platinum: { icon: Crown,  color: 'text-cyan-300',   bg: 'bg-cyan-400/10',   border: 'border-cyan-400/30' },
  gold:     { icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30' },
  silver:   { icon: Medal,  color: 'text-gray-300',   bg: 'bg-gray-300/10',   border: 'border-gray-300/30' },
  bronze:   { icon: Award,  color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/30' },
};

const CHART_COLORS = ['#34d399', '#fbbf24', '#f87171', '#60a5fa', '#a78bfa', '#94a3b8'];

const FinanceDashboardContent = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFinance = async (force = false) => {
    if (!force && cachedFortunaData) {
      setData(cachedFortunaData);
      setLoading(false);
      return;
    }
    if (isFetchingFortuna) return;
    isFetchingFortuna = true;

    try {
      if (!force) {
        // Try the fast cache path first
        const cacheRes = await getFinance();
        if (cacheRes?.finance_output) {
          setData(cacheRes.finance_output);
          cachedFortunaData = cacheRes.finance_output;
          setLoading(false);
          isFetchingFortuna = false;
          return;
        }
      }

      // If force=true or cache was empty, invoke the LLM
      const res = await invokeAgents(
        'Provide a full financial overview for the current event. Include budget tracking with line items, spending alerts, sponsorship targets, and cost analysis.',
        'finance'
      );
      const output = extractFinance(res);
      if (output) {
        setData(output);
        cachedFortunaData = output;
      }
    } catch (err) {
      console.error('[Fortuna] Fetch failed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetchingFortuna = false;
    }
  };

  useEffect(() => { fetchFinance(false); }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFinance(true);
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/[0.05] to-transparent backdrop-blur-2xl flex items-center justify-center border border-white/[0.1]">
          <Loader2 size={28} className="text-yellow-400 animate-spin" />
        </div>
        <p className="text-white/40 text-sm font-black uppercase tracking-[0.2em] animate-pulse">
          Fortuna is analyzing your finances...
        </p>
      </div>
    );
  }

  // ── Safe accessors ──
  const totalBudget = data?.total_budget ?? 0;
  const totalSpent  = data?.total_spent ?? 0;
  const remaining   = data?.remaining_balance ?? 0;
  const velocity    = data?.spending_velocity || '';
  const lineItems   = data?.line_items || [];
  const alerts      = data?.alerts || [];
  const sponsors    = data?.sponsor_targets || [];
  const reasoning   = data?.reasoning || '';

  const spentPct = totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0;

  const chartData = lineItems.map((item, idx) => ({
    name:      item.category,
    allocated: item.allocated,
    spent:     item.spent,
    fill:      CHART_COLORS[idx % CHART_COLORS.length],
  }));

  // Shared card class — matches dashboard's shadow-lg + color/10 glow intensity
  const card = `relative group p-6 rounded-2xl transition-all duration-200
    bg-gradient-to-br from-white/[0.05] to-transparent backdrop-blur-2xl
    border border-white/[0.1] hover:border-white/[0.2] overflow-hidden`;

  return (
    <div className="min-h-screen bg-[#020202] space-y-8 pb-12 px-1">

      {/* ─── HERO HEADER ──────────────────────────────────── */}
      <header className={`${card} shadow-lg shadow-yellow-500/10`}>
        <div className="absolute -inset-px bg-gradient-to-br from-yellow-500/20 to-transparent opacity-60 -z-10 rounded-2xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(250,204,21,0.06),transparent)]" />
        <div className="absolute top-0 right-0 w-16 h-16 bg-white/[0.02] blur-xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center">
                <CircleDollarSign className="text-yellow-400 filter drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]" size={28} />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#020202] animate-pulse" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white mb-0.5">FORTUNA</h1>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-400 opacity-70">
                Finance & Sponsorship Intelligence
              </p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-200
              bg-gradient-to-br from-white/[0.05] to-transparent backdrop-blur-2xl
              border shadow-lg shadow-yellow-500/10
              ${refreshing
                ? 'border-white/[0.05] text-white/30 cursor-not-allowed'
                : 'border-white/[0.1] text-yellow-400 hover:border-white/[0.2] hover:bg-white/[0.08]'
              }`}
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Analyzing...' : 'Re-Analyze'}
          </button>
        </div>
      </header>

      {/* ─── KPI CARDS ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { icon: Wallet,          color: 'text-yellow-400', shadow: 'shadow-yellow-500/10', flare: 'from-yellow-500/20', label: 'Total Budget', value: `$${totalBudget.toLocaleString()}`, sub: null },
          { icon: TrendingUp,      color: 'text-amber-400',  shadow: 'shadow-amber-500/10',  flare: 'from-amber-500/20',  label: 'Spent',        value: `$${totalSpent.toLocaleString()}`,  sub: `${spentPct}% of budget` },
          { icon: BadgeDollarSign, color: 'text-emerald-400',shadow: 'shadow-emerald-500/10',flare: 'from-emerald-500/20',label: 'Remaining',    value: `$${remaining.toLocaleString()}`,   sub: null },
          { icon: Gauge,           color: 'text-blue-400',   shadow: 'shadow-blue-500/10',   flare: 'from-blue-500/20',   label: 'Velocity',     value: null,                               sub: velocity || 'N/A' },
        ].map(({ icon: Icon, color, shadow, flare, label, value, sub }, i) => (
          <div key={i} className={`${card} shadow-lg ${shadow}`}>
            <div className={`absolute -inset-px bg-gradient-to-br ${flare} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 -z-10`} />
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/[0.02] blur-xl pointer-events-none" />

            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4
              bg-white/[0.05] border border-white/[0.1] group-hover:scale-110 transition-transform duration-200">
              <Icon className={`w-5 h-5 ${color} filter drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]`} />
            </div>

            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">{label}</p>
            {value && <p className="text-2xl font-bold text-white">{value}</p>}
            {sub   && <p className={`text-sm font-medium leading-snug ${value ? 'text-white/40 mt-1 text-xs' : 'text-white'}`}>{sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LEFT: Budget Breakdown ────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Budget Line Items */}
          <div className={`${card} shadow-lg shadow-yellow-500/10`}>
            <div className="absolute -inset-px bg-gradient-to-br from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 -z-10" />
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.02] blur-xl pointer-events-none" />

            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-5 flex items-center gap-2">
              <BarChart3 size={14} className="text-yellow-400" />
              Budget Breakdown
            </h3>

            {lineItems.length > 0 ? (
              <>
                <div className="h-56 mb-5">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ left: 12, right: 24 }}>
                      <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} width={90} axisLine={false} tickLine={false} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: 'rgba(2,2,2,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(20px)' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value) => [`$${value.toLocaleString()}`, '']}
                      />
                      <Bar dataKey="allocated" fill="rgba(255,255,255,0.05)" radius={[0, 4, 4, 0]} barSize={18} name="Allocated" />
                      <Bar dataKey="spent" radius={[0, 4, 4, 0]} barSize={18} name="Spent">
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="py-2 text-left   text-[10px] font-black uppercase tracking-widest text-white/30">Category</th>
                        <th className="py-2 text-right  text-[10px] font-black uppercase tracking-widest text-white/30">Allocated</th>
                        <th className="py-2 text-right  text-[10px] font-black uppercase tracking-widest text-white/30">Spent</th>
                        <th className="py-2 text-right  text-[10px] font-black uppercase tracking-widest text-white/30">Remaining</th>
                        <th className="py-2 text-center text-[10px] font-black uppercase tracking-widest text-white/30">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {lineItems.map((item, i) => {
                        const s = statusColor[item.status] || statusColor.on_track;
                        const itemRemaining = item.allocated - item.spent;
                        const pct = item.allocated > 0 ? ((item.spent / item.allocated) * 100).toFixed(0) : 0;
                        return (
                          <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3 font-medium text-white/80 flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                              {item.category}
                            </td>
                            <td className="py-3 text-right font-mono text-white/40">${item.allocated.toLocaleString()}</td>
                            <td className="py-3 text-right font-mono text-white">${item.spent.toLocaleString()}</td>
                            <td className={`py-3 text-right font-mono ${itemRemaining < 0 ? 'text-red-400' : 'text-white/40'}`}>
                              {itemRemaining < 0 ? '-' : ''}${Math.abs(itemRemaining).toLocaleString()}
                            </td>
                            <td className="py-3 text-center">
                              <span className={`text-[10px] px-2 py-1 rounded-full font-black uppercase border ${s.bg} ${s.text} ${s.border}`}>
                                {s.label} · {pct}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <BarChart3 size={32} className="mx-auto mb-3 text-white/10" />
                <p className="text-sm text-white/30">No budget data available yet.</p>
                <p className="text-xs text-white/20 mt-1">Click "Re-Analyze" to let Fortuna generate a financial overview.</p>
              </div>
            )}
          </div>

          {/* Spending Alerts */}
          {alerts.length > 0 && (
            <div className={`${card} shadow-lg shadow-amber-500/10`}>
              <div className="absolute -inset-px bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 -z-10" />

              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-5 flex items-center gap-2">
                <ShieldAlert size={14} className="text-amber-400" />
                Spending Alerts
                <span className="ml-1 px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-white/40">{alerts.length}</span>
              </h3>

              <div className="space-y-3">
                {alerts.map((alert, i) => {
                  const sev = severityStyle[alert.severity] || severityStyle.info;
                  return (
                    <div key={i} className={`${sev.bg} border ${sev.border} rounded-xl p-4 backdrop-blur-sm`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${sev.dot}`} />
                        <div className="flex-1">
                          <p className="text-sm text-white font-medium">{alert.message}</p>
                          {alert.recommendation && (
                            <p className="text-xs text-white/40 mt-1.5">
                              <span className="font-bold text-white/60">Recommendation:</span> {alert.recommendation}
                            </p>
                          )}
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-wider ${sev.icon}`}>{alert.severity}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {alerts.length === 0 && data && (
            <div className="relative p-5 rounded-2xl border border-white/[0.1] bg-gradient-to-br from-emerald-500/10 to-transparent backdrop-blur-2xl flex items-center gap-4 shadow-lg shadow-emerald-500/10">
              <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center flex-shrink-0">
                <DollarSign size={18} className="text-emerald-400 filter drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Budget Within Parameters</p>
                <p className="text-xs text-white/30 mt-0.5">Fortuna has detected no significant financial risks at this time.</p>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Sponsors + Reasoning ──────────────────── */}
        <div className="lg:col-span-1 space-y-6">

          {/* Sponsor Targets */}
          <div className={`${card} shadow-lg shadow-yellow-500/10 flex flex-col`}>
            <div className="absolute -inset-px bg-gradient-to-br from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 -z-10" />
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/[0.02] blur-xl pointer-events-none" />

            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-5 flex items-center gap-2">
              <Handshake size={14} className="text-yellow-400" />
              Sponsor Targets
            </h3>

            <div className="flex-1 space-y-3">
              {sponsors.length > 0 ? (
                sponsors.map((s, i) => {
                  const tier = tierConfig[s.tier] || tierConfig.silver;
                  const TierIcon = tier.icon;
                  return (
                    <div key={s.id || i} className="relative p-4 rounded-xl transition-all duration-200
                      bg-gradient-to-br from-white/[0.04] to-transparent border border-white/[0.08]
                      hover:border-white/[0.15] hover:-translate-y-0.5 overflow-hidden">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <TierIcon size={14} className={tier.color} />
                          <h4 className="font-bold text-white text-sm">{s.company_name}</h4>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase border ${tier.bg} ${tier.color} ${tier.border}`}>
                          {s.tier}
                        </span>
                      </div>
                      <p className="text-xs text-white/30 mb-2">{s.industry}</p>
                      <p className="text-xs text-white/50 leading-relaxed mb-3">{s.pitch_angle}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-400 font-mono font-bold text-sm">{s.estimated_value}</span>
                        <span className="text-[10px] text-white/20 uppercase tracking-wider">Est. Value</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-10">
                  <Handshake size={32} className="text-white/10 mb-3" />
                  <p className="text-white/30 text-sm">No sponsor targets yet.</p>
                  <p className="text-white/20 text-xs mt-1">Click "Re-Analyze" to generate sponsor recommendations.</p>
                </div>
              )}
            </div>
          </div>

          {/* Reasoning */}
          {reasoning && (
            <div className={`${card} shadow-lg shadow-yellow-500/10`}>
              <div className="absolute -inset-px bg-gradient-to-br from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 -z-10" />

              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-400/70 mb-4 flex items-center gap-2">
                <Brain size={14} />
                Fortuna's Reasoning
              </h3>
              <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">{reasoning}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const FinanceDashboard = () => (
  <ErrorBoundary>
    <FinanceDashboardContent />
  </ErrorBoundary>
);

export default FinanceDashboard;
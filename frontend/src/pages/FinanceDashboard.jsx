import { useState, useEffect } from 'react';
import { invokeAgents } from '../services/api';
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
  on_track: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/30', label: 'On Track' },
  over_budget: { bg: 'bg-error/10', text: 'text-error', border: 'border-error/30', label: 'Over Budget' },
  at_risk: { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/30', label: 'At Risk' },
  under_budget: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/30', label: 'Under Budget' },
};

const severityStyle = {
  critical: { bg: 'bg-error/10', border: 'border-error/30', icon: 'text-error', dot: 'bg-error' },
  warning: { bg: 'bg-warning/10', border: 'border-warning/30', icon: 'text-warning', dot: 'bg-warning' },
  info: { bg: 'bg-primary/10', border: 'border-primary/30', icon: 'text-primary', dot: 'bg-primary' },
};

const tierConfig = {
  platinum: { icon: Crown, color: 'text-cyan-300', bg: 'bg-cyan-400/10', border: 'border-cyan-400/30' },
  gold: { icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30' },
  silver: { icon: Medal, color: 'text-gray-300', bg: 'bg-gray-300/10', border: 'border-gray-300/30' },
  bronze: { icon: Award, color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/30' },
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

  useEffect(() => { fetchFinance(); }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFinance(true);
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400/20 to-amber-600/20 flex items-center justify-center border border-yellow-400/30">
            <Loader2 size={28} className="text-yellow-400 animate-spin" />
          </div>
        </div>
        <p className="text-gray-400 text-sm font-medium animate-pulse">Fortuna is analyzing your finances...</p>
      </div>
    );
  }

  // ── Safe accessors ──
  const totalBudget = data?.total_budget ?? 0;
  const totalSpent = data?.total_spent ?? 0;
  const remaining = data?.remaining_balance ?? 0;
  const velocity = data?.spending_velocity || '';
  const lineItems = data?.line_items || [];
  const alerts = data?.alerts || [];
  const sponsors = data?.sponsor_targets || [];
  const reasoning = data?.reasoning || '';

  const spentPct = totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0;

  // Chart data from line items
  const chartData = lineItems.map((item, idx) => ({
    name: item.category,
    allocated: item.allocated,
    spent: item.spent,
    fill: CHART_COLORS[idx % CHART_COLORS.length],
  }));

  return (
    <div className="space-y-6 pb-8">
      {/* ─── HERO HEADER (FORTUNA) ────────────────────────── */}
      <header className="relative overflow-hidden rounded-2xl border border-yellow-400/20 bg-gradient-to-br from-yellow-400/[0.06] via-black/60 to-amber-600/[0.04]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(250,204,21,0.10),transparent)]" />
        <div className="relative z-10 px-8 py-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400/30 to-amber-600/20 flex items-center justify-center border border-yellow-400/30 shadow-[0_0_30px_rgba(250,204,21,0.15)]">
                <CircleDollarSign className="text-yellow-400" size={28} />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-black animate-pulse" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white mb-0.5">
                FORTUNA
              </h1>
              <p className="text-sm text-slate-400 flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                Finance & Sponsorship Intelligence
              </p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-[0_0_15px_rgba(250,204,21,0.15)] ${
              refreshing
                ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed border'
                : 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 hover:bg-yellow-400/20'
            }`}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Analyzing...' : 'Re-Analyze'}
          </button>
        </div>
      </header>

      {/* ─── KPI CARDS ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-5 border-l-4 border-yellow-400">
          <div className="flex items-center gap-2 text-text-secondary mb-2">
            <Wallet size={16} className="text-yellow-400" />
            <span className="text-xs font-semibold uppercase tracking-wider">Total Budget</span>
          </div>
          <div className="text-3xl font-bold text-white">${totalBudget.toLocaleString()}</div>
        </div>
        <div className="glass-card p-5 border-l-4 border-warning">
          <div className="flex items-center gap-2 text-text-secondary mb-2">
            <TrendingUp size={16} className="text-warning" />
            <span className="text-xs font-semibold uppercase tracking-wider">Spent</span>
          </div>
          <div className="text-3xl font-bold text-white">${totalSpent.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">{spentPct}% of budget</div>
        </div>
        <div className="glass-card p-5 border-l-4 border-success">
          <div className="flex items-center gap-2 text-text-secondary mb-2">
            <BadgeDollarSign size={16} className="text-success" />
            <span className="text-xs font-semibold uppercase tracking-wider">Remaining</span>
          </div>
          <div className="text-3xl font-bold text-white">${remaining.toLocaleString()}</div>
        </div>
        <div className="glass-card p-5 border-l-4 border-primary">
          <div className="flex items-center gap-2 text-text-secondary mb-2">
            <Gauge size={16} className="text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider">Velocity</span>
          </div>
          <div className="text-sm font-medium text-gray-300 leading-snug">{velocity || 'N/A'}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT: Budget Breakdown ────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Budget Line Items as Chart + Table */}
          <div className="glass-card p-5 border border-white/5">
            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
              <BarChart3 size={16} className="text-yellow-400" />
              Budget Breakdown
            </h3>
            {lineItems.length > 0 ? (
              <>
                <div className="h-56 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ left: 12, right: 24 }}>
                      <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" tick={{ fill: '#d1d5db', fontSize: 12 }} width={90} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value) => [`$${value.toLocaleString()}`, '']}
                      />
                      <Bar dataKey="allocated" fill="rgba(255,255,255,0.08)" radius={[0, 4, 4, 0]} barSize={18} name="Allocated" />
                      <Bar dataKey="spent" radius={[0, 4, 4, 0]} barSize={18} name="Spent">
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Line Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-gray-500 uppercase border-b border-gray-800">
                      <tr>
                        <th className="py-2 text-left">Category</th>
                        <th className="py-2 text-right">Allocated</th>
                        <th className="py-2 text-right">Spent</th>
                        <th className="py-2 text-right">Remaining</th>
                        <th className="py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                      {lineItems.map((item, i) => {
                        const s = statusColor[item.status] || statusColor.on_track;
                        const itemRemaining = item.allocated - item.spent;
                        const pct = item.allocated > 0 ? ((item.spent / item.allocated) * 100).toFixed(0) : 0;
                        return (
                          <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3 font-medium text-gray-200 flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                              {item.category}
                            </td>
                            <td className="py-3 text-right font-mono text-gray-400">${item.allocated.toLocaleString()}</td>
                            <td className="py-3 text-right font-mono text-white">${item.spent.toLocaleString()}</td>
                            <td className={`py-3 text-right font-mono ${itemRemaining < 0 ? 'text-error' : 'text-gray-400'}`}>
                              {itemRemaining < 0 ? '-' : ''}${Math.abs(itemRemaining).toLocaleString()}
                            </td>
                            <td className="py-3 text-center">
                              <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${s.bg} ${s.text} border ${s.border}`}>
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
              <div className="text-center py-12 text-gray-500">
                <BarChart3 size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No budget data available yet.</p>
                <p className="text-xs text-gray-600 mt-1">Click "Re-Analyze" to let Fortuna generate a financial overview.</p>
              </div>
            )}
          </div>

          {/* Spending Alerts */}
          {alerts.length > 0 && (
            <div className="glass-card p-5 border border-white/5">
              <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert size={16} className="text-warning" />
                Spending Alerts ({alerts.length})
              </h3>
              <div className="space-y-3">
                {alerts.map((alert, i) => {
                  const sev = severityStyle[alert.severity] || severityStyle.info;
                  return (
                    <div key={i} className={`${sev.bg} border ${sev.border} rounded-lg p-4`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${sev.dot}`} />
                        <div className="flex-1">
                          <p className="text-sm text-white font-medium">{alert.message}</p>
                          {alert.recommendation && (
                            <p className="text-xs text-gray-400 mt-1.5">
                              <span className="font-semibold text-gray-300">Recommendation:</span> {alert.recommendation}
                            </p>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold uppercase ${sev.icon}`}>{alert.severity}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {alerts.length === 0 && data && (
            <div className="p-4 border border-success/20 bg-success/5 rounded-xl flex items-center gap-3">
              <div className="bg-success/20 p-2 rounded-full text-success">
                <DollarSign size={16} />
              </div>
              <div>
                <p className="text-sm text-white font-medium">Budget Within Parameters</p>
                <p className="text-xs text-gray-500">Fortuna has detected no significant financial risks at this time.</p>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Sponsors + Reasoning ──────────────────── */}
        <div className="lg:col-span-1 space-y-6">
          {/* Sponsor Targets */}
          <div className="glass-card p-5 border border-white/5 flex flex-col">
            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
              <Handshake size={16} className="text-yellow-400" />
              Sponsor Targets
            </h3>
            <div className="flex-1 space-y-3">
              {sponsors.length > 0 ? (
                sponsors.map((s, i) => {
                  const tier = tierConfig[s.tier] || tierConfig.silver;
                  const TierIcon = tier.icon;
                  return (
                    <div key={s.id || i} className="bg-black/40 border border-white/5 rounded-lg p-4 hover:border-yellow-400/20 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <TierIcon size={14} className={tier.color} />
                          <h4 className="font-semibold text-white text-sm">{s.company_name}</h4>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold border ${tier.bg} ${tier.color} ${tier.border}`}>
                          {s.tier}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{s.industry}</p>
                      <p className="text-xs text-gray-400 leading-relaxed mb-3">{s.pitch_angle}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-success font-mono font-semibold text-sm">{s.estimated_value}</span>
                        <span className="text-[10px] text-gray-600 uppercase">Est. Value</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-10">
                  <Handshake size={32} className="text-gray-700 mb-3" />
                  <p className="text-gray-500 text-sm">No sponsor targets yet.</p>
                  <p className="text-gray-600 text-xs mt-1">Click "Re-Analyze" to generate sponsor recommendations.</p>
                </div>
              )}
            </div>
          </div>

          {/* Reasoning */}
          {reasoning && (
            <div className="glass-card p-5 border border-yellow-400/10">
              <h3 className="text-xs font-bold uppercase tracking-wider text-yellow-400 mb-3 flex items-center gap-2">
                <Brain size={14} />
                Fortuna's Reasoning
              </h3>
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{reasoning}</p>
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

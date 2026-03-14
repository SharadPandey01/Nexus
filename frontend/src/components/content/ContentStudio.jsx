import { useState, useEffect } from 'react';
import {
  Send, Sparkles, Wand2, CalendarSync, Loader2, Check,
  BarChart3, Clock, TrendingUp, RefreshCw, Lightbulb,
  Plus, ChevronDown, ChevronUp
} from 'lucide-react';
import { generateContent, getContentQueue, approveContent } from '../../services/api';

/* ── Platform visual config ────────────────────────────── */
const PLATFORMS = {
  linkedin: {
    label: 'LinkedIn',
    gradient: 'from-blue-600 to-blue-800',
    bg: 'bg-blue-900/30',
    border: 'border-blue-700/50',
    text: 'text-blue-300',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  },
  twitter: {
    label: 'Twitter / X',
    gradient: 'from-sky-500 to-sky-700',
    bg: 'bg-sky-900/30',
    border: 'border-sky-700/50',
    text: 'text-sky-300',
    badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  },
  instagram: {
    label: 'Instagram',
    gradient: 'from-pink-500 via-purple-500 to-orange-400',
    bg: 'bg-pink-900/30',
    border: 'border-pink-700/50',
    text: 'text-pink-300',
    badge: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
  },
};

const ContentStudio = () => {
  const [brief, setBrief] = useState('');
  const [platforms, setPlatforms] = useState(['linkedin', 'twitter', 'instagram']);
  const [tone, setTone] = useState('auto');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [queue, setQueue] = useState([]);
  const [approving, setApproving] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [expandedQueueItem, setExpandedQueueItem] = useState(null);

  // Load existing content queue
  useEffect(() => {
    getContentQueue('social_post')
      .then((data) => {
        const items = data?.content || data || [];
        setQueue(Array.isArray(items) ? items : []);
      })
      .catch(() => setQueue([]));
  }, []);

  const togglePlatform = (p) => {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  /* ── Generate via Apollo ─────────────────────────────── */
  const handleGenerate = async () => {
    if (!brief.trim() || generating) return;
    setGenerating(true);
    setResult(null);
    try {
      const res = await generateContent(brief, platforms, tone);
      setResult(res);
      // Append new variants to queue history
      if (res?.variants) {
        setQueue((prev) => [...res.variants, ...prev]);
      }
    } catch (e) {
      console.error('Generate failed:', e);
    }
    setGenerating(false);
  };

  /* ── New Campaign — reset form ───────────────────────── */
  const handleNewCampaign = () => {
    setBrief('');
    setResult(null);
    setPlatforms(['linkedin', 'twitter', 'instagram']);
    setTone('auto');
  };

  /* ── Approve a content piece ─────────────────────────── */
  const handleApprove = async (id) => {
    setApproving(id);
    try {
      await approveContent(id);
      // Update in result
      if (result?.variants) {
        setResult({
          ...result,
          variants: result.variants.map((v) =>
            v.id === id ? { ...v, status: 'approved' } : v
          ),
        });
      }
      // Update in queue
      setQueue((prev) =>
        prev.map((q) => (q.id === id ? { ...q, status: 'approved' } : q))
      );
    } catch (e) {
      console.error(e);
    }
    setApproving(null);
  };

  /* ── Derived data ────────────────────────────────────── */
  const variants = result?.variants || [];
  const timeline = result?.campaign_timeline || null;
  const insights = result?.engagement_insights || null;

  return (
    <div className="space-y-6 h-full pb-8">
      {/* ─── HERO HEADER (APOLLO) ────────────────────────── */}
      <header className="relative overflow-hidden rounded-2xl border border-agents-apollo/20 bg-gradient-to-br from-agents-apollo/[0.06] via-black/60 to-pink-500/[0.04]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(167,139,250,0.12),transparent)]" />
        <div className="relative z-10 px-8 py-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-agents-apollo/30 to-purple-600/20 flex items-center justify-center border border-agents-apollo/30 shadow-[0_0_30px_rgba(167,139,250,0.15)]">
                <Sparkles className="text-agents-apollo" size={28} />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-black animate-pulse" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white mb-0.5">
                APOLLO
              </h1>
              <p className="text-sm text-slate-400 flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-agents-apollo animate-pulse" />
                Content & Campaign Strategist
              </p>
            </div>
          </div>

          <button
            onClick={handleNewCampaign}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-agents-apollo/10 border border-agents-apollo/30 text-sm font-medium text-agents-apollo hover:bg-agents-apollo/20 transition-all shadow-[0_0_15px_rgba(167,139,250,0.15)]"
          >
            <Plus size={16} />
            New Campaign
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-up" style={{ animationDelay: '80ms' }}>
        {/* ── Left: Campaign Brief ────────────────────────── */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border border-gray-800 rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-white mb-4">Campaign Brief</h3>
            <textarea
              className="w-full h-32 bg-background border border-gray-700 rounded-lg p-3 text-sm text-text-primary focus:ring-1 focus:ring-agents-apollo focus:border-agents-apollo focus:outline-none resize-none mb-4"
              placeholder={`Describe what you want Apollo to promote — for example:\n\n"Promote the opening keynote by Dr. Sarah Chen on Autonomous AI. Target developers and product managers. Highlight the 5-year industry outlook and free networking dinner."\n\nInclude: topic, speaker, target audience, key highlights`}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
            />

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 font-semibold uppercase mb-2 block">
                  Platforms
                </label>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(PLATFORMS).map(([key, cfg]) => (
                    <span
                      key={key}
                      onClick={() => togglePlatform(key)}
                      className={`text-xs px-3 py-1.5 rounded-full border cursor-pointer transition-all flex items-center gap-1.5 ${
                        platforms.includes(key)
                          ? cfg.badge
                          : 'bg-gray-800 text-gray-500 border-gray-700 opacity-50'
                      }`}
                    >
                      {cfg.label}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-semibold uppercase mb-2 block">
                  Tone
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full bg-background border border-gray-700 rounded-lg p-2 text-sm text-text-primary focus:outline-none"
                >
                  <option value="auto">Auto (Let Apollo Decide)</option>
                  <option value="professional">Professional</option>
                  <option value="hype">Hype / Casual</option>
                  <option value="technical">Technical</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating || !brief.trim()}
              className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-2.5 bg-agents-apollo/20 text-agents-apollo border border-agents-apollo/50 rounded-lg text-sm font-semibold hover:bg-agents-apollo/30 transition-colors disabled:opacity-50"
            >
              {generating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              {generating ? 'Apollo is creating...' : 'Generate Assets'}
            </button>
          </div>

          {/* ── Engagement Insights (only after generation) ── */}
          {insights && (
            <div className="bg-card border border-gray-800 rounded-xl p-5 shadow-sm animate-fade-up">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-agents-apollo" />
                Engagement Insights
              </h3>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-background rounded-lg p-3 text-center border border-gray-800">
                  <div className="text-lg font-bold text-agents-apollo">
                    {insights.best_day}
                  </div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                    Best Day
                  </div>
                </div>
                <div className="bg-background rounded-lg p-3 text-center border border-gray-800">
                  <div className="text-lg font-bold text-agents-apollo">
                    {insights.best_time}
                  </div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                    Best Time
                  </div>
                </div>
                <div className="bg-background rounded-lg p-3 text-center border border-gray-800">
                  <div className="text-lg font-bold text-agents-apollo capitalize">
                    {insights.top_content_type}
                  </div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                    Top Format
                  </div>
                </div>
              </div>
              {insights.insights?.length > 0 && (
                <ul className="space-y-2">
                  {insights.insights.map((ins, i) => (
                    <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                      <Lightbulb size={12} className="text-agents-apollo mt-0.5 flex-shrink-0" />
                      {ins}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Output ───────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* ── Campaign Timeline ─────────────────────────── */}
          {timeline && (
            <div className="bg-card border border-gray-800 rounded-xl p-4 shadow-sm flex items-center overflow-x-auto gap-4 scrollbar-hide animate-fade-up">
              <div className="flex items-center text-agents-apollo shrink-0 mr-2 font-medium text-sm">
                <CalendarSync size={18} className="mr-2" /> Campaign Plan
              </div>
              <div className="flex gap-3 flex-1">
                {(timeline.phases || []).map((phase, i) => (
                  <div
                    key={i}
                    className="rounded-lg py-2 px-4 text-xs shrink-0 flex flex-col items-center min-w-[90px] border bg-agents-apollo/10 border-agents-apollo/30"
                  >
                    <span className="font-bold text-agents-apollo mb-0.5">
                      Phase {i + 1}
                    </span>
                    <span className="text-gray-400 text-[10px] uppercase">
                      {phase}
                    </span>
                  </div>
                ))}
              </div>
              <div className="shrink-0 text-right pl-4 border-l border-gray-800">
                <div className="text-sm font-bold text-white">
                  {timeline.total_posts} posts
                </div>
                <div className="text-[10px] text-gray-500">
                  over {timeline.duration_days} days
                </div>
              </div>
            </div>
          )}

          {/* ── Reasoning banner ──────────────────────────── */}
          {result?.reasoning && (
            <div className="bg-agents-apollo/5 border border-agents-apollo/20 rounded-lg p-4 text-sm text-gray-300 animate-fade-up">
              <div className="flex items-center gap-2 text-agents-apollo font-semibold text-xs uppercase tracking-wider mb-2">
                <Wand2 size={14} /> Apollo's Reasoning
              </div>
              <p className="leading-relaxed whitespace-pre-wrap">{result.reasoning}</p>
            </div>
          )}

          {/* ── Generated Post Cards ──────────────────────── */}
          <div className="bg-card border border-gray-800 rounded-xl shadow-sm min-h-[400px]">
            <div className="border-b border-gray-800 p-4 bg-gray-900/40 flex items-center justify-between">
              <h3 className="font-semibold text-white">Generated Content</h3>
              {variants.length > 0 && (
                <span className="text-xs text-gray-500">
                  {variants.length} piece{variants.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {generating ? (
                [1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="border border-gray-800 rounded-xl bg-background p-5 animate-pulse"
                  >
                    <div className="h-5 bg-gray-700 rounded w-24 mb-4" />
                    <div className="space-y-2 mb-4">
                      <div className="h-3 bg-gray-700 rounded" />
                      <div className="h-3 bg-gray-700 rounded w-3/4" />
                      <div className="h-3 bg-gray-700 rounded w-1/2" />
                    </div>
                    <div className="h-8 bg-gray-700 rounded" />
                  </div>
                ))
              ) : variants.length > 0 ? (
                variants.map((v, i) => {
                  const pcfg = PLATFORMS[v.platform] || { label: v.platform, gradient: 'from-gray-600 to-gray-800', badge: 'bg-gray-600/20 text-gray-300 border-gray-600/40' };
                  return (
                    <div
                      key={v.id || i}
                      className={`relative rounded-xl overflow-hidden border transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                        v.is_recommended
                          ? 'border-agents-apollo/50 shadow-[0_0_20px_rgba(167,139,250,0.1)]'
                          : 'border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      {/* Platform gradient header */}
                      <div
                        className={`bg-gradient-to-r ${pcfg.gradient} px-4 py-2.5 flex items-center justify-between`}
                      >
                        <span className="text-white font-semibold text-sm flex items-center gap-2">
                          {pcfg.label}
                        </span>
                        <div className="flex items-center gap-2">
                          {v.is_recommended && (
                            <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full font-bold backdrop-blur-sm">
                              ★ Recommended
                            </span>
                          )}
                          <span className="text-white/60 text-[10px] uppercase">
                            {v.tone}
                          </span>
                        </div>
                      </div>

                      {/* Post content */}
                      <div className="bg-background p-5">
                        <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap mb-4">
                          {v.text}
                        </p>

                        {/* Image Prompt indicator */}
                        {v.image_prompt && (
                          <div className="bg-gray-900 border border-gray-800 rounded-md p-3 mb-4 flex items-start gap-2 text-xs text-gray-400">
                            <Sparkles size={14} className="text-agents-apollo mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="font-semibold text-agents-apollo block mb-0.5">Suggested Image</span>
                              {v.image_prompt}
                            </div>
                          </div>
                        )}

                        {/* Hashtags */}
                        {v.hashtags?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {v.hashtags.map((tag, t) => (
                              <span
                                key={t}
                                className={`text-[10px] px-2 py-0.5 rounded-full ${pcfg.badge}`}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Suggested time */}
                        {v.suggested_time && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-4">
                            <Clock size={12} />
                            Post at: {v.suggested_time}
                          </div>
                        )}

                        {/* Approve button */}
                        <button
                          onClick={() => handleApprove(v.id)}
                          disabled={approving === v.id || v.status === 'approved'}
                          className={`w-full py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                            v.status === 'approved'
                              ? 'bg-success/15 text-success border border-success/30'
                              : v.is_recommended
                              ? 'bg-agents-apollo/15 hover:bg-agents-apollo/25 text-agents-apollo border border-agents-apollo/40'
                              : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
                          }`}
                        >
                          {v.status === 'approved' ? (
                            <>
                              <Check size={14} /> Approved
                            </>
                          ) : approving === v.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <>
                              <Check size={14} /> Approve & Queue
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-2 text-center py-16 text-gray-500">
                  <Sparkles size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">
                    Enter a campaign brief and click "Generate Assets" to see
                    Apollo's creative output.
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Apollo creates platform-specific posts with optimal posting times.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Content History ────────────────────────────── */}
          {queue.length > 0 && (
            <div className="bg-card border border-gray-800 rounded-xl shadow-sm overflow-hidden animate-fade-up">
              <button
                onClick={() => setHistoryOpen(!historyOpen)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-agents-apollo/20 flex items-center justify-center text-agents-apollo">
                    <BarChart3 size={16} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-semibold text-white">
                      Content Queue ({queue.length} items)
                    </h3>
                    <p className="text-xs text-gray-500">
                      All previously generated content pieces
                    </p>
                  </div>
                </div>
                {historyOpen ? (
                  <ChevronUp size={16} className="text-gray-500" />
                ) : (
                  <ChevronDown size={16} className="text-gray-500" />
                )}
              </button>

              {historyOpen && (
                <div className="border-t border-gray-800 divide-y divide-gray-800 max-h-[400px] overflow-y-auto">
                  {queue.map((item, i) => {
                    const pcfg = PLATFORMS[item.platform] || { label: item.platform, badge: 'bg-gray-600/20 text-gray-300 border-gray-600/40' };
                    const isExpanded = expandedQueueItem === (item.id || i);
                    return (
                      <div
                        key={item.id || i}
                        className="p-4 hover:bg-gray-800/30 transition-colors cursor-pointer"
                        onClick={() => setExpandedQueueItem(isExpanded ? null : (item.id || i))}
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${pcfg.badge}`}>
                                {pcfg.label}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                  item.status === 'approved' || item.status === 'published'
                                    ? 'bg-success/15 text-success border-success/30'
                                    : item.status === 'rejected'
                                    ? 'bg-error/15 text-error border-error/30'
                                    : 'bg-gray-800 text-gray-400 border-gray-700'
                                }`}
                              >
                                {item.status || 'draft'}
                              </span>
                            </div>
                            {isExpanded ? (
                              <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap mt-2">
                                {item.text || item.body || item.title}
                              </p>
                            ) : (
                              <p className="text-xs text-gray-400 truncate">
                                {item.text || item.body || item.title}
                              </p>
                            )}
                            {isExpanded && item.hashtags && (
                              <div className="flex flex-wrap gap-1.5 mt-3">
                                {(Array.isArray(item.hashtags) ? item.hashtags : String(item.hashtags).split(',')).map((tag, t) => (
                                  <span key={t} className={`text-[10px] px-2 py-0.5 rounded-full ${pcfg.badge}`}>
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          {!isExpanded && item.status !== 'approved' && item.status !== 'published' && item.status !== 'rejected' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleApprove(item.id); }}
                              disabled={approving === item.id}
                              className="text-xs px-3 py-1 bg-agents-apollo/10 text-agents-apollo border border-agents-apollo/30 rounded hover:bg-agents-apollo/20 transition-colors"
                            >
                              {approving === item.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                'Approve'
                              )}
                            </button>
                          )}
                        </div>
                        {isExpanded && item.status !== 'approved' && item.status !== 'published' && item.status !== 'rejected' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleApprove(item.id); }}
                            disabled={approving === item.id}
                            className="mt-3 w-full text-xs py-2 bg-agents-apollo/10 text-agents-apollo border border-agents-apollo/30 rounded-lg hover:bg-agents-apollo/20 transition-colors flex items-center justify-center gap-1.5"
                          >
                            {approving === item.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <><Check size={12} /> Approve & Queue</>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentStudio;

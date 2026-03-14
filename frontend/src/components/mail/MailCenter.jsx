import { useState, useEffect, useRef } from 'react';
import {
  UploadCloud, FileSpreadsheet, Send, Filter, Eye, Loader2, Sparkles,
  Wand2, Users, AlertTriangle, Check, ChevronDown, ChevronUp, Mail,
  Clock, User, RefreshCw
} from 'lucide-react';
import {
  getParticipants, uploadParticipants, draftEmails, personalizeEmails, sendBatch, getContentQueue
} from '../../services/api';

const MailCenter = () => {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendDone, setSendDone] = useState(false);

  // Draft prompt
  const [prompt, setPrompt] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [draftResult, setDraftResult] = useState(null);

  // Template & preview
  const [template, setTemplate] = useState('');
  const [previewIdx, setPreviewIdx] = useState(0);

  const [queue, setQueue] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [expandedQueueItem, setExpandedQueueItem] = useState(null);

  const fileRef = useRef(null);

  // Load participants and email queue
  useEffect(() => {
    getParticipants()
      .then((data) => {
        const items = data?.participants || data || [];
        setParticipants(Array.isArray(items) ? items : []);
      })
      .catch(() => setParticipants([]))
      .finally(() => setLoading(false));

    getContentQueue('email_draft')
      .then((data) => {
        const items = data?.content || data || [];
        setQueue(Array.isArray(items) ? items : []);
      })
      .catch(() => setQueue([]));
  }, []);

  // ── Upload handlers ─────────────────────────────────────
  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadParticipants(file);
      setParticipants(result.participants || []);
    } catch (e) {
      console.error('Upload failed:', e);
    }
    setUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileUpload(file);
  };

  // ── Draft emails via Hermes ─────────────────────────────
  const handleDraft = async () => {
    if (!prompt.trim() || drafting) return;
    setDrafting(true);
    setDraftResult(null);
    try {
      const res = await draftEmails(prompt);
      setDraftResult(res);
      if (res?.email_template) setTemplate(res.email_template);
      setPreviewIdx(0);

      // Refresh queue
      const qRes = await getContentQueue('email_draft');
      setQueue(qRes?.content || qRes || []);
    } catch (e) {
      console.error('Draft failed:', e);
    }
    setDrafting(false);
  };

  // ── Send batch ──────────────────────────────────────────
  const handleSend = async () => {
    setSending(true);
    try {
      await sendBatch();
      setSendDone(true);
      setTimeout(() => setSendDone(false), 3000);
    } catch (e) {
      console.error(e);
    }
    setSending(false);
  };

  // ── Derived data ────────────────────────────────────────
  const validCount = participants.filter(
    (p) => p.status === 'valid' || p.is_valid_email === true || p.is_valid_email === 1
  ).length;
  const invalidCount = participants.length - validCount;

  const previews = draftResult?.preview_emails || [];
  const segments = draftResult?.segments || [];
  const invalidEmails = draftResult?.invalid_emails || [];
  const preview = previews[previewIdx];

  return (
    <div className="space-y-6 h-full pb-8">
      {/* ─── HERO HEADER (HERMES) ────────────────────────── */}
      <header className="relative overflow-hidden rounded-2xl border border-agents-hermes/20 bg-gradient-to-br from-agents-hermes/[0.06] via-black/60 to-blue-500/[0.04]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(52,211,153,0.12),transparent)]" />
        <div className="relative z-10 px-8 py-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-agents-hermes/30 to-teal-600/20 flex items-center justify-center border border-agents-hermes/30 shadow-[0_0_30px_rgba(52,211,153,0.15)]">
                <Mail className="text-agents-hermes" size={28} />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-black animate-pulse" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white mb-0.5">
                HERMES
              </h1>
              <p className="text-sm text-slate-400 flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-agents-hermes animate-pulse" />
                Communications & Engagement Lead
              </p>
            </div>
          </div>

          <button
            onClick={handleSend}
            disabled={sending || previews.length === 0}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-[0_0_15px_rgba(52,211,153,0.15)] ${
              sendDone
                ? 'bg-success/20 text-success border border-success/40'
                : 'bg-agents-hermes/10 text-agents-hermes border border-agents-hermes/30 hover:bg-agents-hermes/20 disabled:opacity-50'
            }`}
          >
            {sendDone ? (
              <>
                <Check size={16} /> Emails Queued!
              </>
            ) : sending ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Sending...
              </>
            ) : (
              <>
                <Send size={16} /> Batch Send
              </>
            )}
          </button>
        </div>
      </header>

      <div
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-up"
        style={{ animationDelay: '80ms' }}
      >
        {/* ══════════════════════════════════════════════════
            LEFT COLUMN — Upload + Prompt + Segments
            ══════════════════════════════════════════════════ */}
        <div className="lg:col-span-1 space-y-6">
          {/* Upload Zone */}
          <div
            className="bg-card border border-gray-800 border-dashed rounded-xl p-6 text-center hover:border-agents-hermes/50 transition-colors cursor-pointer group"
            onClick={() => fileRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files[0])}
            />
            <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-agents-hermes/10 transition-colors">
              {uploading ? (
                <Loader2
                  size={24}
                  className="text-agents-hermes animate-spin"
                />
              ) : (
                <UploadCloud
                  size={24}
                  className="text-gray-400 group-hover:text-agents-hermes transition-colors"
                />
              )}
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">
              {uploading ? 'Processing...' : 'Upload Registration Data'}
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              CSV or Excel with name, email, role columns
            </p>
            {participants.length > 0 && (
              <div className="flex items-center justify-center text-xs text-gray-500 font-mono bg-gray-900 border border-gray-800 rounded px-3 py-1.5 w-max mx-auto">
                <FileSpreadsheet size={12} className="mr-1.5" />
                {participants.length} loaded
                <span className="ml-2 text-success font-bold">
                  {validCount} valid
                </span>
                {invalidCount > 0 && (
                  <span className="ml-1.5 text-error">{invalidCount} bad</span>
                )}
              </div>
            )}
          </div>

          {/* Draft Prompt */}
          <div className="bg-card border border-gray-800 rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2 text-sm">
              <Wand2 size={14} className="text-agents-hermes" /> Draft with
              Hermes
            </h3>
            <textarea
              className="w-full h-28 bg-background border border-gray-700 rounded-lg p-3 text-sm text-text-primary focus:ring-1 focus:ring-agents-hermes focus:border-agents-hermes focus:outline-none resize-none mb-3"
              placeholder={`Describe the email you need — for example:\n\n"Send a welcome email to all registered participants. Include the event date, venue address, and a reminder to bring their ID for badge collection."\n\nHermes will draft, personalize, and segment automatically.`}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <button
              onClick={handleDraft}
              disabled={drafting || !prompt.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-agents-hermes/20 text-agents-hermes border border-agents-hermes/50 rounded-lg text-sm font-semibold hover:bg-agents-hermes/30 transition-colors disabled:opacity-50"
            >
              {drafting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              {drafting ? 'Hermes is drafting...' : 'Draft Emails'}
            </button>
          </div>

          {/* Segments */}
          {segments.length > 0 && (
            <div className="bg-card border border-gray-800 rounded-xl p-5 shadow-sm animate-fade-up">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2 text-sm">
                <Users size={14} className="text-agents-hermes" /> Audience
                Segments
              </h3>
              <div className="space-y-2">
                {segments.map((seg, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-background rounded-lg px-3 py-2 border border-gray-800"
                  >
                    <span className="text-sm text-gray-300">{seg.name}</span>
                    <span className="text-xs font-bold text-agents-hermes bg-agents-hermes/10 rounded-full px-2 py-0.5 border border-agents-hermes/30">
                      {seg.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Validation */}
          {invalidEmails.length > 0 && (
            <div className="bg-error/5 border border-error/20 rounded-xl p-4 animate-fade-up">
              <h3 className="text-sm font-semibold text-error mb-2 flex items-center gap-2">
                <AlertTriangle size={14} /> Flagged Emails (
                {invalidEmails.length})
              </h3>
              <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                {invalidEmails.map((inv, i) => (
                  <li
                    key={i}
                    className="text-xs text-red-300 flex items-start gap-2"
                  >
                    <span className="font-mono text-error/70 truncate max-w-[120px]">
                      {inv.email}
                    </span>
                    <span className="text-gray-500">— {inv.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════
            RIGHT COLUMN — Output
            ══════════════════════════════════════════════════ */}
        <div className="lg:col-span-2 space-y-6">
          {/* Reasoning banner */}
          {draftResult?.reasoning && (
            <div className="bg-agents-hermes/5 border border-agents-hermes/20 rounded-lg p-4 text-sm text-gray-300 animate-fade-up">
              <div className="flex items-center gap-2 text-agents-hermes font-semibold text-xs uppercase tracking-wider mb-2">
                <Wand2 size={14} /> Hermes' Strategy
              </div>
              <p className="leading-relaxed whitespace-pre-wrap">
                {draftResult.reasoning}
              </p>
            </div>
          )}

          {/* Email Preview Cards */}
          <div className="bg-card border border-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div className="border-b border-gray-800 p-4 bg-gray-900/40 flex items-center justify-between">
              <h3 className="font-semibold text-white text-sm">
                Email Previews
              </h3>
              {previews.length > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setPreviewIdx((p) =>
                        p > 0 ? p - 1 : previews.length - 1
                      )
                    }
                    className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    ←
                  </button>
                  <span className="text-xs text-gray-500">
                    {previewIdx + 1} / {previews.length}
                  </span>
                  <button
                    onClick={() =>
                      setPreviewIdx((p) =>
                        p < previews.length - 1 ? p + 1 : 0
                      )
                    }
                    className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    →
                  </button>
                </div>
              )}
            </div>

            {drafting ? (
              <div className="p-8 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse space-y-2">
                    <div className="h-4 bg-gray-700 rounded w-2/3" />
                    <div className="h-3 bg-gray-700 rounded w-full" />
                    <div className="h-3 bg-gray-700 rounded w-5/6" />
                  </div>
                ))}
              </div>
            ) : preview ? (
              <div className="p-0">
                {/* Email header */}
                <div className="bg-agents-hermes/5 border-b border-agents-hermes/15 px-6 py-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-agents-hermes/20 flex items-center justify-center text-agents-hermes">
                      <Mail size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-semibold text-sm truncate">
                        {preview.subject}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <User size={10} /> To: {preview.to}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} /> Just now
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-agents-hermes/15 text-agents-hermes border border-agents-hermes/30 font-bold uppercase">
                      Draft
                    </span>
                  </div>
                </div>
                {/* Email body */}
                <div className="px-6 py-5 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap bg-background/30 min-h-[200px]">
                  {preview.body}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-gray-500">
                <Mail size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">
                  Describe your email needs above and click "Draft Emails"
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Hermes drafts, personalizes, and segments automatically.
                </p>
              </div>
            )}
          </div>

          {/* Email Template (generated by Hermes) */}
          {template && (
            <div className="bg-card border border-gray-800 rounded-xl shadow-sm overflow-hidden animate-fade-up">
              <div className="p-4 border-b border-gray-800 bg-gray-900/40 flex items-center justify-between">
                <h3 className="font-semibold text-white text-sm">
                  Reusable Template
                </h3>
                <span className="text-[10px] text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                  {'{{placeholders}}'} auto-filled per recipient
                </span>
              </div>
              <div className="p-4">
                <textarea
                  className="w-full h-36 bg-background border border-gray-700 rounded-lg p-3 text-sm text-gray-300 focus:ring-1 focus:ring-agents-hermes focus:border-agents-hermes focus:outline-none resize-none font-mono"
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Participant Table */}
          <div className="bg-card border border-gray-800 rounded-xl shadow-sm overflow-hidden animate-fade-up">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/40">
              <h3 className="font-semibold text-white flex items-center text-sm">
                Participants
                <span className="ml-2 bg-gray-800 px-2 py-0.5 rounded-full text-xs text-gray-400">
                  {participants.length}
                </span>
              </h3>
            </div>
            <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-text-secondary uppercase bg-background border-b border-gray-800 sticky top-0">
                  <tr>
                    <th className="px-6 py-3">Participant</th>
                    <th className="px-6 py-3">Organization</th>
                    <th className="px-6 py-3">Role & Track</th>
                    <th className="px-6 py-3 text-center">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {loading ? (
                    [1, 2, 3].map((i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-3">
                          <div className="h-4 bg-gray-700 rounded w-32 mb-1" />
                          <div className="h-3 bg-gray-700 rounded w-48" />
                        </td>
                        <td className="px-6 py-3">
                          <div className="h-4 bg-gray-700 rounded w-24" />
                        </td>
                        <td className="px-6 py-3">
                          <div className="h-4 bg-gray-700 rounded w-20" />
                        </td>
                        <td className="px-6 py-3">
                          <div className="h-4 bg-gray-700 rounded w-12 mx-auto" />
                        </td>
                      </tr>
                    ))
                  ) : participants.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-12 text-center text-gray-500 text-sm"
                      >
                        No participants loaded. Upload a CSV to get started.
                      </td>
                    </tr>
                  ) : (
                    participants.map((p, i) => (
                      <tr
                        key={p.id || i}
                        className={
                          p.status === 'invalid'
                            ? 'bg-error/5 hover:bg-error/10'
                            : 'bg-card hover:bg-gray-800/30'
                        }
                      >
                        <td className="px-6 py-3">
                          <div className="font-medium text-white">{p.name}</div>
                          <div className={`text-xs ${p.status === 'invalid' ? 'text-error/70 line-through' : 'text-gray-500'}`}>
                            {p.email}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-gray-400">
                          {p.organization || <span className="text-gray-600 italic">N/A</span>}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex flex-col gap-1.5">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold border w-max ${
                                p.role === 'speaker'
                                  ? 'bg-primary/20 text-primary border-primary/30'
                                  : p.role === 'vip'
                                  ? 'bg-agents-fortuna/20 text-agents-fortuna border-agents-fortuna/30'
                                  : 'bg-gray-800 text-gray-300 border-gray-700'
                              }`}
                            >
                              {p.role}
                            </span>
                            {p.track && (
                              <span className="text-[10px] text-gray-500 font-medium px-1 underline decoration-gray-700 underline-offset-2">
                                {p.track}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-center">
                          {(p.status === 'valid' || p.is_valid_email === true || p.is_valid_email === 1) ? (
                            <span className="inline-flex items-center gap-1.5 text-success text-xs font-bold bg-success/10 px-2 py-1 rounded-md border border-success/20">
                              <Check size={12} /> Verified
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1.5 text-error text-xs font-bold bg-error/10 px-2 py-1 rounded-md border border-error/20 cursor-help"
                              title="Email validation failed"
                            >
                              <AlertTriangle size={12} /> Invalid
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Email Queue History */}
          {queue.length > 0 && (
            <div className="bg-card border border-gray-800 rounded-xl shadow-sm overflow-hidden animate-fade-up">
              <button
                onClick={() => setHistoryOpen(!historyOpen)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-agents-hermes/20 flex items-center justify-center text-agents-hermes">
                    <Mail size={16} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-semibold text-white">
                      Email Queue ({queue.length} items)
                    </h3>
                    <p className="text-xs text-gray-500">
                      All previously drafted and sent emails
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
                <div className="border-t border-gray-800 divide-y divide-gray-800 max-h-[400px] overflow-y-auto w-full">
                  {queue.map((item, i) => {
                    const isExpanded = expandedQueueItem === (item.id || i);
                    return (
                      <div
                        key={item.id || i}
                        className="p-4 hover:bg-gray-800/30 transition-colors cursor-pointer"
                        onClick={() => setExpandedQueueItem(isExpanded ? null : (item.id || i))}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-medium text-sm truncate flex-1">
                            {item.title || item.subject || 'Untitled Email'}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${
                              item.status === 'sent' || item.status === 'published'
                                ? 'bg-success/15 text-success border-success/30'
                                : item.status === 'rejected'
                                ? 'bg-error/15 text-error border-error/30'
                                : 'bg-gray-800 text-gray-400 border-gray-700'
                            }`}
                          >
                            {item.status || 'draft'}
                          </span>
                          <Eye size={14} className={`shrink-0 transition-colors ${isExpanded ? 'text-agents-hermes' : 'text-gray-600'}`} />
                        </div>
                        {isExpanded ? (
                          <div className="mt-3 bg-background/50 rounded-lg border border-gray-800 overflow-hidden">
                            <div className="bg-agents-hermes/5 border-b border-agents-hermes/15 px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Mail size={14} className="text-agents-hermes" />
                                <span className="text-sm font-semibold text-white">{item.title || item.subject || 'Untitled Email'}</span>
                              </div>
                            </div>
                            <div className="px-4 py-4 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                              {item.body || item.text || ''}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 line-clamp-2 mt-1">
                            {item.text || item.body || ''}
                          </p>
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

export default MailCenter;

import { useState, useEffect } from 'react';
import { Image as ImageIcon, Send, Sparkles, Wand2, CalendarSync, Loader2, Check } from 'lucide-react';
import { generateContent, getContentQueue, approveContent } from '../../services/api';

const ContentStudio = () => {
  const [brief, setBrief] = useState('Promote the opening keynote by Dr. Sarah Chen. Focus on the impact of autonomous AI over the next 5 years. Target audience: developers and product managers.');
  const [platforms, setPlatforms] = useState(['linkedin', 'twitter']);
  const [tone, setTone] = useState('professional');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [queue, setQueue] = useState([]);
  const [approving, setApproving] = useState(null);

  // Load existing content queue
  useEffect(() => {
    getContentQueue().then(setQueue).catch(() => {});
  }, []);

  const togglePlatform = (p) => {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await generateContent(brief, platforms, tone);
      setResult(res);
    } catch (e) {
      console.error('Generate failed:', e);
    }
    setGenerating(false);
  };

  const handleApprove = async (id) => {
    setApproving(id);
    try {
      await approveContent(id);
      setQueue(prev => prev.map(q => q.id === id ? { ...q, status: 'approved' } : q));
      if (result) {
        setResult({
          ...result,
          variants: result.variants.map(v => v.id === id ? { ...v, status: 'approved' } : v)
        });
      }
    } catch (e) { console.error(e); }
    setApproving(null);
  };

  const variants = result?.variants || queue;
  const timeline = result?.campaign_timeline || [
    { id: 1, label: 'Teaser', time: 'Today 2PM', type: 'teaser' },
    { id: 2, label: 'Speaker Bio', time: 'Tom. 9AM', type: 'speaker_bio' },
    { id: 3, label: 'Live Update', time: 'Day of Event', type: 'live_update' },
  ];

  const platformColors = {
    linkedin: 'bg-blue-900/40 text-blue-300 border-blue-900/60',
    twitter: 'bg-sky-900/40 text-sky-300 border-sky-900/60',
    instagram: 'bg-pink-900/40 text-pink-300 border-pink-900/60',
    email: 'bg-gray-800 text-gray-400 border-gray-700',
  };

  return (
    <div className="space-y-6 h-full pb-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white drop-shadow-sm mb-2">Content Studio</h2>
          <p className="text-text-secondary">Apollo generates promotional campaigns across platforms.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleGenerate}
            disabled={generating || !brief.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-agents-apollo/10 text-agents-apollo border border-agents-apollo/30 rounded-lg text-sm font-medium hover:bg-agents-apollo/20 transition-colors shadow-[0_0_10px_rgba(167,139,250,0.1)] disabled:opacity-50"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            {generating ? 'Generating...' : 'New Campaign'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
           <div className="bg-card border border-gray-800 rounded-xl p-5 shadow-sm">
             <h3 className="font-semibold text-white mb-4">Campaign Brief</h3>
             <textarea 
               className="w-full h-32 bg-background border border-gray-700 rounded-lg p-3 text-sm text-text-primary focus:ring-1 focus:ring-agents-apollo focus:border-agents-apollo focus:outline-none resize-none mb-4"
               placeholder="Enter event details and goals..."
               value={brief}
               onChange={e => setBrief(e.target.value)}
             ></textarea>
             
             <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 font-semibold uppercase mb-2 block">Platforms</label>
                  <div className="flex gap-2 flex-wrap">
                    {['linkedin', 'twitter', 'instagram', 'email'].map(p => (
                      <span
                        key={p}
                        onClick={() => togglePlatform(p)}
                        className={`text-xs px-3 py-1 rounded-full border cursor-pointer transition-all ${platforms.includes(p) ? (platformColors[p] || platformColors.email) : 'bg-gray-800 text-gray-500 border-gray-700 opacity-50'}`}
                      >
                        {p === 'twitter' ? 'Twitter/X' : p.charAt(0).toUpperCase() + p.slice(1)}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-semibold uppercase mb-2 block">Tone</label>
                  <select value={tone} onChange={e => setTone(e.target.value)} className="w-full bg-background border border-gray-700 rounded-lg p-2 text-sm text-text-primary focus:outline-none">
                    <option value="professional">Professional</option>
                    <option value="hype">Hype / Casual</option>
                    <option value="technical">Technical</option>
                    <option value="auto">Auto (Let Apollo Decide)</option>
                  </select>
                </div>
             </div>
             
             <button
               onClick={handleGenerate}
               disabled={generating || !brief.trim()}
               className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-2 bg-agents-apollo/20 text-agents-apollo border border-agents-apollo/50 rounded-lg text-sm font-semibold hover:bg-agents-apollo/30 transition-colors disabled:opacity-50"
             >
               {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
               {generating ? 'Apollo is thinking...' : 'Generate Assets'}
             </button>
           </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
           {/* Timeline Strip */}
           <div className="bg-card border border-gray-800 rounded-xl p-4 shadow-sm flex items-center overflow-x-auto gap-4 scrollbar-hide">
              <div className="flex items-center text-agents-apollo shrink-0 mr-4 font-medium text-sm">
                <CalendarSync size={18} className="mr-2"/> Schedule Plan
              </div>
              {timeline.map(t => (
                <div key={t.id} className={`rounded p-2 text-xs shrink-0 flex flex-col items-center min-w-[100px] border ${t.type === 'live_update' ? 'bg-gray-800/50 border-gray-700 border-dashed' : 'bg-agents-apollo/20 border-agents-apollo/40'}`}>
                   <span className={`font-bold mb-1 ${t.type === 'live_update' ? 'text-gray-500' : 'text-gray-400'}`}>{t.time}</span>
                   <span className={`text-[10px] uppercase ${t.type === 'live_update' ? 'text-gray-500' : 'text-agents-apollo'}`}>{t.label}</span>
                </div>
              ))}
           </div>

           {/* Generated Output Variants */}
           <div className="bg-card border border-gray-800 rounded-xl shadow-sm min-h-[400px]">
              <div className="border-b border-gray-800 p-4 bg-gray-900/40">
                <h3 className="font-semibold text-white">Generated Variants</h3>
              </div>
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                 {generating ? (
                   [1,2].map(i => (
                     <div key={i} className="border border-gray-800 rounded-lg bg-background p-4 animate-pulse">
                       <div className="h-4 bg-gray-700 rounded w-20 mb-4" />
                       <div className="space-y-2 mb-4"><div className="h-3 bg-gray-700 rounded" /><div className="h-3 bg-gray-700 rounded w-3/4" /><div className="h-3 bg-gray-700 rounded w-1/2" /></div>
                       <div className="h-20 bg-gray-700 rounded mb-4" />
                       <div className="h-8 bg-gray-700 rounded" />
                     </div>
                   ))
                 ) : variants.length > 0 ? (
                   variants.map((v, i) => (
                     <div key={v.id || i} className={`border rounded-lg bg-background p-4 relative group transition-all ${v.is_recommended ? 'border-agents-apollo/50 hover:shadow-[0_0_15px_rgba(167,139,250,0.15)]' : 'border-gray-800 hover:border-gray-700'}`}>
                        {v.is_recommended && <div className="absolute top-0 right-0 bg-agents-apollo text-black text-[10px] font-bold px-2 py-0.5 rounded-bl-lg rounded-tr-lg">Recommended</div>}
                        <div className="flex justify-between items-center mb-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-semibold border ${platformColors[v.platform] || platformColors.email}`}>{v.platform}</span>
                          <span className="text-xs text-gray-500">{v.tone}</span>
                        </div>
                        <p className="text-sm text-gray-300 mb-4 whitespace-pre-wrap">{v.text}</p>
                        {v.image_prompt && (
                          <div className="bg-gray-900 border border-gray-800 rounded p-4 text-center text-gray-500 flex flex-col items-center justify-center mb-4 cursor-pointer hover:bg-gray-800 transition-colors">
                            <ImageIcon size={24} className="mb-2 opacity-50" />
                            <span className="text-[10px]">{v.image_prompt.substring(0, 80)}...</span>
                          </div>
                        )}
                        <div className="flex gap-2">
                           <button
                             onClick={() => handleApprove(v.id)}
                             disabled={approving === v.id || v.status === 'approved'}
                             className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center ${v.status === 'approved' ? 'bg-success/20 text-success border border-success/30' : v.is_recommended ? 'bg-agents-apollo/10 hover:bg-agents-apollo/20 text-agents-apollo border border-agents-apollo/30' : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'}`}
                           >
                             {v.status === 'approved' ? <><Check size={14} className="mr-1" /> Approved</> : approving === v.id ? <Loader2 size={14} className="animate-spin" /> : 'Approve & Queue'}
                           </button>
                        </div>
                     </div>
                   ))
                 ) : (
                   <div className="col-span-2 text-center py-16 text-gray-500">
                     <Sparkles size={32} className="mx-auto mb-3 opacity-30" />
                     <p className="text-sm">Enter a campaign brief and click "Generate Assets" to see Apollo's creative output.</p>
                   </div>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ContentStudio;

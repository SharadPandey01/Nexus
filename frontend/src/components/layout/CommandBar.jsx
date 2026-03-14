import { useState, useRef } from 'react';
import { Search, Bell, User, Send, Loader2, Cpu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { sendChat } from '../../services/api';

const CommandBar = () => {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState(null);
    const [showPanel, setShowPanel] = useState(false);
    const inputRef = useRef(null);

    const handleSubmit = async (e) => {
        e?.preventDefault();
        if (!input.trim() || loading) return;
        setLoading(true);
        setShowPanel(true);
        try {
            const result = await sendChat(input);
            setResponse(result);
            setInput('');
        } catch {
            setResponse({ reply: 'Failed to reach Nexus Core. Please try again.', plan: [], agents_involved: [] });
        }
        setLoading(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
        if (e.key === 'Escape') {
            setShowPanel(false);
            setResponse(null);
        }
    };

    const agentColorMap = {
        Chronos: 'text-agents-chronos',
        Hermes: 'text-agents-hermes',
        Apollo: 'text-agents-apollo',
        Athena: 'text-agents-athena',
        'Nexus Core': 'text-primary',
        Fortuna: 'text-warning',
    };

    return (
        <>
            <header className="h-16 border-b border-white/10 glass-card !rounded-none !shadow-none !border-x-0 !border-t-0 flex items-center justify-between px-6 sticky top-0 z-10 w-full">
                <form onSubmit={handleSubmit} className="flex-1 max-w-2xl relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        {loading ? <Loader2 size={18} className="text-primary animate-spin" /> : <Search size={18} className="text-gray-500" />}
                    </div>
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Command Nexus (e.g. 'Add a surprise keynote by the CEO to Day 2')"
                        className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-20 py-2 text-sm text-text-primary focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all placeholder-gray-500"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-2">
                        {input.trim() && (
                            <button type="submit" className="text-primary hover:text-white transition-colors">
                                <Send size={14} />
                            </button>
                        )}
                        <span className="text-xs text-gray-500 font-mono bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">⌘K</span>
                    </div>
                </form>

                <div className="flex items-center space-x-4 ml-6">
                    <Link to="/dashboard/approvals" className="relative p-2 text-text-secondary hover:text-white transition-colors" title="Pending Approvals">
                        <Bell size={20} />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full animate-pulse"></span>
                    </Link>
                    <Link to="/dashboard/Profile" className="flex items-center space-x-3 pl-4 border-l border-white/10 hover:opacity-80 transition-opacity">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold border border-primary/30">
                            YO
                        </div>
                        <div className="hidden md:block">
                            <div className="text-sm font-medium">Event Organizer</div>
                            <div className="text-xs text-text-secondary">Admin</div>
                        </div>
                    </Link>
                </div>
            </header>

            {/* Nexus Core Response Panel */}
            {showPanel && response && (
                <div className="border-b border-primary/30 bg-primary/5 px-6 py-4 backdrop-blur-sm relative z-10 animate-panel-in">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Cpu size={16} className="text-white" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-primary font-semibold text-sm">Nexus Core</span>
                                    {response.agents_involved?.length > 0 && (
                                        <span className="text-[10px] text-gray-400">
                                            → {response.agents_involved.map(a => (
                                                <span key={a} className={`${agentColorMap[a] || 'text-gray-400'} font-medium mx-0.5`}>{a}</span>
                                            ))}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-300 mb-3">{response.reply}</p>
                                {response.plan?.length > 0 && (
                                    <div className="bg-background/50 border border-gray-800 rounded-lg p-3">
                                        <div className="text-[10px] text-gray-500 uppercase font-semibold mb-2">Execution Plan</div>
                                        <ol className="space-y-1.5">
                                            {response.plan.map((step, i) => (
                                                <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                                                    <span className="text-primary font-bold mt-0.5">{i + 1}.</span>
                                                    <span>{step}</span>
                                                </li>
                                            ))}
                                        </ol>
                                    </div>
                                )}
                            </div>
                            <button onClick={() => { setShowPanel(false); setResponse(null); }} className="text-gray-500 hover:text-white text-xs">✕</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CommandBar;

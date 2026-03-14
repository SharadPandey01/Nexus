import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Paperclip, Mic, Send, X, FileText,
  Calendar, Mail, PenTool, BarChart, Wallet, Loader2
} from 'lucide-react';
import { createEvent, invokeAgents, getAgentStatus, uploadEventFile } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';

const AGENT_MAP = {
  chronos: 0,
  hermes: 1,
  apollo: 2,
  athena: 3,
  fortuna: 4,
};

const NewEvent = () => {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  // ── Speech Recognition ─────────────────────────────────
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false; // Only get final results

      recognition.onresult = (event) => {
        let newTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            newTranscript += event.results[i][0].transcript;
          }
        }
        if (newTranscript) {
          setPrompt((prev) => {
            const separator = prev && !prev.endsWith(' ') && !prev.endsWith('\n') ? ' ' : '';
            return prev + separator + newTranscript;
          });
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // ── Backend integration state ──────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionPhase, setSubmissionPhase] = useState('idle'); // idle | creating | uploading | invoking | done | error
  const [error, setError] = useState('');

  const agents = [
    {
      name: 'Schedule',
      agentKey: 'chronos',
      persona: 'Chronos',
      icon: Calendar,
      path: '/dashboard/schedule',
      color: 'text-emerald-400',
      glow: "group-hover:shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]",
      flare: "from-emerald-500/20",
      status: 'idle',
      statusLabel: 'Idle',
    },
    {
      name: 'Mailing',
      agentKey: 'hermes',
      icon: Mail,
      path: '/dashboard/mail',
      color: 'text-blue-400',
      glow: "group-hover:shadow-[0_0_40px_-10px_rgba(59,130,246,0.5)]",
      flare: "from-blue-500/20",
      status: 'idle',
      statusLabel: 'Idle',
    },
    {
      name: 'Content',
      agentKey: 'apollo',
      icon: PenTool,
      path: '/dashboard/content',
      color: 'text-purple-400',
      glow: "group-hover:shadow-[0_0_40px_-10px_rgba(168,85,247,0.5)]",
      flare: "from-purple-500/20",
      status: 'idle',
      statusLabel: 'Idle',
    },
    {
      name: 'Analytics',
      agentKey: 'athena',
      icon: BarChart,
      path: '/dashboard/athena',
      color: 'text-amber-400',
      glow: "group-hover:shadow-[0_0_40px_-10px_rgba(251,191,36,0.5)]",
      flare: "from-amber-500/20",
      status: 'idle',
      statusLabel: 'Idle',
    },
    {
      name: 'Budget',
      agentKey: 'fortuna',
      icon: Wallet,
      path: '/dashboard/finance',
      color: 'text-rose-400',
      glow: "group-hover:shadow-[0_0_40px_-10px_rgba(244,63,94,0.5)]",
      flare: "from-rose-500/20",
      status: 'idle',
      statusLabel: 'Idle',
    },
  ];

  // ── Live agent statuses ────────────────────────────────
  const [agentStatuses, setAgentStatuses] = useState({});

  // Fetch agent statuses on mount
  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const data = await getAgentStatus();
        if (data?.agents) {
          setAgentStatuses(data.agents);
        }
      } catch (err) {
        console.warn('[NewEvent] Could not fetch agent statuses:', err.message);
      }
    };
    fetchStatuses();
  }, []);

  // ── WebSocket for real-time agent updates ──────────────
  const handleWsMessage = useCallback((msg) => {
    // Handle agent_status updates
    if (msg.type === 'agent_status' && msg.agent) {
      setAgentStatuses((prev) => ({
        ...prev,
        [msg.agent]: {
          status: msg.status || 'idle',
          last_task: msg.message || msg.details || '',
        },
      }));
    }
    // Handle agent_complete updates
    if (msg.type === 'agent_complete' && msg.agent) {
      setAgentStatuses((prev) => ({
        ...prev,
        [msg.agent]: {
          status: 'done',
          last_task: 'Task complete',
        },
      }));
    }
    // Handle error updates
    if (msg.type === 'error' && msg.agent) {
      setAgentStatuses((prev) => ({
        ...prev,
        [msg.agent]: {
          status: 'error',
          last_task: msg.message || 'Error occurred',
        },
      }));
    }
  }, []);

  const { isConnected } = useWebSocket('/ws/stream', {
    onMessage: handleWsMessage,
  });

  // ── Resolve display status for each agent card ─────────
  const getAgentDisplayStatus = (agentKey, agentColor) => {
    const live = agentStatuses[agentKey];
    if (!live) return { label: 'Idle', statusClass: 'text-slate-500 opacity-50' };

    const status = live.status || 'idle';
    switch (status) {
      case 'working':
        return { label: 'Active', statusClass: `${agentColor} animate-pulse`, dotClass: 'bg-current' };
      case 'done':
        return { label: 'Idle', statusClass: 'text-slate-400' };
      case 'error':
        return { label: 'Error', statusClass: 'text-red-400' };
      default:
        return { label: 'Idle', statusClass: 'text-slate-500 opacity-50' };
    }
  };

  // ── File handling ──────────────────────────────────────
  const handleFileUpload = (e) => {
    const uploadedFiles = Array.from(e.target.files);
    setFiles([...files, ...uploadedFiles]);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      setError('Voice recognition is not supported in your browser. Please try Chrome or Edge.');
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Error starting speech recognition:', err);
      }
    }
  };

  // ── Submit: Create Event → Upload Files → Invoke Agents ──
  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    setIsSubmitting(true);
    setError('');

    try {
      // Phase 1: Create the event (LLM parses structured details from prompt)
      setSubmissionPhase('creating');
      const eventResult = await createEvent(prompt.trim());

      const eventId = eventResult?.event?.id;

      // Phase 2: Upload attached files (CSV/Excel only)
      if (files.length > 0) {
        setSubmissionPhase('uploading');
        const uploadableFiles = files.filter((f) => {
          const ext = f.name.split('.').pop()?.toLowerCase();
          return ['csv', 'xlsx', 'xls'].includes(ext);
        });

        for (const file of uploadableFiles) {
          try {
            await uploadEventFile(file);
          } catch (uploadErr) {
            console.warn(`[NewEvent] File upload failed for ${file.name}:`, uploadErr.message);
            // Continue with other files — don't block the flow
          }
        }
      }

      // Phase 3: Invoke the AI orchestrator
      setSubmissionPhase('invoking');
      await invokeAgents(prompt.trim(), null, eventId);

      // Phase 4: Success — navigate to dashboard
      setSubmissionPhase('done');
      navigate('/dashboard');

    } catch (err) {
      console.error('[NewEvent] Submission failed:', err);
      setError(err.message || 'Something went wrong. Please try again.');
      setSubmissionPhase('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Phase label for the Start button ───────────────────
  const getButtonLabel = () => {
    switch (submissionPhase) {
      case 'creating': return 'Creating Event…';
      case 'uploading': return 'Uploading Files…';
      case 'invoking': return 'Activating Agents…';
      default: return 'Start';
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center max-w-7xl mx-auto p-6 space-y-16">

      {/* 1. Centered Prompt Section */}
      <div className="w-full max-w-3xl space-y-8 relative z-10 animate-fade-up">
        <header className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            Organize a New Event
          </h1>
          <p className="text-slate-400 text-lg font-light">
            Describe your vision and let your swarm handle the logistics.
          </p>
          {/* WebSocket status indicator */}
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
            {isConnected ? 'Live' : 'Offline'}
          </div>
        </header>

        {/* Error display */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="hover:text-red-100 transition-colors">
              <X size={16} />
            </button>
          </div>
        )}

        {files.length > 0 && (
          <div className="flex flex-wrap gap-3 p-3 bg-white/[0.05] backdrop-blur-md rounded-xl border border-white/[0.1]">
            {files.map((file, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-white/[0.08] px-3 py-1.5 rounded-lg text-xs text-slate-200 border border-white/[0.05]">
                <FileText size={14} />
                <span className="truncate max-w-[120px]">{file.name}</span>
                <button onClick={() => removeFile(idx)} className="hover:text-red-400 transition-colors" disabled={isSubmitting}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative group">
          {/* Outer glow for prompt box */}
          <div className="absolute inset-0 bg-blue-500/5 blur-3xl group-focus-within:bg-blue-500/15 transition-all duration-700" />

          <div className="relative bg-gradient-to-br from-white/[0.08] to-transparent backdrop-blur-2xl border border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden group-focus-within:border-white/[0.2] transition-all">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`Describe your event — for example:\n"Organize a 3-day AI hackathon called NexusHack 2026 in Bangalore starting March 20th for 500 participants with workshops, keynotes, and networking sessions"\n\nInclude: event name, type, dates, location, expected attendees`}
              className="w-full h-40 bg-transparent p-6 text-white placeholder:text-slate-500 focus:outline-none resize-none text-lg font-light"
              disabled={isSubmitting}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />

            <div className="flex items-center justify-between p-4 bg-white/[0.02] border-t border-white/[0.05]">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => fileInputRef.current.click()}
                  className="p-2.5 text-slate-400 hover:text-white hover:bg-white/[0.08] rounded-xl transition-all"
                  disabled={isSubmitting}
                >
                  <Paperclip size={22} />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple accept=".csv,.xlsx,.xls" />

                <button
                  onClick={toggleVoice}
                  className={`p-2.5 rounded-xl transition-all ${isListening ? 'text-red-400 bg-red-400/10 animate-pulse' : 'text-slate-400 hover:text-white hover:bg-white/[0.08]'}`}
                  disabled={isSubmitting}
                >
                  <Mic size={22} />
                </button>
              </div>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !prompt.trim()}
                className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-bold transition-all active:scale-95
                  ${isSubmitting
                    ? 'bg-white/30 text-white/60 cursor-wait'
                    : !prompt.trim()
                      ? 'bg-white/20 text-white/40 cursor-not-allowed'
                      : 'bg-white text-black hover:bg-blue-50 shadow-[0_0_20px_rgba(255,255,255,0.1)]'
                  }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>{getButtonLabel()}</span>
                  </>
                ) : (
                  <>
                    <span>Start</span>
                    <Send size={18} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Agent Cards Section */}
      <div className="w-full space-y-8 relative z-10 animate-fade-up" style={{ animationDelay: '120ms' }}>
        <h3 className="text-white/40 text-xs font-black uppercase tracking-[0.3em] text-center">
          Active Autonomous Agents
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {agents.map((agent, i) => {
            const displayStatus = getAgentDisplayStatus(agent.agentKey, agent.color);
            return (
              <button
                key={i}
                onClick={() => navigate(agent.path)}
                className={`group relative p-8 rounded-2xl transition-all duration-500 
                  hover:-translate-y-2 text-left
                  bg-gradient-to-br from-white/[0.05] to-transparent
                  backdrop-blur-2xl border border-white/[0.1]
                  hover:border-white/[0.2] ${agent.glow} overflow-hidden animate-fade-up`}
                style={{ animationDelay: `${200 + i * 80}ms` }}
              >
                {/* THE GLOW FLARE */}
                <div className={`absolute -inset-px bg-gradient-to-br ${agent.flare} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10`} />

                {/* Top Right Status Alert */}
                <div className={`absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 ${displayStatus.statusClass}`}>
                  {displayStatus.label === 'Active' && (
                    <span className={`w-1.5 h-1.5 rounded-full ${displayStatus.dotClass}`} />
                  )}
                  {displayStatus.label}
                </div>

                {/* Icon Container */}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 
                  bg-white/[0.05] border border-white/[0.1] 
                  group-hover:scale-110 transition-transform duration-500"
                >
                  <agent.icon className={`w-6 h-6 ${agent.color} filter drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]`} />
                </div>

                <h4 className="text-xl font-bold text-white mb-1">
                  {agent.name}
                </h4>

                {/* Decorative Corner Light */}
                <div className="absolute top-0 right-0 w-16 h-16 bg-white/[0.02] blur-xl pointer-events-none" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default NewEvent;
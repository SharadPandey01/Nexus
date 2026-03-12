import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Paperclip, Mic, Send, X, FileText, 
  Calendar, Mail, PenTool, Lightbulb, Wallet 
} from 'lucide-react';

const NewEvent = () => {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);

  const agents = [
    { 
      name: 'Scheduler', 
      icon: Calendar, 
      path: '/dashboard/schedule', 
      color: 'text-emerald-400',
      glow: "group-hover:shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]",
      flare: "from-emerald-500/20"
    },
    { 
      name: 'Mailing', 
      icon: Mail, 
      path: '/dashboard/mail', 
      color: 'text-blue-400',
      glow: "group-hover:shadow-[0_0_40px_-10px_rgba(59,130,246,0.5)]",
      flare: "from-blue-500/20"
    },
    { 
      name: 'Content', 
      icon: PenTool, 
      path: '/dashboard/content', 
      color: 'text-purple-400',
      glow: "group-hover:shadow-[0_0_40px_-10px_rgba(168,85,247,0.5)]",
      flare: "from-purple-500/20"
    },
    { 
      name: 'Strategist', 
      icon: Lightbulb, 
      path: '/dashboard/strategy', 
      color: 'text-amber-400',
      glow: "group-hover:shadow-[0_0_40px_-10px_rgba(251,191,36,0.5)]",
      flare: "from-amber-500/20"
    },
    { 
      name: 'Budget', 
      icon: Wallet, 
      path: '/dashboard/budget', 
      color: 'text-rose-400',
      glow: "group-hover:shadow-[0_0_40px_-10px_rgba(244,63,94,0.5)]",
      flare: "from-rose-500/20"
    },
  ];

  const handleFileUpload = (e) => {
    const uploadedFiles = Array.from(e.target.files);
    setFiles([...files, ...uploadedFiles]);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const toggleVoice = () => {
    setIsListening(!isListening);
  };

  return (
    <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center max-w-7xl mx-auto p-6 space-y-16">
      
      {/* 1. Centered Prompt Section */}
      <div className="w-full max-w-3xl space-y-8 relative z-10">
        <header className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            Organize a New Event
          </h1>
          <p className="text-slate-400 text-lg font-light">
            Describe your vision and let your swarm handle the logistics.
          </p>
        </header>

        {files.length > 0 && (
          <div className="flex flex-wrap gap-3 p-3 bg-white/[0.05] backdrop-blur-md rounded-xl border border-white/[0.1]">
            {files.map((file, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-white/[0.08] px-3 py-1.5 rounded-lg text-xs text-slate-200 border border-white/[0.05]">
                <FileText size={14} />
                <span className="truncate max-w-[120px]">{file.name}</span>
                <button onClick={() => removeFile(idx)} className="hover:text-red-400 transition-colors">
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
              placeholder="Describe the event you want to organize..."
              className="w-full h-40 bg-transparent p-6 text-white placeholder:text-slate-500 focus:outline-none resize-none text-lg font-light"
            />
            
            <div className="flex items-center justify-between p-4 bg-white/[0.02] border-t border-white/[0.05]">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => fileInputRef.current.click()}
                  className="p-2.5 text-slate-400 hover:text-white hover:bg-white/[0.08] rounded-xl transition-all"
                >
                  <Paperclip size={22} />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple />
                
                <button 
                  onClick={toggleVoice}
                  className={`p-2.5 rounded-xl transition-all ${isListening ? 'text-red-400 bg-red-400/10 animate-pulse' : 'text-slate-400 hover:text-white hover:bg-white/[0.08]'}`}
                >
                  <Mic size={22} />
                </button>
              </div>

              <button className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded-2xl font-bold hover:bg-blue-50 transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                <span>Start</span>
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Agent Cards Section */}
      <div className="w-full space-y-8 relative z-10">
        <h3 className="text-white/40 text-xs font-black uppercase tracking-[0.3em] text-center">
          Active Autonomous Agents
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {agents.map((agent, i) => (
            <button
              key={i}
              onClick={() => navigate(agent.path)}
              className={`group relative p-8 rounded-2xl transition-all duration-500 
                hover:-translate-y-2 text-left
                bg-gradient-to-br from-white/[0.05] to-transparent
                backdrop-blur-2xl border border-white/[0.1]
                hover:border-white/[0.2] ${agent.glow} overflow-hidden`}
            >
              {/* THE GLOW FLARE */}
              <div className={`absolute -inset-px bg-gradient-to-br ${agent.flare} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10`} />

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
              
              <div className={`text-[10px] font-black ${agent.color} uppercase tracking-widest`}>
                Agent Active
              </div>

              {/* Decorative Corner Light */}
              <div className="absolute top-0 right-0 w-16 h-16 bg-white/[0.02] blur-xl pointer-events-none" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NewEvent;
import { useState, useEffect } from 'react';
import { Activity as ActivityIcon, Download, GitMerge, FileText, ArrowRight, Cpu, DollarSign } from 'lucide-react';
import { getAgentState, getAgentLogs } from '../../services/api';

const agentColors = {
  System: { bg: 'bg-gray-700', text: 'text-gray-300', border: 'border-gray-700' },
  Chronos: { bg: 'bg-agents-chronos', text: 'text-agents-chronos', border: 'border-agents-chronos/30' },
  Hermes: { bg: 'bg-agents-hermes', text: 'text-agents-hermes', border: 'border-agents-hermes/30' },
  Apollo: { bg: 'bg-agents-apollo', text: 'text-agents-apollo', border: 'border-agents-apollo/30' },
  Athena: { bg: 'bg-agents-athena', text: 'text-agents-athena', border: 'border-agents-athena/30' },
  'Nexus Core': { bg: 'bg-primary', text: 'text-primary', border: 'border-primary/30' },
  Fortuna: { bg: 'bg-warning', text: 'text-warning', border: 'border-warning/30' },
};

const AgentActivity = () => {
  const [state, setState] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAgentState(), getAgentLogs()])
      .then(([s, l]) => { setState(s); setLogs(l); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stateJson = state
    ? JSON.stringify(state, null, 2)
    : `{
  "iteration_count": 4,
  "next_agent": "apollo",
  "requires_approval": true,
  "pending_tasks": [
    { "target": "hermes", "task": "send_batch", "status": "APPROVED" },
    { "target": "fortuna", "task": "budget_review", "status": "PENDING" }
  ],
  "event_config": { "name": "TechSummit 2026", "days": 3, "venues": 4 },
  "conflicts_resolved": 2,
  "latest_trigger": "SCHEDULE_CONSTRAINT_CHANGED"
}`;

  return (
    <div className="space-y-6 h-full pb-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white drop-shadow-sm mb-2">Agent Activity Log</h2>
          <p className="text-text-secondary">Full transparency into swarm reasoning and state transitions.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-card border border-gray-700 text-white hover:bg-gray-800 rounded-lg text-sm font-medium transition-colors">
            <Download size={16} /> Export Logs
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* System State Debug Panel */}
         <div className="lg:col-span-1 border border-gray-800 bg-card rounded-xl p-5 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-200px)]">
             <h3 className="font-semibold text-white mb-4 flex items-center border-b border-gray-800 pb-3">
               <span className="text-agents-athena mr-2 font-mono">{'{ }'}</span> LangGraph State
             </h3>
             <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[10px] text-gray-400 bg-black p-4 rounded border border-gray-800">
               {loading ? (
                 <div className="animate-pulse space-y-2">
                   {[1,2,3,4,5,6].map(i => <div key={i} className="h-3 bg-gray-800 rounded" style={{width: `${50 + (i * 7)}%`}} />)}
                 </div>
               ) : (
                 <pre>{stateJson}</pre>
               )}
             </div>
         </div>

         {/* Reasoning Chain Timeline */}
         <div className="lg:col-span-2 border border-gray-800 bg-card rounded-xl shadow-sm flex flex-col h-[calc(100vh-200px)] relative">
            <div className="p-4 border-b border-gray-800 bg-gray-900/40 sticky top-0 z-10">
               <h3 className="font-semibold text-white flex items-center">
                 <GitMerge size={18} className="mr-2 text-primary" /> Reasoning Chain Visualizer
               </h3>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto relative space-y-8">
               <div className="absolute left-[39px] top-6 bottom-6 w-[2px] bg-gray-800 z-0"/>
               
               {loading ? (
                 [1,2,3].map(i => (
                   <div key={i} className="relative z-10 pl-16 animate-pulse">
                     <div className="absolute left-0 w-10 h-10 rounded-full bg-gray-700" />
                     <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                       <div className="h-3 bg-gray-700 rounded w-1/3 mb-3" />
                       <div className="h-20 bg-gray-700 rounded mb-2" />
                       <div className="h-3 bg-gray-700 rounded w-1/2" />
                     </div>
                   </div>
                 ))
               ) : (
                 logs.map(log => {
                   const colors = agentColors[log.agent] || agentColors.System;
                   return (
                     <div key={log.id} className="relative z-10 pl-16">
                       <div className={`absolute left-0 w-10 h-10 rounded-full border-4 border-card ${colors.bg} flex items-center justify-center`}>
                         {log.agent === 'System' ? (
                           <FileText size={16} className="text-gray-300" />
                         ) : log.agent === 'Nexus Core' ? (
                           <Cpu size={16} className="text-white" />
                         ) : log.agent === 'Fortuna' ? (
                           <DollarSign size={16} className="text-black" />
                         ) : (
                           <strong className="text-white text-xs">{log.agent.substring(0, 2)}</strong>
                         )}
                       </div>
                       <div className={`bg-${log.agent === 'System' ? 'gray-800/50' : colors.bg.replace('bg-', '') + '/5'} border ${colors.border} rounded-lg p-4 w-full`}>
                          <div className="flex justify-between items-center mb-2">
                             <span className={`text-xs ${colors.text} font-bold block`}>{log.timestamp} • {log.agent === 'System' ? 'Organizer Input' : `Agent ${log.agent}`}</span>
                             <span className={`text-[10px] ${colors.bg.replace('bg-', 'bg-')}/20 px-2 py-0.5 rounded ${colors.text} border ${colors.border}`}>Action: {log.action}</span>
                          </div>
                          
                          <div className="bg-background border border-gray-800 p-3 rounded text-sm text-gray-300 font-mono mb-3 shadow-inner whitespace-pre-wrap">
                            {log.reasoning}
                          </div>
                          
                          {log.cascaded_to && log.cascaded_to.length > 0 && (
                            <div className="text-xs text-gray-400 flex items-center bg-gray-800/50 p-2 rounded w-fit border border-gray-700">
                              <ArrowRight size={12} className={`mr-1 inline ${colors.text}`}/> 
                              Cascaded event to{' '}
                              {log.cascaded_to.map((a, i) => {
                                const ac = agentColors[a] || agentColors.System;
                                return (
                                  <span key={a}>
                                    <strong className={`${ac.text} mx-1`}>{a}</strong>
                                    {i < log.cascaded_to.length - 1 && ' and '}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                       </div>
                     </div>
                   );
                 })
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default AgentActivity;

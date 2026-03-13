import React, { useState } from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, Users, MapPin, AlertTriangle, 
  MessageSquare, BrainCircuit, Loader2
} from 'lucide-react';

const attendanceData = [
  { time: '10:00', actual: 450, predicted: 430 },
  { time: '11:00', actual: 520, predicted: 500 },
  { time: '12:00', actual: 580, predicted: 600 },
  { time: '13:00', actual: 610, predicted: 620 },
  { time: '14:00', actual: 590, predicted: 600 },
  { time: '15:00', actual: 640, predicted: 630 },
  { time: '16:00', actual: 680, predicted: 690 },
];

const demographicsData = [
  { name: 'Developers', value: 45 },
  { name: 'Designers', value: 25 },
  { name: 'Founders', value: 20 },
  { name: 'Investors', value: 10 },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

const AnalyticsDashboard = () => {
  const [insightQuery, setInsightQuery] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [athenaResponse, setAthenaResponse] = useState(null);

  const handleAskAthena = (e) => {
    e.preventDefault();
    if (!insightQuery.trim()) return;
    
    setIsAsking(true);
    setAthenaResponse(null);
    
    // Mock Athena Agent response
    setTimeout(() => {
      setAthenaResponse(
        "Based on current velocity, the Main Stage will exceed capacity by 15% at 4:00 PM during the keynote. I recommend opening Overflow Room B and sending a push notification to attendees."
      );
      setIsAsking(false);
      setInsightQuery('');
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between border-b border-white/[0.08] pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics & Insights</h1>
          <p className="text-sm text-slate-400 mt-1 flex items-center gap-2">
            <BrainCircuit size={16} className="text-emerald-400" />
            Powered by Athena Agent
          </p>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Registrations', value: '1,248', trend: '+12%', icon: Users, color: 'text-blue-400' },
          { label: 'Check-in Rate', value: '84%', trend: '+5%', icon: MapPin, color: 'text-emerald-400' },
          { label: 'Engagement Score', value: '92/100', trend: '+2', icon: TrendingUp, color: 'text-purple-400' },
          { label: 'Capacity Risk', value: 'High', trend: 'Keynote', icon: AlertTriangle, color: 'text-amber-400' },
        ].map((kpi, idx) => (
          <div key={idx} className="glass-card p-5 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="text-slate-400 font-medium text-sm">{kpi.label}</span>
              <div className={`p-2 rounded-lg bg-white/[0.05] ${kpi.color}`}>
                <kpi.icon size={18} />
              </div>
            </div>
            <div className="flex items-end justify-between relative z-10">
              <span className="text-2xl font-bold tracking-tight">{kpi.value}</span>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                {kpi.trend}
              </span>
            </div>
            {/* Hover Glow */}
            <div className={`absolute -bottom-8 -right-8 w-24 h-24 ${kpi.color} opacity-0 group-hover:opacity-10 blur-2xl transition-all duration-500 rounded-full`} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="glass-card p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            Live Attendance Prediction <span className="text-[10px] uppercase bg-white/10 px-2 py-0.5 rounded text-slate-400 tracking-wider">Live</span>
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="time" stroke="#ffffff40" tick={{fill: '#ffffff60', fontSize: 12}} />
                <YAxis stroke="#ffffff40" tick={{fill: '#ffffff60', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000000cc', borderColor: '#ffffff20', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#ffffff80' }} />
                <Line type="monotone" dataKey="actual" name="Actual Attendance" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#3b82f6'}} activeDot={{r: 6}} />
                <Line type="monotone" dataKey="predicted" name="Athena Prediction" stroke="#10b981" strokeWidth={3} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Demographics Pie */}
        <div className="glass-card p-6 flex flex-col">
          <h3 className="text-lg font-semibold mb-6">Audience Breakdown</h3>
          <div className="flex-1 flex items-center justify-center -mt-4">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={demographicsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {demographicsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#000000cc', borderColor: '#ffffff20', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Athena Interaction Area */}
      <div className="glass-card p-1 relative overflow-hidden rounded-2xl border border-emerald-500/20">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-blue-500/5" />
        <div className="bg-black/40 backdrop-blur-xl p-6 rounded-xl relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
              <BrainCircuit className="text-emerald-400" size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-emerald-400">Ask Athena</h3>
              <p className="text-xs text-slate-400">Deep dive into your event metrics using natural language.</p>
            </div>
          </div>

          {athenaResponse && (
            <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 animate-fade-up">
              <p className="text-sm text-emerald-100 leading-relaxed font-light">
                {athenaResponse}
              </p>
            </div>
          )}

          <form onSubmit={handleAskAthena} className="relative mt-2">
            <input
              type="text"
              value={insightQuery}
              onChange={(e) => setInsightQuery(e.target.value)}
              placeholder="e.g. Which session has the highest drop-off rate?"
              className="w-full bg-white/[0.03] border border-white/[0.1] rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-slate-500"
            />
            <button 
              type="submit" 
              disabled={isAsking || !insightQuery.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-400/10 transition-colors disabled:opacity-50"
            >
              {isAsking ? <Loader2 size={18} className="animate-spin" /> : <MessageSquare size={18} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;

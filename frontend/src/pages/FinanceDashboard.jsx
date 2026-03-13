import { useState, useEffect } from 'react';
import { getDashboard, invokeAgent } from '../services/api';
import { DollarSign, TrendingUp, Handshake, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

const FinanceDashboard = () => {
    const [financeData, setFinanceData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Mock initial state for the UI until backend populates this
    const mockData = {
        total_budget: 150000,
        spent: 45000,
        remaining: 105000,
        risks: [
            { category: 'Catering', amount_over: 5000, description: 'Premium lunch options exceeded initial quotes.' }
        ],
        sponsors: [
            { company: 'TechGlobal', target_amount: 25000, probability: 0.8, pitch: 'Position as AI thought leader.' },
            { company: 'CloudScale', target_amount: 15000, probability: 0.6, pitch: 'Highlight infrastructure scale.' }
        ],
        expenses: [
            { name: 'Venue', value: 30000 },
            { name: 'Marketing', value: 10000 },
            { name: 'Catering', value: 5000 }
        ]
    };

    const COLORS = ['#00C49F', '#FFBB28', '#FF8042', '#0088FE'];

    useEffect(() => {
        const fetchFinanceData = async () => {
            try {
                // In reality, this would read from the NexusState's finance_output
                const state = await getDashboard(); 
                if (state && state.finance_output) {
                    setFinanceData(state.finance_output);
                } else {
                    setFinanceData(mockData);
                }
            } catch (err) {
                setFinanceData(mockData);
            } finally {
                setLoading(false);
            }
        };
        fetchFinanceData();
    }, []);

    const handleCalculateSponsors = () => {
        // Triggers the LangGraph orchestrator
        invokeAgent("Calculate new sponsorship targets based on the current attendee list", "finance");
    };

    if (loading || !financeData) {
        return <div className="animate-pulse h-96 bg-white/5 rounded-xl"></div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold font-display tracking-tight text-white mb-1">Fortuna Command</h1>
                    <p className="text-text-secondary text-sm">Autonomous Budgeting & Sponsorship Intelligence</p>
                </div>
                <button 
                    onClick={handleCalculateSponsors}
                    className="flex items-center gap-2 bg-text-warning/20 border border-text-warning/30 text-text-warning px-4 py-2 rounded-lg hover:bg-text-warning/30 transition-colors text-sm font-semibold"
                >
                    <Handshake size={16} /> Generate Pitch Targets
                </button>
            </div>

            {/* Top KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-5 border-l-4 border-success">
                    <div className="flex items-center gap-2 text-text-secondary mb-2">
                        <DollarSign size={16} />
                        <span className="text-xs font-semibold uppercase tracking-wider">Total Budget</span>
                    </div>
                    <div className="text-3xl font-bold text-white">${financeData.total_budget.toLocaleString()}</div>
                </div>
                <div className="glass-card p-5 border-l-4 border-warning">
                    <div className="flex items-center gap-2 text-text-secondary mb-2">
                        <TrendingUp size={16} />
                        <span className="text-xs font-semibold uppercase tracking-wider">Spent</span>
                    </div>
                    <div className="text-3xl font-bold text-white">${financeData.spent.toLocaleString()}</div>
                </div>
                <div className="glass-card p-5 border-l-4 border-primary">
                    <div className="flex items-center gap-2 text-text-secondary mb-2">
                        <DollarSign size={16} />
                        <span className="text-xs font-semibold uppercase tracking-wider">Remaining</span>
                    </div>
                    <div className="text-3xl font-bold text-white">${financeData.remaining.toLocaleString()}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Budget Breakdown Chart */}
                <div className="glass-card p-5 lg:col-span-1 border border-white/5">
                    <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Expense Breakdown</h3>
                    <div className="h-64">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={financeData.expenses}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {financeData.expenses.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip 
                                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* AI Sponsorship Targets */}
                <div className="glass-card p-5 lg:col-span-2 border border-white/5 flex flex-col">
                    <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Autonomous Sponsor Targets</h3>
                    <div className="flex-1 overflow-auto pr-2">
                        <div className="space-y-3">
                            {financeData.sponsors.map((sponsor, idx) => (
                                <div key={idx} className="bg-black/40 border border-white/5 rounded-lg p-4 hover:border-text-warning/30 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-white">{sponsor.company}</h4>
                                        <span className="text-success font-mono font-semibold">${sponsor.target_amount.toLocaleString()}</span>
                                    </div>
                                    <p className="text-sm text-gray-400 mb-3">{sponsor.pitch}</p>
                                    <div className="w-full bg-gray-800 rounded-full h-1.5">
                                        <div 
                                            className="bg-text-warning h-1.5 rounded-full" 
                                            style={{ width: `${sponsor.probability * 100}%` }}
                                        ></div>
                                    </div>
                                    <div className="text-right text-[10px] text-gray-500 mt-1 uppercase font-semibold">
                                        Match Probability: {(sponsor.probability * 100).toFixed(0)}%
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Budget Risks */}
            {financeData.risks && financeData.risks.length > 0 && (
                <div className="glass-card p-5 border border-error/30 bg-error/5">
                     <h3 className="text-sm font-bold text-error mb-4 flex items-center gap-2 uppercase tracking-wider">
                         <AlertCircle size={16} /> Financial Risks Detected
                     </h3>
                     <div className="space-y-2">
                         {financeData.risks.map((risk, idx) => (
                             <div key={idx} className="flex items-start justify-between bg-black/40 p-3 rounded">
                                 <div>
                                     <span className="text-white font-semibold text-sm block mb-1">{risk.category}</span>
                                     <span className="text-gray-400 text-xs">{risk.description}</span>
                                 </div>
                                 <span className="text-error font-mono text-sm">+${risk.amount_over.toLocaleString()}</span>
                             </div>
                         ))}
                     </div>
                </div>
            )}
        </div>
    );
};

export default FinanceDashboard;

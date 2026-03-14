import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    Calendar,
    LayoutDashboard,
    Activity,
    ChevronLeft,
    Menu,
    LogOut,
    User,
    Briefcase,
    BrainCircuit
} from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { getAgentStatus } from '../../services/api';

const Sidebar = ({ isOpen, toggleSidebar }) => {
    const navigate = useNavigate();

    const FaPlusIcon = ({ size }) => (
        <FontAwesomeIcon icon={faPlus} style={{ fontSize: size }} />
    );

    const navItems = [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/dashboard/newEvent', icon: FaPlusIcon, label: 'New Event' },
        { path: '/dashboard/schedule', icon: Calendar, label: 'Schedule' },
        { path: '/dashboard/finance', icon: Briefcase, label: 'Finance' },
        { path: '/dashboard/athena', icon: BrainCircuit, label: 'Analytics' },
        { path: '/dashboard/activity', icon: Activity, label: 'Agent Activity' },
    ];

    const handleLogout = () => {
        localStorage.removeItem('isLoggedIn');
        navigate('/');
    };

    const [agentStatus, setAgentStatus] = useState([
        { name: 'Chronos', role: 'Scheduler', status: 'idle', color: 'text-blue-400', bg: 'bg-blue-400', indicator: 'bg-blue-400 opacity-40', statusLabel: 'Idle' },
        { name: 'Hermes', role: 'Mailer', status: 'idle', color: 'text-purple-400', bg: 'bg-purple-400', indicator: 'bg-purple-400 opacity-40', statusLabel: 'Idle' },
        { name: 'Apollo', role: 'Content', status: 'idle', color: 'text-orange-400', bg: 'bg-orange-400', indicator: 'bg-orange-400 opacity-40', statusLabel: 'Idle' },
        { name: 'Athena', role: 'Analytics', status: 'idle', color: 'text-emerald-400', bg: 'bg-emerald-400', indicator: 'bg-emerald-400 opacity-40', statusLabel: 'Idle' },
        { name: 'Fortuna', role: 'Budget', status: 'idle', color: 'text-warning', bg: 'bg-warning', indicator: 'bg-warning opacity-40', statusLabel: 'Idle' },
    ]);

    useEffect(() => {
        const fetchStatus = () => {
            getAgentStatus()
                .then(data => {
                    if (data?.status === 'success' && data.agents) {
                        setAgentStatus(prev => prev.map(a => {
                            const backendName = a.name === 'Nexus Core' ? 'system' : a.name.toLowerCase();
                            const backendAgent = data.agents[backendName] || { status: 'idle' };
                            const activeStatus = backendAgent.status || 'idle';

                            const themeMap = {
                                Chronos: { color: 'text-blue-400', bg: 'bg-blue-400' },
                                Hermes: { color: 'text-purple-400', bg: 'bg-purple-400' },
                                Apollo: { color: 'text-orange-400', bg: 'bg-orange-400' },
                                Athena: { color: 'text-emerald-400', bg: 'bg-emerald-400' },
                                'Nexus Core': { color: 'text-primary', bg: 'bg-primary' },
                                Fortuna: { color: 'text-warning', bg: 'bg-warning' },
                            };

                            const theme = themeMap[a.name] || { color: 'text-gray-400', bg: 'bg-gray-400' };

                            const stateStyles = {
                                working: `animate-pulse ${theme.bg} shadow-[0_0_8px_rgba(255,255,255,0.8)]`,
                                idle: `${theme.bg} opacity-40`,
                                observing: `${theme.bg} opacity-100 shadow-lg`,
                                planning: `animate-bounce ${theme.bg} scale-110`,
                            };

                            return {
                                ...a,
                                status: activeStatus,
                                statusLabel: activeStatus.charAt(0).toUpperCase() + activeStatus.slice(1),
                                color: theme.color,
                                bg: theme.bg,
                                indicator: stateStyles[activeStatus] || stateStyles.idle
                            };
                        }));
                    }
                })
                .catch(() => { });
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <aside className={`border-r border-white/10 bg-white/[0.02] backdrop-blur-xl h-full flex flex-col transition-all duration-300 ease-in-out z-50 ${isOpen ? 'w-64' : 'w-[70px]'}`}>

            {/* Header */}
            <div className={`p-6 flex items-center ${isOpen ? 'justify-between' : 'justify-center'} h-24`}>
                {isOpen && (
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-black text-white tracking-tighter">NEXUS</h1>
                    </div>
                )}
                <button
                    onClick={toggleSidebar}
                    className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all"
                >
                    {isOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 space-y-2 mt-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === "/dashboard"}
                            className={({ isActive }) => `flex items-center rounded-xl transition-all duration-200 group ${
                                isActive
                                    ? 'text-white border border-white/10'
                                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                            } ${isOpen ? 'px-4 py-3 space-x-4' : 'px-0 py-4 justify-center'}`}
                            style={({ isActive }) => isActive ? { backgroundColor: '#2a2a2a' } : {}}
                        >
                            <Icon size={20} className="transition-transform group-hover:scale-110" />
                            {isOpen && <span className="font-semibold text-sm">{item.label}</span>}
                        </NavLink>
                    );
                })}
            </nav>

            {/* Agent Status */}
            <div className={`p-4 mx-3 mb-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] transition-all ${!isOpen ? 'opacity-0 h-0 p-0 overflow-hidden' : 'opacity-100'}`}>
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 px-1">
                    Swarm Status
                </h3>
                <div className="space-y-4">
                    {agentStatus.map(agent => (
                        <div key={agent.name} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="relative flex h-2 w-2">
                                    {(agent.status === 'working' || agent.status === 'planning') && (
                                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${agent.bg || 'bg-gray-400'} opacity-75`} />
                                    )}
                                    <span className={`relative inline-flex rounded-full h-2 w-2 ${agent.indicator || 'bg-gray-400 opacity-40'} transition-all duration-500`} />
                                </div>
                                <div className="flex flex-col">
                                    <span className={`text-xs font-bold ${agent.color}`}>
                                        {agent.name}
                                    </span>
                                    <span className="text-[10px] text-slate-500 leading-none mt-1 flex items-center">
                                        {agent.statusLabel || agent.status}
                                        {(agent.status === 'working' || agent.status === 'planning') && (
                                            <span className="ml-1 animate-pulse">...</span>
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-white/10 space-y-2">
                <NavLink
                    to="/dashboard/Profile"
                    className={({ isActive }) => `flex items-center rounded-xl transition-all duration-200 group ${
                        isActive
                            ? 'text-white border border-white/10'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    } ${isOpen ? 'px-4 py-3 space-x-4' : 'px-0 py-4 justify-center'}`}
                    style={({ isActive }) => isActive ? { backgroundColor: '#2a2a2a' } : {}}
                >
                    <User size={20} className="transition-transform group-hover:scale-110" />
                    {isOpen && <span className="text-sm font-medium">Profile</span>}
                </NavLink>

                <button
                    onClick={handleLogout}
                    className={`flex items-center text-red-400/80 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all w-full ${isOpen ? 'px-4 py-3 space-x-4' : 'py-4 justify-center'}`}
                >
                    <LogOut size={20} />
                    {isOpen && <span className="text-sm font-medium">Logout</span>}
                </button>
            </div>

        </aside>
    );
};

export default Sidebar;
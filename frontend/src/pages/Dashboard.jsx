import EventOverview from '../components/dashboard/EventOverview';
import QuickInsights from '../components/dashboard/QuickInsights';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import PendingApprovals from '../components/dashboard/PendingApprovals';

const Dashboard = () => (
  <div className="space-y-6 h-full pb-8">
    <div className="flex justify-between items-end">
      <h2 className="text-3xl font-bold tracking-tight text-white drop-shadow-sm">Dashboard Overview</h2>
      <div className="text-sm text-text-secondary glass-card border-white/10 px-3 py-1.5 rounded-md flex items-center gap-2 shadow-inner shadow-black/20">
        <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
        <span>Live Mode: <span className="text-success font-medium">Connected</span></span>
      </div>
    </div>
    
    <EventOverview />
    
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
         <ActivityFeed />
      </div>
      <div className="space-y-6">
         <PendingApprovals />
         <QuickInsights />
      </div>
    </div>
  </div>
);

export default Dashboard;

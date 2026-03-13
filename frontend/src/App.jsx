import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Loading from './components/layout/Loading';
import NotFound from './pages/NotFound';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/layout/ProtectedRoute';
import NewEvent from './pages/newEvent';
// import PastEvents from './pages/pastEvents'
import Profile from './pages/profile'

// Lazy loaded pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Schedule = lazy(() => import('./components/schedule/ScheduleView'));
const MailCenter = lazy(() => import('./components/mail/MailCenter'));
const ContentStudio = lazy(() => import('./components/content/ContentStudio'));
const Activity = lazy(() => import('./components/activity/AgentActivity'));
const ApprovalsHub = lazy(() => import('./pages/ApprovalsHub')); 
const FinanceDashboard = lazy(() => import('./pages/FinanceDashboard')); // NEW ROUTE

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Dashboard Routes */}
        <Route 
          path="/dashboard/*" 
          element={
            <ProtectedRoute>
              <Layout>
                <Suspense fallback={<Loading />}>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="schedule" element={<Schedule />} />
                    <Route path="mail" element={<MailCenter />} />
                    <Route path="content" element={<ContentStudio />} />
                    <Route path="activity" element={<Activity />} />
                    <Route path="approvals" element={<ApprovalsHub />} /> 
                    <Route path="finance" element={<FinanceDashboard />} /> 
                    <Route path="newEvent" element={<NewEvent />} />
                    <Route path="Profile" element={<Profile />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </Layout>
            </ProtectedRoute>
          } 
        />

        {/* Catch-all 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;

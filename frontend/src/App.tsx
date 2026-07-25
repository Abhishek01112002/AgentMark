import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

const LandingPage = React.lazy(() => import('./components/pages/landingPage/LandingPage'));
const Login = React.lazy(() => import('./components/pages/login/Login'));
const Signup = React.lazy(() => import('./components/pages/signup/Signup'));
const DashboardPage = React.lazy(() => import('./components/pages/dashboard/DashboardPage'));
const ProjectsPage = React.lazy(() => import('./components/pages/projects/ProjectsPage'));
const ProjectDetailPage = React.lazy(() => import('./components/pages/projects/ProjectDetailPage'));
const NewCampaignPage = React.lazy(() => import('./components/pages/campaign/newCampaign/NewCampaignPage'));
const CampaignLivePage = React.lazy(() => import('./components/pages/campaign/newCampaign/campaignLive/CampaignLivePage'));
const CampaignResultPage = React.lazy(() => import('./components/pages/campaign/newCampaign/campaignLive/campaignResult/CampaignResultPage'));
const CampaignHistoryPage = React.lazy(() => import('./components/pages/history/CampaignHistoryPage'));
const MemoryHubPage = React.lazy(() => import('./components/pages/memoryHub/MemoryHubPage'));
const Settings = React.lazy(() => import('./components/pages/settings/Settings'));
const Support = React.lazy(() => import('./components/pages/support/Support'));
const DocsPage = React.lazy(() => import('./components/pages/docs/DocsPage'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest">
    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return <PageLoader />;
  }
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

const PublicRoute: React.FC<{ children: React.ReactNode; allowLoggedIn?: boolean }> = ({ children, allowLoggedIn = false }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return <PageLoader />;
  }
  return user && !allowLoggedIn ? <Navigate to="/dashboard" replace /> : <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route
          path="/"
          element={
            <PublicRoute allowLoggedIn>
              <LandingPage />
            </PublicRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <ProjectsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <ProtectedRoute>
              <ProjectDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaign/new"
          element={
            <ProtectedRoute>
              <NewCampaignPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaign/:campaignId/live"
          element={
            <ProtectedRoute>
              <CampaignLivePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaign/:campaignId/result"
          element={
            <ProtectedRoute>
              <CampaignResultPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <CampaignHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:projectId/memory"
          element={
            <ProtectedRoute>
              <MemoryHubPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/support"
          element={
            <ProtectedRoute>
              <Support />
            </ProtectedRoute>
          }
        />
        <Route
          path="/docs"
          element={<DocsPage />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default App;

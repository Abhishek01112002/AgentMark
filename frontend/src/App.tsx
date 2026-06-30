import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LandingPage from './components/pages/landingPage/LandingPage';
import Login from './components/pages/login/Login';
import Signup from './components/pages/signup/Signup';
import DashboardPage from './components/pages/dashboard/DashboardPage';
import ProjectsPage from './components/pages/projects/ProjectsPage';
import ProjectDetailPage from './components/pages/projects/ProjectDetailPage';
import NewCampaignPage from './components/pages/campaign/newCampaign/NewCampaignPage';
import CampaignLivePage from './components/pages/campaign/newCampaign/campaignLive/CampaignLivePage';
import CampaignResultPage from './components/pages/campaign/newCampaign/campaignLive/campaignResult/CampaignResultPage';
import CampaignHistoryPage from './components/pages/history/CampaignHistoryPage';
import MemoryHubPage from './components/pages/memoryHub/MemoryHubPage';
import Settings from './components/pages/settings/Settings';
import Support from './components/pages/support/Support';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

const PublicRoute: React.FC<{ children: React.ReactNode; allowLoggedIn?: boolean }> = ({ children, allowLoggedIn = false }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return user && !allowLoggedIn ? <Navigate to="/dashboard" replace /> : <>{children}</>;
};

const App: React.FC = () => {
  return (
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;

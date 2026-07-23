import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { api } from '../services/api';
import { Lock } from 'lucide-react';

// Pages
import LandingPage from '../pages/LandingPage';
import Login from '../pages/Login';
import Register from '../pages/Register';
import VerifyOtp from '../pages/VerifyOtp';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import ChatDashboard from '../pages/ChatDashboard';
import AdminDashboard from '../pages/AdminDashboard';
import NotFound from '../pages/NotFound';

interface GuardProps {
  children: React.ReactNode;
}

// Private Route Guard
const PrivateRoute: React.FC<GuardProps> = ({ children }) => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Admin Route Guard
const AdminRoute: React.FC<GuardProps> = ({ children }) => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  return isAuthenticated && user?.isAdmin ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

// Auth Route Guard (Redirects to dashboard if already logged in)
const AuthRoute: React.FC<GuardProps> = ({ children }) => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [isMaintenanceActive, setIsMaintenanceActive] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    'We are currently running scheduled updates to VChats. The application will return online shortly. Thank you for your patience!'
  );

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const res = await api.get('/admin/config/public');
        if (res.data && res.data.config) {
          const { appName, accentColor, showAds, adImageUrl, adTargetUrl, adText, maintenanceMode, maintenanceMessage } = res.data.config;
          
          setIsMaintenanceActive(!!maintenanceMode);
          if (maintenanceMessage) {
            setMaintenanceMessage(maintenanceMessage);
          }

          if (appName) {
            document.title = appName;
            localStorage.setItem('appName', appName);
          }

          if (accentColor) {
            document.documentElement.style.setProperty('--color-brand-teal', accentColor);
            document.documentElement.style.setProperty('--color-brand-teal-light', accentColor + 'dd');
            document.documentElement.style.setProperty('--color-brand-teal-dark', accentColor);
            localStorage.setItem('accentColor', accentColor);
          }

          localStorage.setItem('showAds', showAds ? 'true' : 'false');
          localStorage.setItem('adImageUrl', adImageUrl || '');
          localStorage.setItem('adTargetUrl', adTargetUrl || '');
          localStorage.setItem('adText', adText || '');
        }
      } catch (err) {
        console.error('Failed to load branding configurations:', err);
      }
    };

    fetchBranding();
  }, []);

  const isLoginPage = window.location.pathname === '/login';
  if (isMaintenanceActive && !user?.isAdmin && !isLoginPage) {
    return (
      <div className="bg-obsidian min-h-screen flex items-center justify-center p-6 text-gray-200 font-sans select-none">
        <div className="max-w-md w-full glass-card p-8 rounded-3xl border border-gray-900 text-center flex flex-col items-center">
          <div className="p-4 rounded-full bg-brandViolet/10 border border-brandViolet/25 mb-6 text-brandViolet animate-pulse">
            <Lock className="w-12 h-12" />
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-3">System Maintenance</h1>
          <p className="text-xs text-gray-400 leading-relaxed mb-6 whitespace-pre-line">
            {maintenanceMessage}
          </p>
          
          <div className="w-full h-[1px] bg-gray-900 mb-6" />

          <button
            onClick={() => window.location.href = '/login'}
            className="text-xs text-brandTeal hover:underline font-bold animate-pulse"
          >
            Administrator Login &rarr;
          </button>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />

      {/* Auth Guarded Pages */}
      <Route
        path="/login"
        element={
          <AuthRoute>
            <Login />
          </AuthRoute>
        }
      />
      <Route
        path="/register"
        element={
          <AuthRoute>
            <Register />
          </AuthRoute>
        }
      />
      <Route path="/verify-otp" element={<VerifyOtp />} />
      <Route
        path="/forgot-password"
        element={
          <AuthRoute>
            <ForgotPassword />
          </AuthRoute>
        }
      />
      <Route
        path="/reset-password"
        element={
          <AuthRoute>
            <ResetPassword />
          </AuthRoute>
        }
      />

      {/* Private Application Dashboard */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <ChatDashboard />
          </PrivateRoute>
        }
      />

      {/* Admin Dashboard */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />

      {/* Catch-all 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

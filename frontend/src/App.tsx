import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import RoleRoute from './components/Auth/RoleRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DevicesPage from './pages/DevicesPage';
import DeviceDetailPage from './pages/DeviceDetailPage';
import MerchantsPage from './pages/MerchantsPage';
import MerchantDetailPage from './pages/MerchantDetailPage';
import TransactionsPage from './pages/TransactionsPage';
import TransactionDetailPage from './pages/TransactionDetailPage';
import AnalyticsPage from './pages/AnalyticsPage';
import FlaggedPage from './pages/FlaggedPage';
import AnomalyAlertDetailPage from './pages/AnomalyAlertDetailPage';
import MapPage from './pages/MapPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import LandingPage from './pages/public/LandingPage';
import ForMerchantsPage from './pages/public/ForMerchantsPage';
import ForRegulatorsPage from './pages/public/ForRegulatorsPage';
import HowItWorksPage from './pages/public/HowItWorksPage';
import TrustPage from './pages/public/TrustPage';
import PrivacyPage from './pages/public/PrivacyPage';
import Layout from './components/Layout/Layout';

/**
 * `/` serves two audiences. A signed-out visitor gets the marketing
 * landing page; a signed-in operator gets their dashboard rather than a
 * sales pitch for a product they already use.
 */
const RootRoute: React.FC = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />;
};

// Route-level access mirrors the portal-requirements matrix — see
// Sidebar.tsx's `navigation` array (nav visibility) and changelog.md
// (the underlying rationale per role).
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public, unauthenticated surface. These sit outside
              ProtectedRoute so a shared link works for someone who has no
              account — which is the whole point of a demo link. */}
          <Route path="/" element={<RootRoute />} />
          <Route path="/for-merchants" element={<ForMerchantsPage />} />
          <Route path="/for-regulators" element={<ForRegulatorsPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/trust" element={<TrustPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          {/* The demo merged into How it works — the interactive piece now
              lives at its "Hear it for yourself" section. A shared /demo
              link should land on that section, not the page top. */}
          <Route path="/demo" element={<Navigate to="/how-it-works#run-it" replace />} />

          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/settings" element={<SettingsPage />} />

              <Route element={<RoleRoute allow={['merchant', 'admin']} />}>
                <Route path="/devices" element={<DevicesPage />} />
                <Route path="/devices/:id" element={<DeviceDetailPage />} />
                <Route path="/transactions" element={<TransactionsPage />} />
                <Route path="/transactions/:id" element={<TransactionDetailPage />} />
                <Route path="/flagged" element={<FlaggedPage />} />
                <Route path="/flagged/:id" element={<AnomalyAlertDetailPage />} />
              </Route>

              <Route element={<RoleRoute allow={['regulator', 'admin']} />}>
                <Route path="/merchants" element={<MerchantsPage />} />
                <Route path="/map" element={<MapPage />} />
                <Route path="/reports" element={<ReportsPage />} />
              </Route>

              {/* Merchant detail is reachable by admin/regulator (full/read-only)
                  and by a merchant viewing their own profile (component-level
                  guard inside MerchantDetailPage, since the :id param isn't
                  known at route-declaration time). */}
              <Route path="/merchants/:id" element={<MerchantDetailPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

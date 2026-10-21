import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/layout/Navbar'; 
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Home from './pages/Home';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import VehicleDetailsPage from './pages/VehicleDetailsPage';
import VehiclesPage from './pages/VehiclesPage';
import NotFound from './pages/NotFound'; 
import MyReservationPage from './pages/MyReservationPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import AboutPage from './pages/AboutPage';
import AdminPage from './pages/AdminPage';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import CookieConsent from './components/layout/CookieConsent';
import { hasAnalyticsConsent, trackPageView } from './services/analytics';

const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  const isAdmin = user?.user?.role === 'ADMIN' || user?.role === 'ADMIN';

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  
  return children;
};

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    if (hasAnalyticsConsent()) {
      trackPageView(pathname + window.location.search);
    }
  }, [pathname]);
  return null;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop /> 
        <Toaster position="top-center" toastOptions={{
            style: { background: 'var(--theme-surface-raised)', color: 'var(--theme-text)', border: '1px solid var(--theme-border)' },
            success: { iconTheme: { primary: '#ff4d00', secondary: '#fff' } }
        }} />
        
        <Navbar />
        
        <CookieConsent />

        <main style={{ minHeight: '80vh' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/vehicles" element={<VehiclesPage />}/>
            <Route path="/vehicle/:id" element={<VehicleDetailsPage />}/>
            
            {/* User Routes */}
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/reservations" element={<ProtectedRoute><MyReservationPage /></ProtectedRoute>} />  
            
            {/* Admin Route */}
            <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        
        <Footer />
      </Router>
    </AuthProvider>
  );
}

export default App;

import { useState } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import ProfileModal from './components/ProfileModal';
import Home from './pages/Home';
import FoodTracker from './pages/FoodTracker';
import EmergencyCare from './pages/EmergencyCare';
import MedicineManager from './pages/MedicineManager';
import AuthPage from './pages/AuthPage';
import './App.css';

function AppShell() {
  const { profile } = useApp();
  const [showProfile, setShowProfile] = useState(!profile);

  return (
    <>
      {showProfile && (
        <ProfileModal onClose={profile ? () => setShowProfile(false) : null} />
      )}
      <div className="app-shell">
        <Sidebar onProfileClick={() => setShowProfile(true)} />
        <main className="main-area">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/food" element={<FoodTracker />} />
            <Route path="/emergency" element={<EmergencyCare />} />
            <Route path="/medicines" element={<MedicineManager />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </>
  );
}

function ProtectedApp() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/signup" element={<AuthPage mode="signup" />} />
      <Route path="/*" element={<ProtectedApp />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  );
}

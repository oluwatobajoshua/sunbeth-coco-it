import React from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';
import AuthNavigator from './components/AuthNavigator';
import EnvWarning from './components/EnvWarning';
import { useAuth } from './hooks/useAuth';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';
import ReportIssue from './pages/ReportIssue';
import Issues from './pages/Issues';
import Admin from './pages/Admin';
import './styles.css';
import { DemoDataProvider } from './demo/DemoDataContext';
import { ensureSeededAll } from './services/optionsService';

function App() {
  // Access auth to ensure providers initialize; values aren't needed here anymore
  useAuth();

  // Attempt to seed lookup data and options once at startup (no-op for non-admins)
  React.useEffect(() => {
    (async () => {
      try { await ensureSeededAll(); } catch (_) { /* ignore */ }
    })();
  }, []);

  // Always render the router. Auth-gated areas handle their own permissions and UI.

  return (
    <DemoDataProvider>
      <BrowserRouter>
        <div className="App">
          <Header />
          <main className="main-container">
            <EnvWarning />
            <AuthNavigator />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />} />
              <Route path="/report" element={<ProtectedRoute element={<ReportIssue />} />} />
              <Route path="/issues" element={<ProtectedRoute element={<Issues />} />} />
              <Route path="/admin" element={<ProtectedRoute element={<Admin />} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--card)',
                color: 'var(--gray-700)',
                borderRadius: 'var(--radius)',
                border: 'var(--border)',
                boxShadow: 'var(--shadow)'
              }
            }}
          />
        </div>
      </BrowserRouter>
    </DemoDataProvider>
  );
}

export default App;
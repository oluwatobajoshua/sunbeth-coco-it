import React from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import EnvWarning from './components/EnvWarning';
import { useAuth } from './hooks/useAuth';
import Dashboard from './pages/Dashboard';
import ReportIssue from './pages/ReportIssue';
import Issues from './pages/Issues';
import Admin from './pages/Admin';
import './styles.css';
import { DemoDataProvider } from './demo/DemoDataContext';

function App() {
  const { isAuthenticated, login } = useAuth();

  if (!isAuthenticated) {
    return (
      <DemoDataProvider>
        <div className="App">
          <Header />
          <main className="main-container">
            <EnvWarning />
            <div className="container">
              <section className="welcome-section">
                <h1 className="welcome-title">COCO Station Issue Tracker</h1>
                <p className="welcome-subtitle">
                  Streamlined issue reporting and tracking for Sunbeth Energies COCO fuel stations
                </p>
                <button 
                  className="btn btn-primary"
                  onClick={login}
                >
                  Sign In with Microsoft
                </button>
              </section>
            </div>
          </main>
          <Toaster position="top-right" />
        </div>
      </DemoDataProvider>
    );
  }

  return (
    <DemoDataProvider>
      <BrowserRouter>
        <div className="App">
          <Header />
          <main className="main-container">
            <EnvWarning />
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/report" element={<ReportIssue />} />
              <Route path="/issues" element={<Issues />} />
              <Route path="/admin" element={<Admin />} />
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
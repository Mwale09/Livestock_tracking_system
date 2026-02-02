import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
// WebSocket will be handled by Django Channels

// Components
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Animals from './pages/Animals';
import AnimalDetail from './pages/AnimalDetail';
import Map from './pages/Map';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Account from './pages/Account';

// Context
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Services
import { api } from './services/api';

// WebSocket connection will be handled by Django Channels

function AppContent() {
  const { user, loading } = useAuth();
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    console.log('AppContent - User state changed:', { user, loading });
    setSocketConnected(true);
  }, [user, loading]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="App">
        <main>
          <Routes>
            <Route path="/*" element={<Login />} />
          </Routes>
        </main>
        <Toaster position="top-right" />
      </div>
    );
  }

  return (
    <SocketProvider value={null}>
      <div className="App">
        <Navbar socketConnected={socketConnected} />
        <main style={{ paddingTop: '80px' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/animals" element={<Animals />} />
            <Route path="/animals/:id" element={<AnimalDetail />} />
            <Route path="/map" element={<Map />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/account" element={<Account />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Toaster position="top-right" />
      </div>
    </SocketProvider>
  );
}

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;


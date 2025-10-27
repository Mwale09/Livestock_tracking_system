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

// Context
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';

// Services
import { api } from './services/api';

// WebSocket connection will be handled by Django Channels

function AppContent() {
  const { user, loading } = useAuth();
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    console.log('AppContent - User state changed:', { user, loading });
    // WebSocket connection will be handled by Django Channels
    setSocketConnected(true); // For now, assume connected
  }, [user, loading]);

  console.log('AppContent render - User:', user, 'Loading:', loading);

  if (loading) {
    console.log('AppContent - Showing loading spinner');
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    console.log('AppContent - Showing login page');
    return <Login />;
  }

  console.log('AppContent - Showing main app for user:', user.username);
  return (
    <SocketProvider value={null}>
      <Router>
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
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Toaster position="top-right" />
        </div>
      </Router>
    </SocketProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;


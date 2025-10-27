import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, MapPin, Home, Users, Settings, LogOut, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';

const Navbar = ({ socketConnected }) => {
  const { user, logout } = useAuth();
  const { lastLocationUpdate } = useSocket();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/animals', icon: Users, label: 'Animals' },
    { path: '/map', icon: MapPin, label: 'Map' },
    { path: '/notifications', icon: Bell, label: 'Notifications' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <nav className="navbar" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      backgroundColor: '#fff',
      borderBottom: '1px solid #e9ecef',
      padding: '0 20px',
      height: '80px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <div className="navbar-brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <h3 style={{ margin: 0, color: '#007bff' }}>Livestock Tracker</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {socketConnected ? (
            <Wifi size={16} className="status-online" />
          ) : (
            <WifiOff size={16} className="status-offline" />
          )}
          <span style={{ fontSize: '12px', color: socketConnected ? '#28a745' : '#dc3545' }}>
            {socketConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="navbar-nav" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '4px',
                textDecoration: 'none',
                color: isActive ? '#007bff' : '#6c757d',
                backgroundColor: isActive ? '#f8f9fa' : 'transparent',
                transition: 'all 0.2s ease'
              }}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '14px', color: '#6c757d' }}>
            Welcome, {user?.username || 'User'}
          </span>
          <button
            onClick={handleLogout}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;







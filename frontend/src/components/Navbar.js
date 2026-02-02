import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, MapPin, Home, CircleDot, Settings, LogOut, Wifi, WifiOff, User, Moon, Sun, ChevronRight, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useTheme } from '../contexts/ThemeContext';

const Navbar = ({ socketConnected }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    await logout();
  };

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/animals', icon: CircleDot, label: 'Livestock' },
    { path: '/map', icon: MapPin, label: 'Map' },
    { path: '/notifications', icon: Bell, label: 'Notifications' },
  ];

  const MobileMenu = () => (
    <div className={`mobile-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
      {/* User Info Section */}
      <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{
            width: '48px', height: '48px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', fontWeight: 'bold'
          }}>
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <div style={{ fontWeight: '600', fontSize: '18px' }}>{user?.username || 'User'}</div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{user?.email}</div>
          </div>
        </div>
      </div>

      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={20} />
            {item.label}
          </Link>
        );
      })}

      <Link to="/account" className="mobile-nav-item">
        <User size={20} />
        Account Info
      </Link>

      <Link to="/settings" className="mobile-nav-item">
        <Settings size={20} />
        Settings
      </Link>

      <div style={{ margin: '20px 0', height: '1px', backgroundColor: 'var(--border-color)' }}></div>

      <button onClick={toggleTheme} className="mobile-nav-item" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}>
        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        {theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
      </button>

      <button onClick={handleLogout} className="mobile-nav-item" style={{ width: '100%', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
        <LogOut size={20} />
        Sign Out
      </button>
    </div>
  );

  return (
    <>
      <nav className="navbar" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        const isActive = location

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
        zIndex: 1000,
        backgroundColor: theme === 'dark' ? '#0f141b' : '#fff',
        borderBottom: `1px solid ${theme === 'dark' ? '#1b2330' : '#e9ecef'}`,
        transition: 'all 0.3s ease',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 20px',
        height: '60px'
      }}>
        <div className="navbar-brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3 style={{ margin: 0, color: '#2563eb', fontSize: '1.25rem' }}>Livestock Tracking System</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            {socketConnected ? (
              <Wifi size={16} className="status-online" />
            ) : (
              <WifiOff size={16} className="status-offline" />
            )}
            <span className="desktop-only" style={{ fontSize: '12px', color: socketConnected ? '#22c55e' : '#ef4444', fontWeight: '500' }}>
              {socketConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="navbar-nav desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Navigation Links (Desktop) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginRight: '20px' }}>
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
                    borderRadius: '8px',
                    textDecoration: 'none',
                    color: isActive ? '#2563eb' : (theme === 'dark' ? '#94a3b8' : '#64748b'),
                    backgroundColor: isActive ? (theme === 'dark' ? 'rgba(37, 99, 235, 0.1)' : '#eff6ff') : 'transparent',
                    fontWeight: isActive ? '500' : 'normal',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* User Dropdown / Drawer (Desktop) */}
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '20px',
                transition: 'background-color 0.2s'
              }}
            >
              <div style={{
                width: '36px', height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', fontWeight: 'bold',
                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
              }}>
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
            </button>

            {/* Custom Animated Dropdown */}
            <div className={`custom-dropdown-menu ${isDropdownOpen ? 'show' : ''}`}>
              <div style={{ padding: '8px 16px', marginBottom: '8px' }}>
                <div style={{ fontWeight: '600', color: theme === 'dark' ? '#f8fafc' : '#1e293b' }}>
                  {user?.username || 'User'}
                </div>
                <div style={{ fontSize: '12px', color: theme === 'dark' ? '#94a3b8' : '#64748b' }}>
                  {user?.email || 'user@example.com'}
                </div>
              </div>

              <div className="dropdown-divider"></div>

              <Link
                to="/account"
                className="dropdown-item-custom"
                onClick={() => setIsDropdownOpen(false)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <User size={18} className="text-muted" />
                  <span>Account Info</span>
                </div>
                <ChevronRight size={16} className="text-muted" />
              </Link>

              <Link
                to="/settings"
                className="dropdown-item-custom"
                onClick={() => setIsDropdownOpen(false)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Settings size={18} className="text-muted" />
                  <span>Settings</span>
                </div>
                <ChevronRight size={16} className="text-muted" />
              </Link>

              <div className="dropdown-divider"></div>

              <button
                className="dropdown-item-custom"
                onClick={toggleTheme}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {theme === 'light' ? <Moon size={18} className="text-muted" /> : <Sun size={18} className="text-muted" />}
                  <span>Dark Mode</span>
                </div>
                {/* Toggle Switch Visual */}
                <div style={{
                  width: '36px', height: '20px',
                  backgroundColor: theme === 'dark' ? '#2563eb' : '#cbd5e1',
                  borderRadius: '20px',
                  position: 'relative',
                  transition: 'background-color 0.2s'
                }}>
                  <div style={{
                    width: '16px', height: '16px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '2px',
                    left: theme === 'dark' ? '18px' : '2px',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                  }}></div>
                </div>
              </button>

              <div className="dropdown-divider"></div>

              <button
                className="dropdown-item-custom text-danger"
                onClick={handleLogout}
                style={{ color: '#ef4444' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <LogOut size={18} />
                  <span>Sign Out</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Toggle (Right Side) */}
        <button
          className="mobile-only"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', marginLeft: 'auto' }}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>
      <MobileMenu />
    </>
  );
};

export default Navbar;

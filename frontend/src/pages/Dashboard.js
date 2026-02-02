import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, CircleDot, Bell, Activity, Wifi, WifiOff, Battery, Clock } from 'lucide-react';
import { animalsAPI, locationsAPI, notificationsAPI } from '../services/api';
import toast from 'react-hot-toast';
import axios from 'axios';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalAnimals: 0,
    onlineDevices: 0,
    offlineDevices: 0,
    unreadNotifications: 0
  });
  const [animals, setAnimals] = useState([]);
  const [currentLocations, setCurrentLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  // Default coords: Bulawayo, Zimbabwe
  const [weather, setWeather] = useState(null);
  const [categoryStats, setCategoryStats] = useState({ cow: 0, donkey: 0, pig: 0, sheep: 0, goat: 0 });
  const defaultLat = -20.15, defaultLng = 28.5833;

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const animalWithLocation = currentLocations[0];
    const lat = animalWithLocation?.latitude || defaultLat;
    const lng = animalWithLocation?.longitude || defaultLng;
    fetchWeather(lat, lng);
    countCategories(animals);
  }, [animals, currentLocations]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [animalsRes, locationsRes, notificationsRes] = await Promise.all([
        animalsAPI.getAll(),
        locationsAPI.getCurrent(),
        notificationsAPI.getUnreadCount()
      ]);

      setAnimals(animalsRes.data.results || animalsRes.data);
      setCurrentLocations(locationsRes.data);
      setStats({
        totalAnimals: animalsRes.data.count || animalsRes.data.length,
        onlineDevices: locationsRes.data.filter(loc => loc.is_online).length,
        offlineDevices: locationsRes.data.filter(loc => !loc.is_online).length,
        unreadNotifications: notificationsRes.data.unread_count
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchWeather = async (lat, lon) => {
    try {
      const apiKey = '4f3be4563880be7be27eb6c902088f47';
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
      const res = await axios.get(url);
      setWeather(res.data);
    } catch (err) {
      setWeather(null);
      // Add this line to see errors in the console
      console.error('Weather error:', err.response ? err.response.data : err.message);
      // Removed noisy alert
    }
  };

  const countCategories = (animalsList) => {
    const counts = { cow: 0, donkey: 0, pig: 0, sheep: 0, goat: 0 };
    animalsList.forEach(a => {
      if (a.category && counts.hasOwnProperty(a.category)) {
        counts[a.category] += 1;
      }
    });
    setCategoryStats(counts);
  };

  const getStatusColor = (isOnline) => {
    return isOnline ? 'status-online' : 'status-offline';
  };

  const getStatusText = (isOnline) => {
    return isOnline ? 'Online' : 'Offline';
  };

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Never';
    const date = new Date(lastSeen);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '20px' }}>
        <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '20px' }}>
      <div className="mb-3">
        <h1>Dashboard</h1>
        <p className="text-muted">Overview of your livestock tracking system</p>
        {/* Weather Widget */}
        {/* Below the header, show weather and stats side-by-side */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          <div className="card">
            <div className="card-header"><strong>Farm Weather (Bulawayo)</strong></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingTop: '10px' }}>
              {weather ? (
                <>
                  <img src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`} alt="weather icon" style={{ width: 48, height: 48 }} />
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 600 }}>{Math.round(weather.main.temp)}°C</div>
                    <div style={{ color: '#6c757d', textTransform: 'capitalize' }}>{weather.weather[0].description}</div>
                    <div style={{ fontSize: 14 }}>{weather.name}</div>
                  </div>
                </>
              ) : (
                <span style={{ color: '#888' }}>Weather unavailable</span>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><strong>Livestock Stats</strong></div>
            <div style={{ paddingTop: '10px' }}>
              {(() => {
                const categoryColors = {
                  cow: '#4CAF50',
                  donkey: '#FF9800',
                  pig: '#E91E63',
                  sheep: '#9C27B0',
                  goat: '#2196F3'
                };
                const entries = Object.entries(categoryStats);
                const maxVal = Math.max(1, ...entries.map(([, c]) => c));
                return entries.map(([cat, count]) => (
                  <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ width: '90px', fontWeight: 500, textTransform: 'capitalize' }}>{cat}</span>
                    <div style={{ flex: 1, height: '14px', background: '#e3f2fd', borderRadius: '8px', position: 'relative' }}>
                      <div style={{ height: '14px', width: `${(count / maxVal) * 100}%`, background: categoryColors[cat] || '#1976d2', borderRadius: '8px' }}></div>
                    </div>
                    <span style={{ minWidth: '30px', textAlign: 'right' }}>{count}</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="card">
          <div className="d-flex align-items-center gap-3">
            <div style={{ padding: '12px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
              <CircleDot size={24} color="#1976d2" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '24px' }}>{stats.totalAnimals}</h3>
              <p style={{ margin: 0, color: '#6c757d' }}>Total Animals</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="d-flex align-items-center gap-3">
            <div style={{ padding: '12px', backgroundColor: '#e8f5e8', borderRadius: '8px' }}>
              <Wifi size={24} color="#28a745" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '24px' }}>{stats.onlineDevices}</h3>
              <p style={{ margin: 0, color: '#6c757d' }}>Online Devices</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="d-flex align-items-center gap-3">
            <div style={{ padding: '12px', backgroundColor: '#ffebee', borderRadius: '8px' }}>
              <WifiOff size={24} color="#dc3545" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '24px' }}>{stats.offlineDevices}</h3>
              <p style={{ margin: 0, color: '#6c757d' }}>Offline Devices</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="d-flex align-items-center gap-3">
            <div style={{ padding: '12px', backgroundColor: '#fff3e0', borderRadius: '8px' }}>
              <Bell size={24} color="#ff9800" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '24px' }}>{stats.unreadNotifications}</h3>
              <p style={{ margin: 0, color: '#6c757d' }}>Unread Notifications</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Animals */}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h3 className="card-title">Recent Animals</h3>
          <Link to="/animals" className="btn btn-primary btn-sm">
            View All
          </Link>
        </div>

        <div style={{ display: 'grid', gap: '15px' }}>
          {animals.slice(0, 5).map((animal) => {
            const location = currentLocations.find(loc => loc.animal_name === animal.name);
            const isOnline = location?.is_online || false;

            return (
            return (
              <div key={animal.id} className="recent-row mobile-stack" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '15px',
                border: '1px solid #e9ecef',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    backgroundColor: '#e9ecef',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}>
                    {animal.image ? (
                      (() => {
                        const base = process.env.REACT_APP_API_URL || 'http://localhost:8000';
                        const val = animal.image;
                        const src = val.startsWith('http')
                          ? val
                          : val.startsWith('/')
                            ? `${base}${val}`
                            : `${base}/media/${val}`;
                        return (
                          <img src={src} alt={animal.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        );
                      })()
                    ) : (
                      <CircleDot size={24} color="#6c757d" />
                    )}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '16px' }}>{animal.name}</h4>
                    <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>
                      {animal.breed} • {animal.gender}
                    </p>
                  </div>
                </div>

                <div className="mobile-full-width" style={{ display: 'flex', alignItems: 'center', gap: '15px', justifyContent: 'space-between' }}>
                  <div className="text-center mobile-full-width" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className={`d-flex align-items-center gap-2 ${getStatusColor(isOnline)}`}>
                      {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
                      <span style={{ fontSize: '14px', fontWeight: '500' }}>
                        {getStatusText(isOnline)}
                      </span>
                    </div>
                    {location && (
                      <span style={{ fontSize: '12px', color: '#6c757d' }}>
                        • {formatLastSeen(location.timestamp)}
                      </span>
                    )}
                  </div>

                  <Link to={`/animals/${animal.id}`} className="btn btn-primary btn-sm">
                    View
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Quick Actions</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <Link to="/map" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={18} />
            View Map
          </Link>
          <Link to="/animals" className="btn btn-success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CircleDot size={18} />
            Manage Animals
          </Link>
          <Link to="/notifications" className="btn btn-warning" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={18} />
            Notifications
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;







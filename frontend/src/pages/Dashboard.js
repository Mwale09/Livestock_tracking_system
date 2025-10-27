import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Users, Bell, Activity, Wifi, WifiOff, Battery, Clock } from 'lucide-react';
import { animalsAPI, locationsAPI, notificationsAPI } from '../services/api';
import toast from 'react-hot-toast';

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

  useEffect(() => {
    fetchDashboardData();
  }, []);

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
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="card">
          <div className="d-flex align-items-center gap-3">
            <div style={{ padding: '12px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
              <Users size={24} color="#1976d2" />
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
              <div key={animal.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '15px',
                border: '1px solid #e9ecef',
                borderRadius: '8px',
                backgroundColor: '#f8f9fa'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    backgroundColor: '#e9ecef',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Users size={24} color="#6c757d" />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '16px' }}>{animal.name}</h4>
                    <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>
                      {animal.breed} • {animal.gender}
                    </p>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div className="text-center">
                    <div className={`d-flex align-items-center gap-2 ${getStatusColor(isOnline)}`}>
                      {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
                      <span style={{ fontSize: '14px', fontWeight: '500' }}>
                        {getStatusText(isOnline)}
                      </span>
                    </div>
                    {location && (
                      <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#6c757d' }}>
                        {formatLastSeen(location.timestamp)}
                      </p>
                    )}
                  </div>
                  
                  <Link to={`/animals/${animal.id}`} className="btn btn-primary btn-sm">
                    View Details
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
            <Users size={18} />
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







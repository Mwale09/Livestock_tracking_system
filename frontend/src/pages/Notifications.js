import React, { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Trash2, Filter } from 'lucide-react';
import { notificationsAPI } from '../services/api';
import toast from 'react-hot-toast';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({
    total_notifications: 0,
    unread_notifications: 0,
    notifications_by_type: {},
    recent_notifications: []
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    fetchNotifications();
    fetchStats();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationsAPI.getAll();
      setNotifications(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await notificationsAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === id 
            ? { ...notif, is_read: true, read_at: new Date().toISOString() }
            : notif
        )
      );
      setStats(prev => ({
        ...prev,
        unread_notifications: prev.unread_notifications - 1
      }));
      toast.success('Notification marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, is_read: true, read_at: new Date().toISOString() }))
      );
      setStats(prev => ({
        ...prev,
        unread_notifications: 0
      }));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'device_offline':
        return '🔴';
      case 'device_online':
        return '🟢';
      case 'low_battery':
        return '🔋';
      case 'geofence_breach':
        return '⚠️';
      case 'command_response':
        return '📱';
      case 'system_alert':
        return '🚨';
      default:
        return '📢';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return '#dc3545';
      case 'high':
        return '#fd7e14';
      case 'medium':
        return '#ffc107';
      case 'low':
        return '#6c757d';
      default:
        return '#6c757d';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    return date.toLocaleDateString();
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesFilter = filter === 'all' || 
      (filter === 'unread' && !notification.is_read) ||
      (filter === 'read' && notification.is_read);
    
    const matchesType = typeFilter === 'all' || notification.notification_type === typeFilter;
    
    return matchesFilter && matchesType;
  });

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
        <h1>Notifications</h1>
        <p className="text-muted">Stay updated with your livestock tracking system</p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="card">
          <div className="d-flex align-items-center gap-3">
            <div style={{ padding: '12px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
              <Bell size={24} color="#1976d2" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '24px' }}>{stats.total_notifications}</h3>
              <p style={{ margin: 0, color: '#6c757d' }}>Total Notifications</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="d-flex align-items-center gap-3">
            <div style={{ padding: '12px', backgroundColor: '#fff3e0', borderRadius: '8px' }}>
              <Check size={24} color="#ff9800" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '24px' }}>{stats.unread_notifications}</h3>
              <p style={{ margin: 0, color: '#6c757d' }}>Unread Notifications</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="card mb-3">
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="all">All Notifications</option>
              <option value="unread">Unread Only</option>
              <option value="read">Read Only</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="all">All Types</option>
              <option value="device_offline">Device Offline</option>
              <option value="device_online">Device Online</option>
              <option value="low_battery">Low Battery</option>
              <option value="geofence_breach">Geofence Breach</option>
              <option value="command_response">Command Response</option>
              <option value="system_alert">System Alert</option>
            </select>
          </div>

          <button
            className="btn btn-primary btn-sm"
            onClick={markAllAsRead}
            disabled={stats.unread_notifications === 0}
          >
            <CheckCheck size={16} />
            Mark All as Read
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Notifications</h3>
        </div>
        
        <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
          {filteredNotifications.length === 0 ? (
            <div className="text-center" style={{ padding: '40px' }}>
              <Bell size={48} color="#6c757d" />
              <p className="text-muted">No notifications found</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '15px',
                    padding: '15px',
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    backgroundColor: notification.is_read ? '#f8f9fa' : '#fff',
                    borderLeft: `4px solid ${getPriorityColor(notification.priority)}`
                  }}
                >
                  <div style={{ fontSize: '24px' }}>
                    {getNotificationIcon(notification.notification_type)}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h4 style={{ margin: 0, fontSize: '16px' }}>{notification.title}</h4>
                      <div className="d-flex align-items-center gap-2">
                        {!notification.is_read && (
                          <div style={{
                            width: '8px',
                            height: '8px',
                            backgroundColor: '#007bff',
                            borderRadius: '50%'
                          }} />
                        )}
                        <span style={{ fontSize: '12px', color: '#6c757d' }}>
                          {formatDateTime(notification.created_at)}
                        </span>
                      </div>
                    </div>
                    
                    <p style={{ margin: '0 0 10px 0', color: '#6c757d' }}>
                      {notification.message}
                    </p>
                    
                    <div className="d-flex align-items-center gap-2">
                      <span style={{
                        padding: '2px 8px',
                        backgroundColor: getPriorityColor(notification.priority),
                        color: 'white',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        {notification.priority.toUpperCase()}
                      </span>
                      
                      <span style={{
                        padding: '2px 8px',
                        backgroundColor: '#e9ecef',
                        color: '#6c757d',
                        borderRadius: '12px',
                        fontSize: '12px'
                      }}>
                        {notification.notification_type.replace('_', ' ').toUpperCase()}
                      </span>
                      
                      {notification.animal_name && (
                        <span style={{
                          padding: '2px 8px',
                          backgroundColor: '#d4edda',
                          color: '#155724',
                          borderRadius: '12px',
                          fontSize: '12px'
                        }}>
                          {notification.animal_name}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    {!notification.is_read && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => markAsRead(notification.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Check size={14} />
                        Mark Read
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;







import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Bell, Mail, MessageSquare, Smartphone } from 'lucide-react';
import { settingsAPI } from '../services/api';
import toast from 'react-hot-toast';

const Settings = () => {
  const [settings, setSettings] = useState({
    email_device_offline: true,
    email_low_battery: true,
    email_geofence_breach: true,
    email_command_response: false,
    sms_device_offline: true,
    sms_low_battery: false,
    sms_geofence_breach: true,
    sms_command_response: false,
    push_device_offline: true,
    push_low_battery: true,
    push_geofence_breach: true,
    push_command_response: true,
    offline_check_interval: 30,
    battery_warning_threshold: 20
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await settingsAPI.get();
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await settingsAPI.update(settings);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
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
        <h1>Settings</h1>
        <p className="text-muted">Configure your notification preferences</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gap: '30px' }}>
          {/* Email Notifications */}
          <div className="card">
            <div className="card-header d-flex align-items-center gap-2">
              <Mail size={20} />
              <h3 className="card-title">Email Notifications</h3>
            </div>
            <div style={{ display: 'grid', gap: '15px' }}>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <strong>Device Offline</strong>
                  <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>
                    Receive email when a device goes offline
                  </p>
                </div>
                <input
                  type="checkbox"
                  name="email_device_offline"
                  checked={settings.email_device_offline}
                  onChange={handleInputChange}
                  style={{ transform: 'scale(1.2)' }}
                />
              </div>

              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <strong>Low Battery</strong>
                  <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>
                    Receive email when device battery is low
                  </p>
                </div>
                <input
                  type="checkbox"
                  name="email_low_battery"
                  checked={settings.email_low_battery}
                  onChange={handleInputChange}
                  style={{ transform: 'scale(1.2)' }}
                />
              </div>

              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <strong>Geofence Breach</strong>
                  <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>
                    Receive email when animal leaves safe zone
                  </p>
                </div>
                <input
                  type="checkbox"
                  name="email_geofence_breach"
                  checked={settings.email_geofence_breach}
                  onChange={handleInputChange}
                  style={{ transform: 'scale(1.2)' }}
                />
              </div>

              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <strong>Command Response</strong>
                  <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>
                    Receive email when device responds to commands
                  </p>
                </div>
                <input
                  type="checkbox"
                  name="email_command_response"
                  checked={settings.email_command_response}
                  onChange={handleInputChange}
                  style={{ transform: 'scale(1.2)' }}
                />
              </div>
            </div>
          </div>

          {/* SMS Notifications */}
          <div className="card">
            <div className="card-header d-flex align-items-center gap-2">
              <MessageSquare size={20} />
              <h3 className="card-title">SMS Notifications</h3>
            </div>
            <div style={{ display: 'grid', gap: '15px' }}>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <strong>Device Offline</strong>
                  <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>
                    Receive SMS when a device goes offline
                  </p>
                </div>
                <input
                  type="checkbox"
                  name="sms_device_offline"
                  checked={settings.sms_device_offline}
                  onChange={handleInputChange}
                  style={{ transform: 'scale(1.2)' }}
                />
              </div>

              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <strong>Low Battery</strong>
                  <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>
                    Receive SMS when device battery is low
                  </p>
                </div>
                <input
                  type="checkbox"
                  name="sms_low_battery"
                  checked={settings.sms_low_battery}
                  onChange={handleInputChange}
                  style={{ transform: 'scale(1.2)' }}
                />
              </div>

              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <strong>Geofence Breach</strong>
                  <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>
                    Receive SMS when animal leaves safe zone
                  </p>
                </div>
                <input
                  type="checkbox"
                  name="sms_geofence_breach"
                  checked={settings.sms_geofence_breach}
                  onChange={handleInputChange}
                  style={{ transform: 'scale(1.2)' }}
                />
              </div>

              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <strong>Command Response</strong>
                  <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>
                    Receive SMS when device responds to commands
                  </p>
                </div>
                <input
                  type="checkbox"
                  name="sms_command_response"
                  checked={settings.sms_command_response}
                  onChange={handleInputChange}
                  style={{ transform: 'scale(1.2)' }}
                />
              </div>
            </div>
          </div>

          {/* Push Notifications */}
          <div className="card">
            <div className="card-header d-flex align-items-center gap-2">
              <Smartphone size={20} />
              <h3 className="card-title">Push Notifications</h3>
            </div>
            <div style={{ display: 'grid', gap: '15px' }}>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <strong>Device Offline</strong>
                  <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>
                    Receive push notification when a device goes offline
                  </p>
                </div>
                <input
                  type="checkbox"
                  name="push_device_offline"
                  checked={settings.push_device_offline}
                  onChange={handleInputChange}
                  style={{ transform: 'scale(1.2)' }}
                />
              </div>

              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <strong>Low Battery</strong>
                  <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>
                    Receive push notification when device battery is low
                  </p>
                </div>
                <input
                  type="checkbox"
                  name="push_low_battery"
                  checked={settings.push_low_battery}
                  onChange={handleInputChange}
                  style={{ transform: 'scale(1.2)' }}
                />
              </div>

              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <strong>Geofence Breach</strong>
                  <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>
                    Receive push notification when animal leaves safe zone
                  </p>
                </div>
                <input
                  type="checkbox"
                  name="push_geofence_breach"
                  checked={settings.push_geofence_breach}
                  onChange={handleInputChange}
                  style={{ transform: 'scale(1.2)' }}
                />
              </div>

              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <strong>Command Response</strong>
                  <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>
                    Receive push notification when device responds to commands
                  </p>
                </div>
                <input
                  type="checkbox"
                  name="push_command_response"
                  checked={settings.push_command_response}
                  onChange={handleInputChange}
                  style={{ transform: 'scale(1.2)' }}
                />
              </div>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="card">
            <div className="card-header d-flex align-items-center gap-2">
              <SettingsIcon size={20} />
              <h3 className="card-title">Advanced Settings</h3>
            </div>
            <div style={{ display: 'grid', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Offline Check Interval (minutes)
                </label>
                <input
                  type="number"
                  name="offline_check_interval"
                  value={settings.offline_check_interval}
                  onChange={handleInputChange}
                  min="5"
                  max="120"
                  style={{
                    width: '100%',
                    maxWidth: '200px',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
                <p style={{ margin: '5px 0 0 0', color: '#6c757d', fontSize: '14px' }}>
                  How often to check if devices are offline
                </p>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Battery Warning Threshold (%)
                </label>
                <input
                  type="number"
                  name="battery_warning_threshold"
                  value={settings.battery_warning_threshold}
                  onChange={handleInputChange}
                  min="1"
                  max="50"
                  style={{
                    width: '100%',
                    maxWidth: '200px',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
                <p style={{ margin: '5px 0 0 0', color: '#6c757d', fontSize: '14px' }}>
                  Battery level to trigger low battery warnings
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-end mt-3">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {saving ? (
              <>
                <div className="spinner"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;







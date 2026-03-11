import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Wifi, WifiOff, Battery } from 'lucide-react';
import { animalsAPI } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import toast from 'react-hot-toast';

const AnimalDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [animal, setAnimal] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchAnimalDetails();
  }, [id]);

  useEffect(() => {
    if (animal) {
      fetchLocationHistory();
    }
  }, [animal, dateRange]);

  const fetchAnimalDetails = async () => {
    try {
      setLoading(true);
      const response = await animalsAPI.getById(id);
      setAnimal(response.data);
    } catch (error) {
      console.error('Error fetching animal details:', error);
      toast.error('Failed to load animal details');
      navigate('/animals');
    } finally {
      setLoading(false);
    }
  };

  const fetchLocationHistory = async () => {
    try {
      const response = await animalsAPI.getLocationHistory(id, dateRange);
      setLocationHistory(response.data);

      // Keep device "Last Seen" consistent with newest location point (prevents mismatch like 18:36 vs 17:02)
      const newest = Array.isArray(response.data) && response.data.length > 0 ? response.data[0] : null;
      if (newest?.timestamp) {
        setAnimal((prev) => {
          if (!prev) return prev;
          const next = { ...prev };
          next.last_location = newest;
          if (next.gps_device) {
            const currentLastSeen = next.gps_device.last_seen ? new Date(next.gps_device.last_seen).getTime() : 0;
            const newestTs = new Date(newest.timestamp).getTime();
            if (newestTs && newestTs > currentLastSeen) {
              next.gps_device = { ...next.gps_device, last_seen: newest.timestamp };
            }
          }
          return next;
        });
      }
    } catch (error) {
      console.error('Error fetching location history:', error);
      toast.error('Failed to load location history');
    }
  };

  const handleDateRangeChange = (e) => {
    setDateRange({
      ...dateRange,
      [e.target.name]: e.target.value
    });
  };

  const getStatusColor = (isOnline) => {
    return isOnline ? 'status-online' : 'status-offline';
  };

  const getStatusText = (isOnline) => {
    return isOnline ? 'Online' : 'Offline';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString();
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return 'Unknown';
    const birth = new Date(birthDate);
    const today = new Date();
    const ageInYears = today.getFullYear() - birth.getFullYear();
    return `${ageInYears} years`;
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

  if (!animal) {
    return (
      <div className="container" style={{ padding: '20px' }}>
        <div className="text-center">
          <h2>Animal not found</h2>
          <button className="btn btn-primary" onClick={() => navigate('/animals')}>
            Back to Animals
          </button>
        </div>
      </div>
    );
  }

  const isOnline = animal.gps_device?.is_online || false;
  const batteryLevel = animal.gps_device?.battery_level || 0;
  // Prefer the most recent item from history (if loaded) so "Current Location" card always matches the latest known point
  const latestHistoryLocation = locationHistory && locationHistory.length > 0 ? locationHistory[0] : null;
  const lastLocation = latestHistoryLocation || animal.last_location;
  const rawImage = animal.image;
  const photoUrl = rawImage
    ? (rawImage.startsWith('http')
        ? rawImage
        : rawImage.startsWith('/')
          ? `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}${rawImage}`
          : `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/media/${rawImage}`)
    : null;

  return (
    <div className="container" style={{ padding: '20px' }}>
      <div className="d-flex align-items-center gap-3 mb-3">
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/animals')}
        >
          <ArrowLeft size={18} />
          Back
        </button>
        <div>
          <h1>{animal.name}</h1>
          <p className="text-muted">Animal ID: {animal.id}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {/* Animal Information */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Animal Information</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
            {photoUrl ? (
              <img src={photoUrl} alt={animal.name} style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '80px', height: '80px', backgroundColor: '#e9ecef', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={40} color="#6c757d" />
              </div>
            )}
            <div>
              <div style={{ fontWeight: 600, fontSize: '1.15rem' }}>{animal.category}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: '15px' }}>
            <div>
              <strong>Name:</strong> {animal.name}
            </div>
            <div>
              <strong>ID:</strong> {animal.id}
            </div>
            <div>
              <strong>Breed:</strong> {animal.breed}
            </div>
            <div>
              <strong>Gender:</strong> {animal.gender}
            </div>
            <div>
              <strong>Birth Date:</strong> {formatDate(animal.birth_date)}
            </div>
            <div>
              <strong>Age:</strong> {calculateAge(animal.birth_date)}
            </div>
            <div>
              <strong>Weight:</strong> {animal.weight ? `${animal.weight} kg` : 'Unknown'}
            </div>
            <div>
              <strong>Color:</strong> {animal.color || 'Unknown'}
            </div>
            <div>
              <strong>Created:</strong> {formatDateTime(animal.created_at)}
            </div>
          </div>
        </div>

        {/* GPS Device Status */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">GPS Device Status</h3>
          </div>
          {animal.gps_device ? (
            <div style={{ display: 'grid', gap: '15px' }}>
              <div className="d-flex align-items-center gap-2">
                {isOnline ? <Wifi size={20} className="status-online" /> : <WifiOff size={20} className="status-offline" />}
                <span className={getStatusColor(isOnline)} style={{ fontSize: '18px', fontWeight: '500' }}>
                  {getStatusText(isOnline)}
                </span>
              </div>
              
              <div>
                <strong>Device ID:</strong> {animal.gps_device.device_id}
              </div>
              <div>
                <strong>IMEI:</strong> {animal.gps_device.imei}
              </div>
              <div>
                <strong>Phone Number:</strong> {animal.gps_device.phone_number}
              </div>
              <div className="d-flex align-items-center gap-2">
                <Battery size={16} />
                <span><strong>Battery:</strong> {batteryLevel}%</span>
              </div>
              <div>
                <strong>Last Seen:</strong> {formatDateTime(animal.gps_device.last_seen)}
              </div>
              <div>
                <strong>Status:</strong> {animal.gps_device.status}
              </div>
            </div>
          ) : (
            <div className="text-center" style={{ padding: '20px' }}>
              <WifiOff size={48} color="#6c757d" />
              <p className="text-muted">No GPS device assigned</p>
            </div>
          )}
        </div>

        {/* Current Location / Last Seen */}
        {lastLocation && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">{isOnline ? 'Current Location' : 'Last Seen'}</h3>
            </div>
            <div style={{ display: 'grid', gap: '15px' }}>
              <div>
                <strong>Latitude:</strong> {parseFloat(lastLocation.latitude || 0).toFixed(6)}
              </div>
              <div>
                <strong>Longitude:</strong> {parseFloat(lastLocation.longitude || 0).toFixed(6)}
              </div>
              <div>
                <strong>Speed:</strong> {lastLocation.speed ? `${lastLocation.speed} km/h` : 'Unknown'}
              </div>
              <div>
                <strong>Heading:</strong> {lastLocation.heading ? `${lastLocation.heading}°` : 'Unknown'}
              </div>
              <div>
                <strong>{isOnline ? 'Last Update' : 'Last Seen'}:</strong> {formatDateTime(lastLocation.timestamp)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Location History */}
      <div className="card mt-3">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h3 className="card-title">Location History</h3>
          <div className="d-flex gap-2">
            <input
              type="date"
              name="start_date"
              value={dateRange.start_date}
              onChange={handleDateRangeChange}
              style={{
                padding: '6px 10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <input
              type="date"
              name="end_date"
              value={dateRange.end_date}
              onChange={handleDateRangeChange}
              style={{
                padding: '6px 10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={fetchLocationHistory}
            >
              Refresh
            </button>
          </div>
        </div>
        
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {locationHistory.length === 0 ? (
            <div className="text-center" style={{ padding: '40px' }}>
              <MapPin size={48} color="#6c757d" />
              <p className="text-muted">No location history found for the selected date range</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {locationHistory.map((location, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '15px',
                    border: `1px solid ${theme === 'dark' ? '#1b2330' : '#e9ecef'}`,
                    borderRadius: '8px',
                    backgroundColor: theme === 'dark' ? '#0b1118' : '#f8f9fa'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: theme === 'dark' ? '#1b2330' : '#e9ecef',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <MapPin size={20} color={theme === 'dark' ? '#22d3ee' : '#6c757d'} />
                    </div>
                    <div>
                      <div style={{ fontWeight: '500', color: theme === 'dark' ? '#e6f1ff' : '#000' }}>
                        {parseFloat(location.latitude || 0).toFixed(6)}, {parseFloat(location.longitude || 0).toFixed(6)}
                      </div>
                      <div style={{ fontSize: '14px', color: theme === 'dark' ? '#94a3b8' : '#6c757d' }}>
                        {formatDateTime(location.timestamp)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {location.speed && (
                      <div style={{ fontSize: '14px', color: theme === 'dark' ? '#cbd5e1' : '#000' }}>
                        <strong style={{ color: theme === 'dark' ? '#22d3ee' : '#000' }}>Speed:</strong> {location.speed} km/h
                      </div>
                    )}
                    {location.heading && (
                      <div style={{ fontSize: '14px', color: theme === 'dark' ? '#cbd5e1' : '#000' }}>
                        <strong style={{ color: theme === 'dark' ? '#22d3ee' : '#000' }}>Heading:</strong> {location.heading}°
                      </div>
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

export default AnimalDetail;







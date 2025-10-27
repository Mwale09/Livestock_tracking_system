import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { Icon } from 'leaflet';
import { useSocket } from '../contexts/SocketContext';
import { locationsAPI } from '../services/api';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const Map = () => {
  const { isConnected, lastLocationUpdate, subscribeToAnimal } = useSocket();
  const [locations, setLocations] = useState([]);
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);

  useEffect(() => {
    fetchCurrentLocations();
  }, []);

  useEffect(() => {
    if (lastLocationUpdate) {
      updateLocation(lastLocationUpdate);
    }
  }, [lastLocationUpdate]);

  const fetchCurrentLocations = async () => {
    try {
      setLoading(true);
      const response = await locationsAPI.getCurrent();
      setLocations(response.data);
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast.error('Failed to load location data');
    } finally {
      setLoading(false);
    }
  };

  const updateLocation = (locationData) => {
    setLocations(prevLocations => {
      const existingIndex = prevLocations.findIndex(
        loc => loc.device_id === locationData.device_id
      );
      
      if (existingIndex >= 0) {
        const updated = [...prevLocations];
        updated[existingIndex] = {
          ...updated[existingIndex],
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          timestamp: locationData.timestamp
        };
        return updated;
      } else {
        return [...prevLocations, locationData];
      }
    });
  };

  const handleAnimalSelect = (animalId) => {
    setSelectedAnimal(animalId);
    subscribeToAnimal(animalId);
  };

  const getMarkerColor = (isOnline) => {
    return isOnline ? '#28a745' : '#dc3545';
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleString();
  };

  const getSpeedText = (speed) => {
    if (!speed) return '0 km/h';
    return `${speed} km/h`;
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
        <h1>Real-time Map</h1>
        <p className="text-muted">
          Live tracking of your livestock locations
          {isConnected && <span className="status-online"> • Connected</span>}
          {!isConnected && <span className="status-offline"> • Disconnected</span>}
        </p>
      </div>

      <div className="card" style={{ height: '600px', padding: 0 }}>
        <MapContainer
          center={[0, 0]}
          zoom={2}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {locations.map((location) => {
            if (!location.latitude || !location.longitude) return null;
            
            const isOnline = location.is_online;
            const markerColor = getMarkerColor(isOnline);
            
            return (
              <Marker
                key={location.device_id}
                position={[location.latitude, location.longitude]}
                icon={new Icon({
                  iconUrl: `data:image/svg+xml;base64,${btoa(`
                    <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
                      <path fill="${markerColor}" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 12.5 12.5 28.5 12.5 28.5s12.5-16 12.5-28.5C25 5.6 19.4 0 12.5 0zm0 17c-2.5 0-4.5-2-4.5-4.5s2-4.5 4.5-4.5 4.5 2 4.5 4.5-2 4.5-4.5 4.5z"/>
                    </svg>
                  `)}`,
                  iconSize: [25, 41],
                  iconAnchor: [12, 41],
                  popupAnchor: [0, -41]
                })}
              >
                <Popup>
                  <div style={{ minWidth: '200px' }}>
                    <h4 style={{ margin: '0 0 10px 0' }}>{location.animal_name}</h4>
                    <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
                      <p style={{ margin: '5px 0' }}>
                        <strong>Status:</strong> 
                        <span className={isOnline ? 'status-online' : 'status-offline'}>
                          {isOnline ? ' Online' : ' Offline'}
                        </span>
                      </p>
                      <p style={{ margin: '5px 0' }}>
                        <strong>Location:</strong> {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                      </p>
                      <p style={{ margin: '5px 0' }}>
                        <strong>Speed:</strong> {getSpeedText(location.speed)}
                      </p>
                      <p style={{ margin: '5px 0' }}>
                        <strong>Last Update:</strong> {formatTimestamp(location.timestamp)}
                      </p>
                      {location.heading && (
                        <p style={{ margin: '5px 0' }}>
                          <strong>Heading:</strong> {location.heading}°
                        </p>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Location List */}
      <div className="card mt-3">
        <div className="card-header">
          <h3 className="card-title">Current Locations</h3>
        </div>
        
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {locations.length === 0 ? (
            <div className="text-center" style={{ padding: '40px' }}>
              <p className="text-muted">No location data available</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {locations.map((location) => (
                <div
                  key={location.device_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '15px',
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    backgroundColor: '#f8f9fa'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: getMarkerColor(location.is_online)
                      }}
                    />
                    <div>
                      <h4 style={{ margin: 0, fontSize: '16px' }}>{location.animal_name}</h4>
                      <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>
                        {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p style={{ margin: 0, fontSize: '14px' }}>
                      <span className={location.is_online ? 'status-online' : 'status-offline'}>
                        {location.is_online ? 'Online' : 'Offline'}
                      </span>
                    </p>
                    <p style={{ margin: 0, color: '#6c757d', fontSize: '12px' }}>
                      {formatTimestamp(location.timestamp)}
                    </p>
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

export default Map;







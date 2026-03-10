import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, ZoomControl, useMap, Polyline } from 'react-leaflet';
import { Icon } from 'leaflet';
import { useSocket } from '../contexts/SocketContext';
import { locationsAPI, animalsAPI } from '../services/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Bulawayo, National University of Science and Technology coordinates
const NUST_COORDS = [-20.1500, 28.5833];

// Component to handle map zoom and pan
function MapController({ targetLocation, zoomLevel }) {
  const map = useMap();

  useEffect(() => {
    if (targetLocation && targetLocation.latitude && targetLocation.longitude) {
      const lat = parseFloat(targetLocation.latitude);
      const lng = parseFloat(targetLocation.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        map.setView([lat, lng], zoomLevel || 16, {
          animate: true,
          duration: 1.0
        });
      }
    }
  }, [targetLocation, zoomLevel, map]);

  return null;
}

const Map = () => {
  const { isConnected, lastLocationUpdate, subscribeToAnimal } = useSocket();
  const { theme } = useTheme();
  const location = useLocation();
  const [locations, setLocations] = useState([]);
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [historyAnimalId, setHistoryAnimalId] = useState(null);
  const [historyPoints, setHistoryPoints] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [targetLocation, setTargetLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapType, setMapType] = useState('hybrid'); // Default to hybrid for better livestock tracking
  const [liveMode, setLiveMode] = useState(false);
  const mapRef = useRef(null);
  const navigate = useNavigate();

  // Check if we need to focus on a specific animal from navigation state
  useEffect(() => {
    if (location.state?.highlightAnimal && locations.length > 0) {
      const animalLocation = locations.find(loc => loc.animal_id === location.state.highlightAnimal);
      if (animalLocation) {
        setTargetLocation(animalLocation);
        // Clear the state after using it
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, locations]);

  useEffect(() => {
    fetchCurrentLocations();
  }, []);
  
  // Optional live mode (off by default to avoid "refreshy" UX)
  useEffect(() => {
    if (!liveMode) return;
    const interval = setInterval(() => {
      fetchCurrentLocations({ silent: true });
    }, 10000);
    return () => clearInterval(interval);
  }, [liveMode]);

  useEffect(() => {
    if (lastLocationUpdate) {
      updateLocation(lastLocationUpdate);
    }
  }, [lastLocationUpdate]);

  const fetchCurrentLocations = async ({ silent } = {}) => {
    try {
      if (!silent) setLoading(true);
      const response = await locationsAPI.getCurrent();
      // Only update state if something actually changed (reduces UI "refresh" feel)
      setLocations((prev) => {
        const next = response.data || [];
        const prevJson = JSON.stringify(prev);
        const nextJson = JSON.stringify(next);
        return prevJson === nextJson ? prev : next;
      });
    } catch (error) {
      console.error('Error fetching locations:', error);
      if (!silent) toast.error('Failed to load location data');
    } finally {
      if (!silent) setLoading(false);
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

  const fetchAnimalHistory = async (animalId) => {
    if (!animalId) return;
    try {
      setHistoryLoading(true);
      setHistoryAnimalId(animalId);
      setHistoryPoints([]);
      // Backend defaults to last 24h if no params are provided
      const response = await animalsAPI.getLocationHistory(animalId, {});
      const points = (response.data || [])
        .map((p) => {
          const lat = parseFloat(p.latitude);
          const lng = parseFloat(p.longitude);
          if (isNaN(lat) || isNaN(lng)) return null;
          return [lat, lng];
        })
        .filter(Boolean);

      if (points.length === 0) {
        toast.error('No location history for this animal in the last 24 hours');
      } else {
        setHistoryPoints(points);
        const [lastLat, lastLng] = points[points.length - 1];
        setTargetLocation({ latitude: lastLat, longitude: lastLng });
      }
    } catch (error) {
      console.error('Error fetching location history:', error);
      toast.error('Failed to load location history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const clearHistory = () => {
    setHistoryPoints([]);
    setHistoryAnimalId(null);
  };

  const getCategoryColor = (category) => {
    const colors = {
      cow: '#4CAF50',
      donkey: '#FF9800',
      pig: '#E91E63',
      sheep: '#9C27B0',
      goat: '#2196F3'
    };
    return colors[category] || '#6c757d';
  };

  const getMarkerColor = (category, isOnline) => {
    const baseColor = getCategoryColor(category);
    // If offline, make it darker/more transparent
    return isOnline ? baseColor : `${baseColor}80`; // 80 = 50% opacity in hex
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
        <div className="d-flex align-items-center gap-2" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => fetchCurrentLocations()}>
            Refresh locations
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>
            <input
              type="checkbox"
              checked={liveMode}
              onChange={(e) => setLiveMode(e.target.checked)}
            />
            Live update (10s)
          </label>
        </div>
        {historyAnimalId && (
          <p className="text-muted" style={{ fontSize: '0.9rem' }}>
            Showing 24-hour trail for animal ID <strong>{historyAnimalId}</strong>
          </p>
        )}
      </div>

      <div className="card" style={{ height: '600px', padding: 0, position: 'relative', overflow: 'hidden' }}>
        <style>{`
          .leaflet-popup-content-wrapper {
            background-color: ${theme === 'dark' ? '#0f141b' : 'white'} !important;
            color: ${theme === 'dark' ? '#e6f1ff' : '#000'} !important;
            border: 1px solid ${theme === 'dark' ? '#1b2330' : '#ddd'} !important;
          }
          .leaflet-popup-tip {
            background-color: ${theme === 'dark' ? '#0f141b' : 'white'} !important;
            border: 1px solid ${theme === 'dark' ? '#1b2330' : '#ddd'} !important;
          }
          .leaflet-popup-content {
            color: ${theme === 'dark' ? '#e6f1ff' : '#000'} !important;
          }
          .leaflet-popup-content p {
            color: ${theme === 'dark' ? '#cbd5e1' : '#000'} !important;
          }
          .leaflet-popup-content strong {
            color: ${theme === 'dark' ? '#22d3ee' : '#000'} !important;
          }
          .map-type-toggle {
            position: absolute;
            top: 20px;
            right: 20px;
            z-index: 1000;
            display: flex;
            background: white;
            padding: 4px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.15);
          }
          :root[data-theme='dark'] .map-type-toggle {
            background: #1e293b;
          }
          .toggle-btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.2s;
            background: transparent;
            color: #64748b;
          }
          .toggle-btn.active {
            background: var(--primary);
            color: white;
          }
        `}</style>

        {/* Map Type Toggle */}
        <div className="map-type-toggle">
          <button
            className={`toggle-btn ${mapType === 'standard' ? 'active' : ''}`}
            onClick={() => setMapType('standard')}
          >
            Standard
          </button>
          <button
            className={`toggle-btn ${mapType === 'hybrid' ? 'active' : ''}`}
            onClick={() => setMapType('hybrid')}
          >
            Hybrid
          </button>
        </div>
        <MapContainer
          center={targetLocation ? [parseFloat(targetLocation.latitude), parseFloat(targetLocation.longitude)] : NUST_COORDS}
          zoom={targetLocation ? 16 : 13}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
          zoomControl={false}
        >
          <ZoomControl position="bottomleft" />
          <MapController targetLocation={targetLocation} zoomLevel={16} />

          {mapType === 'standard' ? (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          ) : (
            <>
              <TileLayer
                attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
                pane="shadowPane" // Ensure labels are above the imagery
              />
            </>
          )}

          {historyPoints.length > 1 && (
            <Polyline
              positions={historyPoints}
              pathOptions={{
                color: '#22c55e',
                weight: 4,
                opacity: 0.8,
              }}
            />
          )}

          {locations.map((location) => {
            if (!location.latitude || !location.longitude) return null;

            // Convert to numbers (API returns strings from DecimalField)
            const lat = parseFloat(location.latitude);
            const lng = parseFloat(location.longitude);

            if (isNaN(lat) || isNaN(lng)) return null;

            const isOnline = location.is_online;
            const category = location.animal_category || 'cow';
            const markerColor = getMarkerColor(category, isOnline);
            const baseColor = getCategoryColor(category);

            return (
              <Marker
                key={location.device_id}
                position={[lat, lng]}
                icon={new Icon({
                  iconUrl: `data:image/svg+xml;base64,${btoa(`
                    <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
                      <path fill="${baseColor}" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 12.5 12.5 28.5 12.5 28.5s12.5-16 12.5-28.5C25 5.6 19.4 0 12.5 0zm0 17c-2.5 0-4.5-2-4.5-4.5s2-4.5 4.5-4.5 4.5 2 4.5 4.5-2 4.5-4.5 4.5z"/>
                    </svg>
                  `)}`,
                  iconSize: [25, 41],
                  iconAnchor: [12, 41],
                  popupAnchor: [0, -41]
                })}
                eventHandlers={{
                  dblclick: () => {
                    if (location.animal_id) {
                      navigate(`/animals/${location.animal_id}`);
                    }
                  }
                }}
              >
                <Popup>
                  <div style={{ minWidth: '200px', color: theme === 'dark' ? '#e6f1ff' : '#000' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: theme === 'dark' ? '#22d3ee' : '#000' }}>{location.animal_name}</h4>
                    <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
                      <p style={{ margin: '5px 0', color: theme === 'dark' ? '#cbd5e1' : '#000' }}>
                        <strong style={{ color: theme === 'dark' ? '#22d3ee' : '#000' }}>Category:</strong> {category ? category.charAt(0).toUpperCase() + category.slice(1) : 'Unknown'}
                      </p>
                      <p style={{ margin: '5px 0', color: theme === 'dark' ? '#cbd5e1' : '#000' }}>
                        <strong style={{ color: theme === 'dark' ? '#22d3ee' : '#000' }}>Status:</strong>
                        <span className={isOnline ? 'status-online' : 'status-offline'}>
                          {isOnline ? ' Online' : ' Offline'}
                        </span>
                      </p>
                      <p style={{ margin: '5px 0', color: theme === 'dark' ? '#cbd5e1' : '#000' }}>
                        <strong style={{ color: theme === 'dark' ? '#22d3ee' : '#000' }}>Location:</strong> {lat.toFixed(6)}, {lng.toFixed(6)}
                      </p>
                      <p style={{ margin: '5px 0', color: theme === 'dark' ? '#cbd5e1' : '#000' }}>
                        <strong style={{ color: theme === 'dark' ? '#22d3ee' : '#000' }}>Speed:</strong> {getSpeedText(location.speed)}
                      </p>
                      <p style={{ margin: '5px 0', color: theme === 'dark' ? '#cbd5e1' : '#000' }}>
                        <strong style={{ color: theme === 'dark' ? '#22d3ee' : '#000' }}>Last Update:</strong> {formatTimestamp(location.timestamp)}
                      </p>
                      {location.heading && (
                        <p style={{ margin: '5px 0', color: theme === 'dark' ? '#cbd5e1' : '#000' }}>
                          <strong style={{ color: theme === 'dark' ? '#22d3ee' : '#000' }}>Heading:</strong> {location.heading}°
                        </p>
                      )}
                      {location.animal_id && (
                        <>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ marginTop: '10px', width: '100%' }}
                            onClick={() => navigate(`/animals/${location.animal_id}`)}
                          >
                            View Full Details
                          </button>
                          <button
                            className="btn btn-outline-primary btn-sm"
                            style={{ marginTop: '8px', width: '100%' }}
                            disabled={historyLoading && historyAnimalId === location.animal_id}
                            onClick={() =>
                              historyAnimalId === location.animal_id && historyPoints.length
                                ? clearHistory()
                                : fetchAnimalHistory(location.animal_id)
                            }
                          >
                            {historyLoading && historyAnimalId === location.animal_id
                              ? 'Loading trail...'
                              : historyAnimalId === location.animal_id && historyPoints.length
                              ? 'Hide 24h Trail'
                              : 'Show 24h Trail'}
                          </button>
                        </>
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
                    border: `1px solid ${theme === 'dark' ? '#1b2330' : '#e9ecef'}`,
                    borderRadius: '8px',
                    backgroundColor: theme === 'dark' ? '#0b1118' : '#f8f9fa'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: getCategoryColor(location.animal_category || 'cow')
                      }}
                    />
                    <div>
                      <h4 style={{ margin: 0, fontSize: '16px', color: theme === 'dark' ? '#e6f1ff' : '#000' }}>{location.animal_name}</h4>
                      <p style={{ margin: 0, color: theme === 'dark' ? '#94a3b8' : '#6c757d', fontSize: '14px' }}>
                        {parseFloat(location.latitude || 0).toFixed(6)}, {parseFloat(location.longitude || 0).toFixed(6)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p style={{ margin: 0, fontSize: '14px' }}>
                      <span className={location.is_online ? 'status-online' : 'status-offline'}>
                        {location.is_online ? 'Online' : 'Offline'}
                      </span>
                    </p>
                    <p style={{ margin: 0, color: theme === 'dark' ? '#94a3b8' : '#6c757d', fontSize: '12px' }}>
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







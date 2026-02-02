import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, MapPin, Bell, MessageSquare, Wifi, WifiOff, Battery, Calendar, Search, CircleDot, Eye, Edit, Trash2 } from 'lucide-react';
import { animalsAPI, devicesAPI } from '../services/api';
import toast from 'react-hot-toast';
import RegisterDeviceModal from '../components/RegisterDeviceModal';

const Animals = () => {
  const navigate = useNavigate();
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [unassignedDevices, setUnassignedDevices] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window === 'undefined') return 'list';
    return localStorage.getItem('animalsViewMode') || 'list';
  });
  const [newAnimal, setNewAnimal] = useState({
    id: '',
    name: '',
    breed: 'holstein',
    gender: 'female',
    birth_date: '',
    weight: '',
    color: '',
    category: 'cow',
    image: null
  });
  const [editingId, setEditingId] = useState(null);
  const [editAnimal, setEditAnimal] = useState(null);

  useEffect(() => {
    fetchAnimals();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('animalsViewMode', viewMode);
    } catch { }
  }, [viewMode]);

  const fetchAnimals = async () => {
    try {
      setLoading(true);
      const response = await animalsAPI.getAll();
      setAnimals(response.data.results || response.data);

      // Also fetch unassigned devices
      try {
        const devicesRes = await devicesAPI.getUnassigned();
        setUnassignedDevices(devicesRes.data);
      } catch (err) {
        console.error('Failed to fetch devices', err);
      }
    } catch (error) {
      console.error('Error fetching animals:', error);
      toast.error('Failed to load animals');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target;
    setNewAnimal(prev => ({
      ...prev,
      [name]: type === 'file' ? files[0] : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.entries(newAnimal).forEach(([key, value]) => {
        if (key === 'id') {
          formData.append(key, value);
        } else if (value !== null && value !== undefined && value !== '') {
          formData.append(key, value);
        }
      });
      await animalsAPI.create(formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Animal added successfully');
      setShowAddForm(false);
      setNewAnimal({
        id: '',
        name: '',
        breed: 'holstein',
        gender: 'female',
        birth_date: '',
        weight: '',
        color: '',
        category: 'cow',
        image: null
      });
      fetchAnimals();
    } catch (error) {
      console.error('Error creating animal:', error);
      const data = error.response?.data;
      let errorMessage = data?.message || data?.detail || error.message || 'Failed to add animal';
      if (!data?.message && typeof data === 'object' && data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey && Array.isArray(data[firstKey]) && data[firstKey][0]) {
          errorMessage = `${firstKey}: ${data[firstKey][0]}`;
        }
      }
      toast.error(errorMessage);
    }
  };

  const handleQuickAction = async (animalId, action) => {
    try {
      if (action === 'buzzer') {
        await animalsAPI.activateBuzzer(animalId);
        toast.success('Buzzer activation command sent');
      } else if (action === 'sms') {
        await animalsAPI.requestSMS(animalId, { message: 'Location request' });
        toast.success('SMS request sent');
      }
    } catch (error) {
      console.error(`Error with ${action}:`, error);
      toast.error(`Failed to send ${action} command`);
    }
  };

  const startEdit = (animal) => {
    setEditingId(animal.id);
    setEditAnimal({
      id: animal.id,
      name: animal.name || '',
      breed: animal.breed || 'other',
      gender: animal.gender || 'female',
      birth_date: animal.birth_date || '',
      weight: animal.weight || '',
      color: animal.color || '',
      category: animal.category || 'cow',
      image: null,
    });
  };

  const handleEditChange = (e) => {
    const { name, value, type, files } = e.target;
    setEditAnimal(prev => ({
      ...prev,
      [name]: type === 'file' ? files[0] : value
    }));
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.entries(editAnimal).forEach(([key, value]) => {
        if (key === 'id') return;
        if (value !== null && value !== undefined && value !== '') {
          formData.append(key, value);
        }
      });
      await animalsAPI.updatePartial(editingId, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Livestock updated');
      setEditingId(null);
      setEditAnimal(null);
      fetchAnimals();
    } catch (error) {
      const data = error.response?.data;
      let errorMessage = data?.message || data?.detail || error.message || 'Failed to update';
      if (!data?.message && typeof data === 'object' && data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey && Array.isArray(data[firstKey]) && data[firstKey][0]) {
          errorMessage = `${firstKey}: ${data[firstKey][0]}`;
        }
      }
      toast.error(errorMessage);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditAnimal(null);
  };

  const deleteAnimal = async (animalId) => {
    if (!window.confirm('Delete this livestock item? This cannot be undone.')) return;
    try {
      await animalsAPI.delete(animalId);
      toast.success('Livestock deleted');
      fetchAnimals();
    } catch (error) {
      const data = error.response?.data;
      const errorMessage = data?.message || data?.detail || error.message || 'Failed to delete';
      toast.error(errorMessage);
    }
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

  const calculateAge = (birthDate) => {
    if (!birthDate) return 'Unknown';
    const birth = new Date(birthDate);
    const today = new Date();
    const ageInYears = today.getFullYear() - birth.getFullYear();
    return `${ageInYears} years`;
  };

  const renderHealthPill = (status) => {
    const label = (status || '').toLowerCase() === 'error' ? 'issue' : 'healthy';
    const bg = label === 'healthy' ? '#e6f4ea' : '#fdecea';
    const color = label === 'healthy' ? '#1e7e34' : '#b00020';
    return (
      <span style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: '9999px',
        backgroundColor: bg,
        color,
        fontSize: '12px',
        fontWeight: 600
      }}>{label}</span>
    );
  };

  const GridAnimalCard = ({ animal }) => {
    const isOnline = animal.gps_device?.is_online || false;
    const batteryLevel = animal.gps_device?.battery_level ?? null;
    const deviceStatus = animal.gps_device?.status || 'online';
    const base = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    const val = animal.image;
    const hasImage = Boolean(val);
    const imgSrc = hasImage
      ? (val.startsWith('http') ? val : (val.startsWith('/') ? `${base}${val}` : `${base}/media/${val}`))
      : null;

    return (
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ width: '100%', height: 180, background: '#e9ecef' }}>
            {imgSrc ? (
              <img src={imgSrc} alt={animal.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div className="d-flex justify-content-center align-items-center" style={{ width: '100%', height: '100%' }}>
                <MapPin size={32} color="#6c757d" />
              </div>
            )}
          </div>
          <span style={{
            position: 'absolute', top: 10, right: 10,
            backgroundColor: isOnline ? '#e6f4ea' : '#e9ecef',
            color: isOnline ? '#1e7e34' : '#495057',
            borderRadius: '9999px',
            fontSize: 12,
            fontWeight: 600,
            padding: '6px 10px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
          }}>
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        <div style={{ padding: 16 }}>
          <h3 style={{ margin: '0 0 6px 0' }}>{animal.name}</h3>
          <div style={{ color: '#6c757d', fontSize: 14, marginBottom: 4 }}>
            {animal.breed} • {animal.gender}
          </div>
          <div style={{ color: '#6c757d', fontSize: 13, marginBottom: 12 }}>
            {animal.category?.charAt(0).toUpperCase() + animal.category?.slice(1) || '—'} • {animal.id}
          </div>

          <div style={{ display: 'grid', rowGap: 10 }}>
            <div className="d-flex align-items-center justify-content-between">
              <span style={{ color: '#6c757d' }}>Battery:</span>
              <span className="d-flex align-items-center" style={{ gap: 6 }}>
                <Battery size={16} /> {batteryLevel !== null ? `${batteryLevel}%` : '—'}
              </span>
            </div>
            <div className="d-flex align-items-center justify-content-between">
              <span style={{ color: '#6c757d' }}>Age:</span>
              <span>{calculateAge(animal.birth_date)}</span>
            </div>
            <div className="d-flex align-items-center justify-content-between">
              <span style={{ color: '#6c757d' }}>Weight:</span>
              <span>{animal.weight ? `${animal.weight} kg` : 'Unknown'}</span>
            </div>
          </div>
        </div>

        <div className="d-flex align-items-center" style={{ gap: 8, padding: 16, paddingTop: 0 }}>
          <button
            className="btn btn-info btn-sm"
            style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' }}
            onClick={() => {
              navigate('/map', { state: { highlightAnimal: animal.id } });
            }}
            title="View on Map"
          >
            <MapPin size={16} />
          </button>
          <Link
            to={`/animals/${animal.id}`}
            className="btn btn-primary btn-sm"
            style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', textDecoration: 'none' }}
            title="View Details"
          >
            <Eye size={16} />
          </Link>
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => startEdit(animal)}
            title="Edit"
            style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' }}
          >
            <Edit size={16} />
          </button>
          <button
            className="btn btn-outline-danger btn-sm"
            onClick={() => deleteAnimal(animal.id)}
            title="Delete"
            style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    );
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
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div style={{ flex: 1 }}>
          <h1>Livestock</h1>
          <p className="text-muted">Manage your livestock</p>
          <div style={{ marginTop: '15px', marginBottom: '10px' }}>
            <div style={{ position: 'relative', maxWidth: '400px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6c757d' }} />
              <input
                type="text"
                placeholder="Search by name, ID, breed, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 40px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>
          <div className="d-flex gap-2" style={{ marginTop: '10px', flexWrap: 'wrap' }}>
            {[
              { key: 'all', label: 'All' },
              { key: 'cow', label: 'Cows' },
              { key: 'donkey', label: 'Donkeys' },
              { key: 'pig', label: 'Pigs' },
              { key: 'sheep', label: 'Sheep' },
              { key: 'goat', label: 'Goats' },
            ].map(btn => (
              <button
                key={btn.key}
                type="button"
                className={`btn btn-sm ${categoryFilter === btn.key ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setCategoryFilter(btn.key)}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <div className="btn-group me-2" role="group" aria-label="View mode">
            <button
              type="button"
              className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              List
            </button>
            <button
              type="button"
              className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              Grid
            </button>
          </div>
          <button
            className="btn btn-secondary"
            onClick={fetchAnimals}
          >
            Refresh
          </button>
          <button
            className="btn btn-outline-primary"
            onClick={() => setShowRegisterModal(true)}
          >
            <Plus size={18} />
            Register Tracker
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus size={18} />
            Add Livestock
          </button>
        </div>
      </div>

      <RegisterDeviceModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSuccess={() => {
          // Re-fetch devices to update the list
          fetchAnimals();
        }}
      />

      {/* Add Animal Form */}
      {showAddForm && (
        <div className="card mb-3">
          <div className="card-header">
            <h3 className="card-title">Add New Animal</h3>
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Animal ID *
                </label>
                <input
                  type="text"
                  name="id"
                  value={newAnimal.id}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={newAnimal.name}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Breed
                </label>
                <select
                  name="breed"
                  value={newAnimal.breed}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                >
                  <option value="holstein">Holstein</option>
                  <option value="angus">Angus</option>
                  <option value="hereford">Hereford</option>
                  <option value="jersey">Jersey</option>
                  <option value="simmental">Simmental</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Gender
                </label>
                <select
                  name="gender"
                  value={newAnimal.gender}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Birth Date
                </label>
                <input
                  type="date"
                  name="birth_date"
                  value={newAnimal.birth_date}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Weight (kg)
                </label>
                <input
                  type="number"
                  name="weight"
                  value={newAnimal.weight}
                  onChange={handleInputChange}
                  step="0.1"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Color
                </label>
                <input
                  type="text"
                  name="color"
                  value={newAnimal.color}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Category
                </label>
                <select
                  name="category"
                  value={newAnimal.category}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                >
                  <option value="cow">Cow</option>
                  <option value="donkey">Donkey</option>
                  <option value="pig">Pig</option>
                  <option value="sheep">Sheep</option>
                  <option value="goat">Goat</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Photo
                </label>
                <input
                  type="file"
                  name="image"
                  accept="image/*"
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Link GPS Tracker
                </label>
                <select
                  name="device_id"
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                >
                  <option value="">-- Select Tracker --</option>
                  {unassignedDevices.map(device => (
                    <option key={device.device_id} value={device.device_id}>
                      {device.device_id} {device.imei ? `(IMEI: ${device.imei})` : ''}
                    </option>
                  ))}
                </select>
                <p style={{ margin: '5px 0 0 0', color: '#6c757d', fontSize: '13px' }}>
                  Linking a tracker will automatically configure it with your phone number.
                </p>
              </div>
            </div>

            <div className="d-flex gap-2 mt-3">
              <button type="submit" className="btn btn-primary">
                Add Animal
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Animals List */}
      <div
        style={{
          display: 'grid',
          gap: '20px',
          gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(280px, 1fr))' : '1fr',
          alignItems: 'stretch'
        }}
      >
        {animals
          .filter((a) => {
            const matchesCategory = categoryFilter === 'all' ? true : (a.category === categoryFilter);
            if (!matchesCategory) return false;
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            return (
              (a.name || '').toLowerCase().includes(term) ||
              (a.id || '').toLowerCase().includes(term) ||
              (a.breed || '').toLowerCase().includes(term) ||
              (a.category || '').toLowerCase().includes(term) ||
              (a.color || '').toLowerCase().includes(term)
            );
          })
          .map((animal) => {
            const isOnline = animal.gps_device?.is_online || false;
            const batteryLevel = animal.gps_device?.battery_level || 0;

            return (
              <div key={animal.id} className="card" style={{ height: '100%' }}>
                {editingId === animal.id ? (
                  <form onSubmit={saveEdit}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Name</label>
                        <input type="text" name="name" value={editAnimal.name} onChange={handleEditChange} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Breed</label>
                        <select name="breed" value={editAnimal.breed} onChange={handleEditChange} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}>
                          <option value="holstein">Holstein</option>
                          <option value="angus">Angus</option>
                          <option value="hereford">Hereford</option>
                          <option value="jersey">Jersey</option>
                          <option value="simmental">Simmental</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Gender</label>
                        <select name="gender" value={editAnimal.gender} onChange={handleEditChange} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}>
                          <option value="female">Female</option>
                          <option value="male">Male</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Birth Date</label>
                        <input type="date" name="birth_date" value={editAnimal.birth_date?.slice(0, 10) || ''} onChange={handleEditChange} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Weight (kg)</label>
                        <input type="number" name="weight" step="0.1" value={editAnimal.weight} onChange={handleEditChange} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Color</label>
                        <input type="text" name="color" value={editAnimal.color} onChange={handleEditChange} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Category</label>
                        <select name="category" value={editAnimal.category} onChange={handleEditChange} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}>
                          <option value="cow">Cow</option>
                          <option value="donkey">Donkey</option>
                          <option value="pig">Pig</option>
                          <option value="sheep">Sheep</option>
                          <option value="goat">Goat</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Photo</label>
                        <input type="file" name="image" accept="image/*" onChange={handleEditChange} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }} />
                      </div>
                    </div>
                    <div className="d-flex gap-2 mt-3">
                      <button type="submit" className="btn btn-primary btn-sm">Save</button>
                      <button type="button" onClick={cancelEdit} className="btn btn-secondary btn-sm">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div className={viewMode === 'grid' ? '' : 'd-flex justify-content-between align-items-start'}>
                    {viewMode === 'grid' ? (
                      <GridAnimalCard animal={animal} />
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexDirection: viewMode === 'grid' ? 'column' : 'row' }}>
                          <div style={{
                            width: viewMode === 'grid' ? '100%' : '80px',
                            height: viewMode === 'grid' ? '160px' : '80px',
                            backgroundColor: '#e9ecef',
                            borderRadius: viewMode === 'grid' ? '8px' : '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
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
                                  <img src={src} alt={animal.name} style={{ width: '100%', height: '100%', borderRadius: viewMode === 'grid' ? '8px' : '50%', objectFit: 'cover' }} />
                                );
                              })()
                            ) : (
                              <MapPin size={32} color="#6c757d" />
                            )}
                          </div>
                          <div style={{ width: '100%' }}>
                            <h3 style={{ margin: '0 0 10px 0', fontSize: viewMode === 'grid' ? '18px' : 'inherit' }}>{animal.name}</h3>
                            {viewMode === 'grid' ? (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                                <div><strong>ID:</strong> {animal.id}</div>
                                <div><strong>Breed:</strong> {animal.breed}</div>
                                <div><strong>Category:</strong> {animal.category}</div>
                                <div><strong>Age:</strong> {calculateAge(animal.birth_date)}</div>
                              </div>
                            ) : (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', fontSize: '14px' }}>
                                <div><strong>ID:</strong> {animal.id}</div>
                                <div><strong>Breed:</strong> {animal.breed}</div>
                                <div><strong>Gender:</strong> {animal.gender}</div>
                                <div><strong>Category:</strong> {animal.category}</div>
                                <div><strong>Age:</strong> {calculateAge(animal.birth_date)}</div>
                                <div><strong>Weight:</strong> {animal.weight ? `${animal.weight} kg` : 'Unknown'}</div>
                                <div><strong>Color:</strong> {animal.color || 'Unknown'}</div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: viewMode === 'grid' ? 'row' : 'column', alignItems: viewMode === 'grid' ? 'center' : 'flex-end', justifyContent: viewMode === 'grid' ? 'space-between' : 'flex-start', gap: '10px', width: viewMode === 'grid' ? '100%' : 'auto', marginTop: viewMode === 'grid' ? '10px' : '0' }}>
                          <div className="d-flex align-items-center gap-2" style={{ marginRight: viewMode === 'grid' ? 'auto' : 0 }}>
                            {isOnline ? <Wifi size={16} className="status-online" /> : <WifiOff size={16} className="status-offline" />}
                            <span className={getStatusColor(isOnline)}>
                              {getStatusText(isOnline)}
                            </span>
                            {animal.gps_device && (
                              <>
                                <Battery size={16} />
                                <span style={{ fontSize: '14px' }}>{batteryLevel}%</span>
                              </>
                            )}
                          </div>
                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-info btn-sm"
                              onClick={() => {
                                navigate('/map', { state: { highlightAnimal: animal.id } });
                              }}
                              title="View on Map"
                            >
                              <MapPin size={14} />
                            </button>
                            <Link to={`/animals/${animal.id}`} className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
                              View Details
                            </Link>
                            <button className="btn btn-secondary btn-sm" onClick={() => startEdit(animal)}>Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={() => deleteAnimal(animal.id)}>Delete</button>
                            <button
                              className="btn btn-warning btn-sm"
                              onClick={() => handleQuickAction(animal.id, 'buzzer')}
                              disabled={!animal.gps_device}
                              title="Activate Buzzer"
                            >
                              <Bell size={14} />
                            </button>
                            <button
                              className="btn btn-info btn-sm"
                              onClick={() => handleQuickAction(animal.id, 'sms')}
                              disabled={!animal.gps_device}
                              title="Request SMS"
                            >
                              <MessageSquare size={14} />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {animals.filter((a) => {
        const matchesCategory = categoryFilter === 'all' ? true : (a.category === categoryFilter);
        if (!matchesCategory) return false;
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
          (a.name || '').toLowerCase().includes(term) ||
          (a.id || '').toLowerCase().includes(term) ||
          (a.breed || '').toLowerCase().includes(term) ||
          (a.category || '').toLowerCase().includes(term) ||
          (a.color || '').toLowerCase().includes(term)
        );
      }).length === 0 && (
          <div className="card text-center" style={{ padding: '60px' }}>
            <CircleDot size={48} color="#6c757d" style={{ marginBottom: '20px' }} />
            <h3>No livestock found</h3>
            <p className="text-muted">
              {animals.length === 0 ? 'Add your first animal to start tracking' : 'No livestock matches your search or filter'}
            </p>
            {animals.length === 0 && (
              <button
                className="btn btn-primary"
                onClick={() => setShowAddForm(true)}
              >
                <Plus size={18} />
                Add Livestock
              </button>
            )}
          </div>
        )}
    </div>
  );
};

export default Animals;





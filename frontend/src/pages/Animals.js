import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, MapPin, Bell, MessageSquare, Wifi, WifiOff, Battery, Calendar } from 'lucide-react';
import { animalsAPI } from '../services/api';
import toast from 'react-hot-toast';

const Animals = () => {
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAnimal, setNewAnimal] = useState({
    id: '',
    name: '',
    breed: 'holstein',
    gender: 'female',
    birth_date: '',
    weight: '',
    color: ''
  });

  useEffect(() => {
    fetchAnimals();
  }, []);

  const fetchAnimals = async () => {
    try {
      setLoading(true);
      const response = await animalsAPI.getAll();
      setAnimals(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching animals:', error);
      toast.error('Failed to load animals');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setNewAnimal({
      ...newAnimal,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await animalsAPI.create(newAnimal);
      toast.success('Animal added successfully');
      setShowAddForm(false);
      setNewAnimal({
        id: '',
        name: '',
        breed: 'holstein',
        gender: 'female',
        birth_date: '',
        weight: '',
        color: ''
      });
      fetchAnimals();
    } catch (error) {
      console.error('Error creating animal:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to add animal';
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
        <div>
          <h1>Animals</h1>
          <p className="text-muted">Manage your livestock</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus size={18} />
          Add Animal
        </button>
      </div>

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
      <div style={{ display: 'grid', gap: '20px' }}>
        {animals.map((animal) => {
          const isOnline = animal.gps_device?.is_online || false;
          const batteryLevel = animal.gps_device?.battery_level || 0;
          
          return (
            <div key={animal.id} className="card">
              <div className="d-flex justify-content-between align-items-start">
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    backgroundColor: '#e9ecef',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <MapPin size={32} color="#6c757d" />
                  </div>
                  
                  <div>
                    <h3 style={{ margin: '0 0 10px 0' }}>{animal.name}</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', fontSize: '14px' }}>
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
                        <strong>Age:</strong> {calculateAge(animal.birth_date)}
                      </div>
                      <div>
                        <strong>Weight:</strong> {animal.weight ? `${animal.weight} kg` : 'Unknown'}
                      </div>
                      <div>
                        <strong>Color:</strong> {animal.color || 'Unknown'}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                  <div className="d-flex align-items-center gap-2">
                    {isOnline ? <Wifi size={16} className="status-online" /> : <WifiOff size={16} className="status-offline" />}
                    <span className={getStatusColor(isOnline)}>
                      {getStatusText(isOnline)}
                    </span>
                  </div>
                  
                  {animal.gps_device && (
                    <div className="d-flex align-items-center gap-2">
                      <Battery size={16} />
                      <span style={{ fontSize: '14px' }}>
                        {batteryLevel}%
                      </span>
                    </div>
                  )}

                  <div className="d-flex gap-2">
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
                    <Link to={`/animals/${animal.id}`} className="btn btn-primary btn-sm">
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {animals.length === 0 && (
        <div className="card text-center" style={{ padding: '60px' }}>
          <MapPin size={48} color="#6c757d" style={{ marginBottom: '20px' }} />
          <h3>No animals found</h3>
          <p className="text-muted">Add your first animal to start tracking</p>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddForm(true)}
          >
            <Plus size={18} />
            Add Animal
          </button>
        </div>
      )}
    </div>
  );
};

export default Animals;





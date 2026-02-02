import React, { useState } from 'react';
import { X, Save, Plus } from 'lucide-react';
import { devicesAPI } from '../services/api';
import toast from 'react-hot-toast';

const RegisterDeviceModal = ({ isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        device_id: '',
        imei: '',
        phone_number: '' // Optional logic if you want to set SIM number
    });

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // In a real scenario, this might need an admin endpoint or specific "register" endpoint.
            // For now, if the API allows creating devices directly:
            await devicesAPI.create(formData);
            toast.success('Tracker registered successfully!');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Registration failed:', error);
            toast.error(error.response?.data?.message || 'Failed to register tracker');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div className="card" style={{ width: '400px', maxWidth: '90%', margin: '20px', animation: 'slideUp 0.3s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0 }}>Register New Tracker</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Device ID *</label>
                        <input
                            type="text"
                            name="device_id"
                            required
                            className="form-input"
                            placeholder="e.g., TRK-001"
                            value={formData.device_id}
                            onChange={handleChange}
                        />
                        <small className="text-muted">Unique identifier for the tracker</small>
                    </div>

                    <div className="mb-3">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>IMEI (Optional)</label>
                        <input
                            type="text"
                            name="imei"
                            className="form-input"
                            placeholder="15-digit IMEI"
                            value={formData.imei}
                            onChange={handleChange}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center' }}
                        disabled={loading}
                    >
                        {loading ? <div className="spinner" /> : 'Register Tracker'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default RegisterDeviceModal;

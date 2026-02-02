import React, { useState, useEffect } from 'react';
import { User, Lock, Save, Mail, Phone, MapPin } from 'lucide-react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import '../components/Account.css';

const Account = () => {
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [user, setUser] = useState({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        userprofile: {
            phone_number: '',
            address: ''
        }
    });

    const [passwordData, setPasswordData] = useState({
        old_password: '',
        new_password: '',
        confirm_password: ''
    });

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            setLoading(true);
            const response = await authAPI.getUser();
            setUser(response.data);
        } catch (error) {
            console.error('Error fetching user data:', error);
            toast.error('Failed to load user profile');
        } finally {
            setLoading(false);
        }
    };

    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        if (name === 'phone_number' || name === 'address') {
            setUser(prev => ({
                ...prev,
                userprofile: {
                    ...prev.userprofile,
                    [name]: value
                }
            }));
        } else {
            setUser(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const submitProfile = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            await authAPI.updateProfile(user);
            toast.success('Profile updated successfully');
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const submitPassword = async (e) => {
        e.preventDefault();
        if (passwordData.new_password !== passwordData.confirm_password) {
            toast.error('New passwords do not match');
            return;
        }

        try {
            setSaving(true);
            await authAPI.changePassword({
                old_password: passwordData.old_password,
                new_password: passwordData.new_password
            });
            toast.success('Password changed successfully');
            setPasswordData({
                old_password: '',
                new_password: '',
                confirm_password: ''
            });
        } catch (error) {
            const msg = error.response?.data?.old_password?.[0] || 'Failed to change password';
            toast.error(msg);
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
            <div className="mb-4">
                <h1>Account Management</h1>
                <p className="text-muted">Manage your profile and security settings</p>
            </div>

            <div className="row">
                <div className="col-md-3 mb-4">
                    <div className="list-group account-tabs">
                        <button
                            className={`list-group-item list-group-item-action ${activeTab === 'profile' ? 'active' : ''}`}
                            onClick={() => setActiveTab('profile')}
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                        >
                            <User size={18} /> Profile
                        </button>
                        <button
                            className={`list-group-item list-group-item-action ${activeTab === 'security' ? 'active' : ''}`}
                            onClick={() => setActiveTab('security')}
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                        >
                            <Lock size={18} /> Security
                        </button>
                    </div>
                </div>

                <div className="col-md-9">
                    {activeTab === 'profile' ? (
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">Profile Information</h3>
                            </div>
                            <div className="card-body">
                                <form onSubmit={submitProfile}>
                                    <div className="row mb-3">
                                        <div className="col-md-6">
                                            <label className="form-label">First Name</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                name="first_name"
                                                value={user.first_name}
                                                onChange={handleProfileChange}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Last Name</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                name="last_name"
                                                value={user.last_name}
                                                onChange={handleProfileChange}
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Email Address</label>
                                        <div className="input-group">
                                            <span className="input-group-text"><Mail size={18} /></span>
                                            <input
                                                type="email"
                                                className="form-input"
                                                name="email"
                                                value={user.email}
                                                onChange={handleProfileChange}
                                                disabled
                                            />
                                        </div>
                                        <div className="form-text">Email cannot be changed directly. Contact support.</div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Phone Number</label>
                                        <div className="input-group">
                                            <span className="input-group-text"><Phone size={18} /></span>
                                            <input
                                                type="tel"
                                                className="form-input"
                                                name="phone_number"
                                                value={user.userprofile?.phone_number || ''}
                                                onChange={handleProfileChange}
                                                placeholder="+1234567890"
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Address</label>
                                        <div className="input-group">
                                            <span className="input-group-text"><MapPin size={18} /></span>
                                            <input
                                                type="text"
                                                className="form-input"
                                                name="address"
                                                value={user.userprofile?.address || ''}
                                                onChange={handleProfileChange}
                                                placeholder="City, Country"
                                            />
                                        </div>
                                    </div>

                                    <button type="submit" className="btn btn-primary" disabled={saving}>
                                        {saving ? 'Saving...' : <><Save size={18} style={{ marginRight: '8px' }} /> Save Changes</>}
                                    </button>
                                </form>
                            </div>
                        </div>
                    ) : (
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">Security Settings</h3>
                            </div>
                            <div className="card-body">
                                <form onSubmit={submitPassword}>
                                    <div className="mb-3">
                                        <label className="form-label">Current Password</label>
                                        <input
                                            type="password"
                                            className="form-input"
                                            name="old_password"
                                            value={passwordData.old_password}
                                            onChange={handlePasswordChange}
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">New Password</label>
                                        <input
                                            type="password"
                                            className="form-input"
                                            name="new_password"
                                            value={passwordData.new_password}
                                            onChange={handlePasswordChange}
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Confirm New Password</label>
                                        <input
                                            type="password"
                                            className="form-input"
                                            name="confirm_password"
                                            value={passwordData.confirm_password}
                                            onChange={handlePasswordChange}
                                            required
                                        />
                                    </div>

                                    <button type="submit" className="btn btn-warning" disabled={saving}>
                                        {saving ? 'Updating...' : 'Update Password'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Account;

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const { login, register, checkAuthStatus } = useAuth();
  const navigate = useNavigate();
  const [inlineError, setInlineError] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setInlineError('');

    try {
      if (isLogin) {
        const result = await login({
          username: formData.username,
          password: formData.password
        });

        if (result.success) {
          toast.success('Login successful!');
          await checkAuthStatus();
          navigate('/');
        } else {
          setInlineError(result.error || 'Invalid username or password');
        }
      } else {
        if (formData.password !== formData.confirmPassword) {
          setInlineError('Passwords do not match');
          setLoading(false);
          return;
        }

        const result = await register({
          username: formData.username,
          email: formData.email,
          password: formData.password
        });

        if (result.success) {
          toast.success('Registration successful! Please sign in.');
          setIsLogin(true);
        } else {
          setInlineError(result.error || 'Registration failed');
        }
      }
    } catch (error) {
      setInlineError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Left Side: Image */}
      <div className="auth-side-image">
        <img
          src="/livestock_login_bg.png"
          alt="Livestock Background"
        />
        <div className="auth-image-overlay">
          <h1 style={{
            fontSize: '3.5rem',
            fontWeight: '800',
            marginBottom: '1.5rem',
            lineHeight: '1.1',
            textShadow: '0 2px 10px rgba(0,0,0,0.3)'
          }}>
            Smart Livestock <br /> Tracking
          </h1>
          <p style={{
            fontSize: '1.25rem',
            opacity: 0.9,
            maxWidth: '500px',
            lineHeight: '1.6',
            textShadow: '0 1px 5px rgba(0,0,0,0.2)'
          }}>
            Monitor your herd in real-time with precision satellite tracking and advanced analytics.
          </p>
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="auth-content">
        <div className="auth-card">
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '0.5rem' }}>
              {isLogin ? 'Welcome Back' : 'Get Started'}
            </h2>
            <p className="text-muted">
              {isLogin
                ? 'Enter your credentials to access your dashboard.'
                : 'Create your account to start tracking your livestock.'}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {inlineError && (
              <div style={{
                background: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fee2e2',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '1.5rem',
                fontSize: '14px'
              }}>
                {inlineError}
              </div>
            )}

            <div className="mb-3">
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                Username
              </label>
              <input
                type="text"
                name="username"
                className="form-input"
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>

            {!isLogin && (
              <div className="mb-3">
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            )}

            <div className="mb-3">
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                Password
              </label>
              <input
                type="password"
                name="password"
                className="form-input"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            {!isLogin && (
              <div className="mb-3">
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  className="form-input"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '16px',
                justifyContent: 'center',
                marginTop: '1rem'
              }}
            >
              {loading ? (
                <div className="spinner"></div>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>

            <div className="text-center" style={{ marginTop: '1.5rem' }}>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                {' '}
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontWeight: '600',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  {isLogin ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;





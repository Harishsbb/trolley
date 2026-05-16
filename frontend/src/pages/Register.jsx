import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../index.css';

const Register = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const navigate = useNavigate();
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        try {
            const res = await axios.post('/api/register', {
                username,
                password
            });

            if (res.data.status === 'success') {
                navigate('/login');
            } else {
                setError(res.data.message || 'Registration failed');
            }
        } catch (err) {
            if (err.response && err.response.data && err.response.data.message) {
                setError(err.response.data.message);
            } else {
                setError('Registration failed. Please try again.');
            }
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            backgroundColor: '#f8fafc',
            fontFamily: "'Outfit', sans-serif"
        }}>
            {/* Left: Decorative Hero Image */}
            <div className="login-hero" style={{
                flex: '1.2',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '60px',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundImage: 'url("/images/auth-bg.png")',
                position: 'relative',
                color: 'white',
            }}>
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(rgba(236, 72, 153, 0.4), rgba(236, 72, 153, 0.8))', // Rose/Secondary gradient for Register
                    zIndex: 1
                }}></div>
                <div style={{ position: 'relative', zIndex: 2, maxWidth: '500px' }}>
                    <h2 style={{ fontSize: '3.5rem', fontWeight: '800', lineHeight: '1', marginBottom: '24px' }}>Join the Network</h2>
                    <p style={{ fontSize: '1.25rem', opacity: '0.9', fontWeight: '400' }}>Become part of the world's most advanced self-shopping ecosystem. Secure, autonomous, and elite.</p>
                </div>
            </div>

            {/* Right: Registration Form */}
            <div style={{
                flex: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px'
            }}>
                <div className="card fade-in" style={{
                    width: '100%',
                    maxWidth: '430px',
                    padding: '50px',
                    backgroundColor: 'white',
                    borderRadius: '24px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                         <div style={{
                            width: '56px', height: '56px', margin: '0 auto 20px', borderRadius: '16px',
                            background: 'var(--secondary)', color: 'white', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: '1.75rem', fontWeight: '800'
                         }}>R</div>
                         <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#111827', marginBottom: '10px', letterSpacing: '-0.02em' }}>Initialize Account</h1>
                         <p style={{ color: '#6b7280', fontSize: '1rem' }}>Create your prestige credentials</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {error && (
                            <div className="shake" style={{
                                backgroundColor: '#fee2e2',
                                color: '#dc2626',
                                padding: '14px',
                                borderRadius: '12px',
                                marginBottom: '24px',
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                textAlign: 'center',
                                border: '1px solid #fecaca'
                            }}>
                                {error}
                            </div>
                        )}

                        <div style={{ marginBottom: '20px' }}>
                            <label htmlFor="username" style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Username</label>
                            <input
                                id="username"
                                type="text"
                                className="search-input"
                                placeholder="Choose a unique username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    border: '1px solid #d1d5db',
                                    fontSize: '1rem',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label htmlFor="password" style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Password</label>
                            <input
                                id="password"
                                type="password"
                                className="search-input"
                                placeholder="Minimum 8 characters"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    border: '1px solid #d1d5db',
                                    fontSize: '1rem',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '32px' }}>
                            <label htmlFor="confirmPassword" style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Confirm Password</label>
                            <input
                                id="confirmPassword"
                                type="password"
                                className="search-input"
                                placeholder="Re-enter your password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    border: '1px solid #d1d5db',
                                    fontSize: '1rem',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{
                                width: '100%',
                                padding: '16px',
                                borderRadius: '14px',
                                fontSize: '1.15rem',
                                fontWeight: '700',
                                backgroundColor: 'var(--secondary)',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer'
                            }}
                        >
                            Register Identity
                        </button>
                    </form>

                    <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '1rem', color: '#6b7280' }}>
                        Already have access? {' '}
                        <Link to="/login" style={{ color: 'var(--primary)', fontWeight: '700', textDecoration: 'none' }}>
                            Sign In
                        </Link>
                    </div>
                </div>
            </div>
            
            <style>
            {`
                @media (max-width: 950px) {
                    .login-hero { display: none !important; }
                }
            `}
            </style>
        </div>
    );
};

export default Register;

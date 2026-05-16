import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../index.css';
import welcomeSound from '../assets/sounds/welcome.mp3';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await axios.post('/api/login', {
                username,
                password
            });

            if (res.data.status === 'success') {
                const role = res.data.role || 'customer';
                localStorage.setItem('username', username);
                localStorage.setItem('role', role);
                localStorage.setItem('loggedin', 'true');
                
                // Only play welcome music for customers
                if (role !== 'admin') {
                    new Audio(welcomeSound).play().catch(() => {});
                }
                
                navigate('/home');
            } else {
                setError(res.data.message || 'Invalid credentials');
            }
        } catch (err) {
            console.error(err);
            setError('Unable to allow login at this time. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            backgroundColor: '#f8fafc',
            fontFamily: "'Outfit', sans-serif"
        }}>
            {/* Left: Decorative Hero Image (Hidden on small screens) */}
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
                    background: 'linear-gradient(rgba(79, 70, 229, 0.4), rgba(79, 70, 229, 0.8))',
                    zIndex: 1
                }}></div>
                <div style={{ position: 'relative', zIndex: 2, maxWidth: '500px' }}>
                    <h2 style={{ fontSize: '3.5rem', fontWeight: '800', lineHeight: '1', marginBottom: '24px' }}>Self Shopping Smart Trolley</h2>
                    <p style={{ fontSize: '1.25rem', opacity: '0.9', fontWeight: '400' }}>Experience the future of retail with autonomous synchronization and AI-managed inventories.</p>
                </div>
            </div>

            {/* Right: Login Form */}
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
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                         <div style={{
                            width: '56px', height: '56px', margin: '0 auto 24px', borderRadius: '16px',
                            background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: '1.75rem', fontWeight: '800'
                         }}>S</div>
                         <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#111827', marginBottom: '10px', letterSpacing: '-0.02em' }}>Welcome Back</h1>
                         <p style={{ color: '#6b7280', fontSize: '1rem' }}>Verify your identity to proceed</p>
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

                        <div style={{ marginBottom: '24px' }}>
                            <label htmlFor="username" style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Username</label>
                            <input
                                id="username"
                                type="text"
                                className="search-input"
                                placeholder="Enter your username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '14px 18px',
                                    borderRadius: '12px',
                                    border: '1px solid #d1d5db',
                                    fontSize: '1rem',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '36px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <label htmlFor="password" style={{ fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>Password</label>
                                <span 
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{ fontSize: '0.85rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: '700' }}
                                >
                                    {showPassword ? 'Hide' : 'Show'}
                                </span>
                            </div>
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                className="search-input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '14px 18px',
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
                            disabled={isLoading}
                            style={{
                                width: '100%',
                                padding: '16px',
                                borderRadius: '14px',
                                fontSize: '1.1rem',
                                fontWeight: '700',
                                letterSpacing: '0.01em',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '12px',
                                cursor: 'pointer',
                                border: 'none'
                            }}
                        >
                            {isLoading ? 'Verifying...' : 'Sign In'}
                        </button>
                    </form>

                    <div style={{ marginTop: '36px', textAlign: 'center', fontSize: '1rem', color: '#6b7280' }}>
                        Don't have an account? {' '}
                        <Link to="/register" style={{ color: 'var(--primary)', fontWeight: '700', textDecoration: 'none' }}>
                            Create one
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

export default Login;

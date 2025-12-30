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
            // Send as JSON, which the backend's `request.is_json` logic handles correctly
            const response = await axios.post('/login', {
                username,
                password
            });

            if (response.data.status === 'success') {
                const welcomeAudio = new Audio(welcomeSound);
                welcomeAudio.play().catch(e => console.log('Welcome sound error', e));

                localStorage.setItem('loggedin', 'true');
                localStorage.setItem('username', username);
                const role = response.data.role || 'customer';
                localStorage.setItem('role', role);

                navigate('/home');
            } else {
                setError(response.data.message || 'Invalid credentials');
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
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            background: '#f0f4ff', // Light lavender background from mockup
            fontFamily: "'Outfit', sans-serif"
        }}>
            <div className="card fade-in" style={{
                width: '100%',
                maxWidth: '400px',
                background: 'white',
                borderRadius: '8px', // Slightly sharper corners as per mockup
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
                padding: '40px 30px',
                textAlign: 'center'
            }}>
                {/* Custom Icon: Two Bags (Outline + Gradient) */}
                <div style={{ marginBottom: '24px', position: 'relative', height: '80px', width: '80px', margin: '0 auto 24px auto' }}>
                    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Back Bag (Outlined) */}
                        <path d="M25 30V22C25 18.134 28.134 15 32 15H42C45.866 15 49 18.134 49 22V30H25Z" stroke="#6366f1" strokeWidth="3" />
                        <rect x="25" y="30" width="30" height="34" rx="4" stroke="#6366f1" strokeWidth="3" fill="transparent" />

                        {/* Front Bag (Gradient) */}
                        <g filter="url(#filter0_d)">
                            <path d="M40 38V28C40 24.134 43.134 21 47 21H57C60.866 21 64 24.134 64 28V38H40Z" fill="url(#grad1)" />
                            <rect x="40" y="38" width="36" height="34" rx="4" fill="url(#grad1)" />
                        </g>

                        <defs>
                            <linearGradient id="grad1" x1="40" y1="21" x2="76" y2="72" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#ec4899" />
                                <stop offset="1" stopColor="#a855f7" />
                            </linearGradient>
                            <filter id="filter0_d" x="36" y="21" width="44" height="58" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                                <feFlood floodOpacity="0" result="BackgroundImageFix" />
                                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                                <feOffset dy="2" />
                                <feGaussianBlur stdDeviation="2" />
                                <feComposite in2="hardAlpha" operator="out" />
                                <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0" />
                                <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
                                <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
                            </filter>
                        </defs>
                    </svg>
                </div>

                <h1 style={{
                    fontSize: '1.75rem',
                    fontWeight: '700',
                    color: '#1e293b',
                    marginBottom: '8px'
                }}>Welcome Back</h1>

                <p style={{
                    color: '#64748b',
                    fontSize: '0.95rem',
                    marginBottom: '32px'
                }}>Enter your details to access your account</p>

                {error && (
                    <div style={{
                        background: '#fee2e2',
                        border: '1px solid #fecaca',
                        color: '#b91c1c',
                        padding: '10px',
                        borderRadius: '6px',
                        marginBottom: '20px',
                        fontSize: '0.875rem'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ textAlign: 'left' }} autoComplete="off">
                    {/* Dummy inputs to trick browser autofill */}
                    <input type="text" style={{ display: 'none' }} />
                    <input type="password" style={{ display: 'none' }} />

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '6px',
                            fontWeight: '600',
                            color: '#334155',
                            fontSize: '0.9rem'
                        }}>Username</label>
                        <input
                            type="text"
                            name="user_login_credential"
                            required
                            autoComplete="off"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: '8px', // Matches mockup
                                border: '1px solid #cbd5e1',
                                fontSize: '1rem',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                                backgroundColor: 'white'
                            }}
                            placeholder="Enter your username"
                            onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                            onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                        />
                    </div>

                    <div style={{ marginBottom: '32px', position: 'relative' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '6px',
                            fontWeight: '600',
                            color: '#334155',
                            fontSize: '0.9rem'
                        }}>Password</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? "text" : "password"}
                                name="user_password_credential"
                                required
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px 46px 12px 16px', // Extra padding on right for icon
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    transition: 'border-color 0.2s',
                                    backgroundColor: 'white'
                                }}
                                placeholder="••••••••"
                                onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#64748b'
                                }}
                            >
                                {showPassword ? (
                                    // Eye Slash (Hide)
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                                    </svg>
                                ) : (
                                    // Eye (Show)
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn"
                        style={{
                            width: '100%',
                            padding: '14px',
                            fontSize: '1rem',
                            fontWeight: '600',
                            background: 'linear-gradient(90deg, #8b5cf6 0%, #d946ef 100%)', // Purple to Pink gradient
                            color: 'white',
                            borderRadius: '50px', // Pill shape
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                        }}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div style={{ marginTop: '24px', fontSize: '0.9rem', color: '#64748b' }}>
                    Don't have an account? <Link to="/register" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: '600' }}>Create one</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;

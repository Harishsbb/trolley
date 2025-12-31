import React from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../index.css';

const Home = () => {
    const navigate = useNavigate();
    const username = localStorage.getItem('username') || 'User';

    const handleLogout = async () => {
        try {
            await axios.post('/logout');
            localStorage.removeItem('loggedin');
            localStorage.removeItem('username');
            navigate('/login');
        } catch (error) {
            console.error('Logout failed', error);
            localStorage.removeItem('loggedin');
            navigate('/login');
        }
    };

    const role = localStorage.getItem('role') || 'customer';

    const allActions = [
        { title: 'Scan Product', icon: '📸', path: '/scanner', desc: 'Scan barcodes to add items', roles: ['customer'] },
        { title: 'Product Gallery', icon: '🔍', path: '/search', desc: 'Browse and search inventory', roles: ['customer'] },
        { title: 'Manage Stock', icon: '📦', path: '/dashboard', desc: 'Update quantity and prices', roles: ['admin'] }
    ];

    const actions = allActions.filter(action => action.roles.includes(role));

    return (
        <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
            {/* Header */}
            <header style={{
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid var(--border-color)',
                position: 'sticky',
                top: 0,
                zIndex: 10
            }}>
                <div className="container header-content" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 0'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            fontSize: '1.5rem',
                            background: 'var(--primary)',
                            color: 'white',
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            S
                        </div>
                        <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>Smart Shopping</h1>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="btn btn-ghost"
                        style={{ fontSize: '0.9rem', padding: '8px 16px' }}
                    >
                        Logout
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="container fade-in" style={{ marginTop: '40px' }}>
                <div style={{ marginBottom: '40px', textAlign: 'center' }}>
                    <h2 className="section-title">Hello, {username} 👋</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>What would you like to do today?</p>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '24px',
                    maxWidth: '1000px',
                    margin: '0 auto'
                }}>
                    {actions.map((action, index) => (
                        <div
                            key={index}
                            onClick={() => navigate(action.path)}
                            className="product-card"
                            style={{
                                cursor: 'pointer',
                                alignItems: 'center',
                                textAlign: 'center',
                                padding: '40px 24px'
                            }}
                        >
                            <div style={{
                                fontSize: '3.5rem',
                                marginBottom: '20px',
                                background: '#f1f5f9',
                                width: '100px',
                                height: '100px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {action.icon}
                            </div>
                            <h3 style={{
                                fontSize: '1.25rem',
                                fontWeight: '700',
                                color: 'var(--text-main)',
                                margin: '0 0 8px 0'
                            }}>
                                {action.title}
                            </h3>
                            <p style={{
                                color: 'var(--text-muted)',
                                margin: 0,
                                lineHeight: '1.5'
                            }}>
                                {action.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </main>

            <footer style={{
                textAlign: 'center',
                color: 'var(--text-muted)',
                marginTop: '60px',
                padding: '20px',
                fontSize: '0.9rem'
            }}>
                <p>&copy; {new Date().getFullYear()} Smart Shopping System. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default Home;

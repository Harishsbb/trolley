import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../index.css';

const Home = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');

    useEffect(() => {
        const storedUser = localStorage.getItem('username');
        if (!storedUser) {
            navigate('/login');
        } else {
            setUsername(storedUser);
        }
    }, [navigate]);

    const handleLogout = async () => {
        try {
            await axios.post('/api/logout');
            localStorage.clear();
            navigate('/login');
        } catch (error) {
            console.error('Logout failed', error);
            localStorage.clear();
            navigate('/login');
        }
    };

    const role = localStorage.getItem('role') || 'customer';

    const allActions = [
        { title: 'Scan Product', icon: '📸', path: '/scanner', desc: 'Scan barcodes to add items instantly', roles: ['customer'] },
        { title: 'Product Gallery', icon: '🔍', path: '/search', desc: 'Browse and search our full inventory', roles: ['customer'] },
        { title: 'Purchase History', icon: '📜', path: '/history', desc: 'View your previous transactions and receipts', roles: ['customer'] },
        { title: 'Manage Stock', icon: '📦', path: '/dashboard', desc: 'Update quantity and store pricing', roles: ['admin'] }
    ];

    const actions = allActions.filter(action => action.roles.includes(role));

    const stats = role === 'admin' ? [
        { label: 'Total Products', value: '124', icon: '📦', color: '#4f46e5' },
        { label: 'Low Stock', value: '12', icon: '⚠️', color: '#f59e0b' },
        { label: 'Categories', value: '8', icon: '📂', color: '#ec4899' }
    ] : [
        { label: 'Loyalty Points', value: '450', icon: '✨', color: '#4f46e5' },
        { label: 'Recent Orders', value: '3', icon: '🛍️', color: '#10b981' },
        { label: 'Saves', value: '15', icon: '💖', color: '#ec4899' }
    ];

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Outfit', sans-serif" }}>
            {/* Header */}
            <header style={{
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
                position: 'sticky',
                top: 0,
                zIndex: 100,
                padding: '12px 24px'
            }}>
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '36px', height: '36px', borderRadius: '10px',
                            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', 
                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.1rem', fontWeight: '800', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
                        }}>S</div>
                        <h1 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>Smart Trolley</h1>
                    </div>
                    <button
                        onClick={handleLogout}
                        style={{
                            background: '#fee2e2', border: 'none', color: '#ef4444',
                            padding: '8px 16px', borderRadius: '12px',
                            fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem',
                            transition: 'all 0.2s'
                        }}
                    >
                        Sign Out
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 24px' }}>
                
                {/* Hero Section */}
                <div style={{
                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                    borderRadius: '32px',
                    padding: '48px',
                    marginBottom: '40px',
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                }}>
                    <div style={{ position: 'relative', zIndex: 2 }}>
                        <h2 style={{ fontSize: '2.5rem', fontWeight: '800', margin: '0 0 12px' }}>Welcome back, {username}!</h2>
                        <p style={{ color: '#94a3b8', fontSize: '1.1rem', maxWidth: '500px', lineHeight: '1.6' }}>
                           Your {role === 'admin' ? 'store management' : 'shopping'} dashboard is ready. Manage your inventory and check metrics in real-time.
                        </p>
                    </div>
                    {/* Abstract background shape */}
                    <div style={{
                        position: 'absolute', top: '-20%', right: '-10%',
                        width: '400px', height: '400px', borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(79, 70, 229, 0.15) 0%, transparent 70%)',
                        zIndex: 1
                    }}></div>
                </div>

                {/* Stats Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '24px',
                    marginBottom: '48px'
                }}>
                    {stats.map((stat, index) => (
                        <div key={index} className="card" style={{
                            background: 'white', borderRadius: '24px', padding: '24px',
                            display: 'flex', alignItems: 'center', gap: '20px',
                            border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                        }}>
                            <div style={{
                                width: '56px', height: '56px', borderRadius: '16px',
                                background: `${stat.color}10`, color: stat.color,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.5rem'
                            }}>{stat.icon}</div>
                            <div>
                                <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: '600' }}>{stat.label}</div>
                                <div style={{ color: '#1e293b', fontSize: '1.5rem', fontWeight: '800' }}>{stat.value}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Quick Actions */}
                <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1e293b', marginBottom: '24px' }}>Quick Actions</h3>
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '24px'
                }}>
                    {actions.map((action, index) => (
                        <div
                            key={index}
                            onClick={() => navigate(action.path)}
                            className="card fade-in"
                            style={{
                                cursor: 'pointer',
                                background: 'white',
                                borderRadius: '24px',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                                width: '100%',
                                maxWidth: '340px'
                            }}
                        >
                            <div style={{
                                height: '100px',
                                background: action.title === 'Scan Product' ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' :
                                           action.title === 'Product Gallery' ? 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)' :
                                           action.title === 'Purchase History' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' :
                                           'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '2.5rem'
                            }}>
                                <span>{action.icon}</span>
                            </div>
                            <div style={{ padding: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: '800', color: '#1e293b' }}>{action.title}</h3>
                                    <span style={{ fontSize: '1.2rem' }}>→</span>
                                </div>
                                <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem', lineHeight: '1.5' }}>{action.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <footer style={{ marginTop: '80px', textAlign: 'center', paddingBottom: '40px' }}>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>© 2026 Smart Trolley System. High Performance Admin Analytics.</p>
                </footer>
            </main>
        </div>
    );
};

export default Home;

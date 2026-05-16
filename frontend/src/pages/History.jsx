import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../index.css';

const History = () => {
    const navigate = useNavigate();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedReceipt, setSelectedReceipt] = useState(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await axios.get('/api/get-history');
                setHistory(res.data);
            } catch (err) {
                console.error("Error fetching history", err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    return (
        <div style={{ minHeight: '100vh', background: 'transparent', padding: '40px 20px' }}>
            {/* Premium Receipt Modal */}
            {selectedReceipt && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 20000, backdropFilter: 'blur(10px)'
                }} onClick={() => setSelectedReceipt(null)}>
                    <div className="fade-in" style={{
                        width: '95%', maxWidth: '480px', maxHeight: '90vh', overflow: 'hidden',
                        display: 'flex', flexDirection: 'column', 
                        background: 'white', borderRadius: '40px',
                        boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.25)',
                        position: 'relative'
                    }} onClick={e => e.stopPropagation()}>
                        
                        {/* Modal Header */}
                        <div style={{ 
                            padding: '40px 32px 24px', 
                            textAlign: 'center', 
                            background: 'linear-gradient(to bottom, #f8fafc, white)',
                            borderBottom: '1px solid #f1f5f9' 
                        }}>
                            <div style={{
                                width: '64px', height: '64px', borderRadius: '50%', 
                                background: '#dcfce7', color: '#15803d',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                margin: '0 auto 16px', fontSize: '1.8rem',
                                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05)'
                            }}>✓</div>
                            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.75rem', fontWeight: '900', letterSpacing: '-0.03em' }}>Receipt</h3>
                            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600', marginTop: '8px', opacity: 0.8 }}>
                                TRANSACTION ID: <span style={{ color: '#1e293b' }}>#{selectedReceipt.id.slice(-8).toUpperCase()}</span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>{selectedReceipt.date}</div>
                        </div>

                        {/* Items Section */}
                        <div className="custom-scrollbar" style={{ padding: '24px 32px', overflowY: 'auto', flex: 1, background: 'white' }}>
                            <div style={{ marginBottom: '12px', fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Items Purchased
                            </div>
                            {selectedReceipt.items.map((item, idx) => (
                                <div key={idx} style={{ 
                                    display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 0',
                                    borderBottom: idx === selectedReceipt.items.length - 1 ? 'none' : '1px dashed #e2e8f0'
                                }}>
                                    <div style={{ 
                                        width: '56px', height: '56px', borderRadius: '16px', background: 'white',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                                        border: '1px solid #f1f5f9', flexShrink: 0,
                                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
                                    }}>
                                        <img src={item.image || '/static/images/placeholder.svg'} style={{ width: '85%', height: '85%', objectFit: 'contain' }} alt="" />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.95rem', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>
                                            {item.quantity} × <span style={{ color: '#94a3b8' }}>₹{item.price}</span>
                                        </div>
                                    </div>
                                    <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '1rem' }}>
                                        ₹{(item.price * item.quantity).toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Summary Footer */}
                        <div style={{ padding: '24px 32px 40px', background: 'white', borderTop: '2px solid #f8fafc' }}>
                            <div style={{ 
                                padding: '24px', borderRadius: '24px', 
                                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                                color: 'white',
                                boxShadow: '0 10px 30px -10px rgba(30, 41, 59, 0.4)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', opacity: 0.7, fontSize: '0.9rem' }}>
                                    <span>Subtotal ({selectedReceipt.item_count} items)</span>
                                    <span>₹{parseFloat(selectedReceipt.total_price).toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', opacity: 0.7, fontSize: '0.9rem' }}>
                                    <span>Tax & Service</span>
                                    <span>₹0.00</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                    <span style={{ fontWeight: '600', fontSize: '1rem' }}>Grand Total</span>
                                    <span style={{ fontSize: '1.75rem', fontWeight: '900', color: '#22c55e' }}>₹{parseFloat(selectedReceipt.total_price).toFixed(2)}</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedReceipt(null)}
                                style={{ 
                                    width: '100%', marginTop: '24px', padding: '18px', borderRadius: '20px',
                                    background: '#f1f5f9', color: '#475569', fontWeight: '700', border: 'none',
                                    cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.95rem'
                                }}
                                onMouseEnter={(e) => e.target.style.background = '#e2e8f0'}
                                onMouseLeave={(e) => e.target.style.background = '#f1f5f9'}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ maxWidth: '850px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '48px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <button 
                            onClick={() => navigate('/home')}
                            className="btn-ghost"
                            style={{
                                width: '48px', height: '48px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.4rem'
                            }}
                        >
                            ←
                        </button>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: '900', color: '#1e293b', letterSpacing: '-0.04em' }}>History</h1>
                            <p style={{ margin: 0, color: '#64748b', fontWeight: '600' }}>Your recent shopping activity</p>
                        </div>
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>Total Spent</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#4f46e5' }}>
                            ₹{history.reduce((acc, curr) => acc + parseFloat(curr.total_price), 0).toFixed(2)}
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '100px 0', color: '#94a3b8', fontSize: '1.1rem', fontWeight: '600' }}>
                        <div className="spinner" style={{ marginBottom: '16px', fontSize: '2rem' }}>⏳</div>
                        Organizing your receipts...
                    </div>
                ) : history.length === 0 ? (
                    <div className="fade-in" style={{ 
                        background: 'white', padding: '80px 40px', textAlign: 'center', 
                        borderRadius: '40px', boxShadow: '0 20px 40px -15px rgba(0,0,0,0.05)',
                        border: '1px solid #f1f5f9'
                    }}>
                        <div style={{ fontSize: '5rem', marginBottom: '24px', opacity: 0.1 }}>🧾</div>
                        <h3 style={{ margin: '0 0 12px', color: '#1e293b', fontSize: '1.5rem', fontWeight: '800' }}>No History Found</h3>
                        <p style={{ color: '#64748b', margin: '0 auto 32px', maxWidth: '300px', fontWeight: '500' }}>Start your first shopping trip to see your receipts here!</p>
                        <button 
                            className="btn btn-primary" 
                            style={{ padding: '16px 40px', fontSize: '1rem' }}
                            onClick={() => navigate('/scanner')}
                        >
                            Open Scanner
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '20px' }}>
                        {history.map((entry, index) => (
                            <div 
                                key={index} 
                                className="fade-in" 
                                style={{ 
                                    background: 'white', padding: '28px 32px', borderRadius: '32px',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    boxShadow: '0 10px 20px -5px rgba(0,0,0,0.03)',
                                    border: '1px solid #f1f5f9',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = '0 25px 40px -15px rgba(0,0,0,0.08)';
                                    e.currentTarget.style.borderColor = '#4f46e533';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(0,0,0,0.03)';
                                    e.currentTarget.style.borderColor = '#f1f5f9';
                                }}
                                onClick={() => setSelectedReceipt(entry)}
                            >
                                <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                                    <div style={{ 
                                        width: '60px', height: '60px', borderRadius: '20px', background: '#f8fafc',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
                                        color: '#4f46e5'
                                    }}>
                                        📄
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '4px', fontWeight: '700' }}>{entry.date}</div>
                                        <div style={{ fontWeight: '800', fontSize: '1.2rem', color: '#1e293b', marginBottom: '2px' }}>
                                            Order #{entry.id.slice(-6).toUpperCase()}
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <span style={{ 
                                                fontSize: '0.7rem', color: '#4f46e5', background: '#eef2ff', 
                                                padding: '2px 8px', borderRadius: '6px', fontWeight: '800' 
                                            }}>
                                                {entry.item_count} ITEMS
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#22c55e', letterSpacing: '-0.02em' }}>₹{parseFloat(entry.total_price).toFixed(2)}</div>
                                    <div style={{ color: '#4f46e5', fontWeight: '800', fontSize: '0.85rem', marginTop: '4px' }}>
                                        View Receipt →
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default History;

import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import '../index.css';

const ProductDetails = () => {
    const { id } = useParams();
    const location = useLocation();
    const [product, setProduct] = useState(location.state?.product || null);
    const [loading, setLoading] = useState(!product);

    useEffect(() => {
        if (!product) {
            // Check cache first
            const cachedData = localStorage.getItem('snapshop_products_cache');
            if (cachedData) {
                const allProducts = JSON.parse(cachedData);
                // Ensure we compare strings properly (ObjectId is string)
                const found = allProducts.find(p => String(p.id) === String(id));
                if (found) {
                    setProduct(found);
                    setLoading(false);
                    return;
                }
            }

            // Fallback to fetch if not in cache (fresh catalog fetch)
            const fetchProduct = async () => {
                try {
                    const res = await axios.get('/search?query=');
                    const found = res.data.find(p => String(p.id) === String(id));
                    if (found) {
                        setProduct(found);
                        // Update cache while we're at it
                        localStorage.setItem('snapshop_products_cache', JSON.stringify(res.data));
                    }
                } catch (err) {
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            };
            fetchProduct();
        } else {
            setLoading(false);
        }
    }, [id, product]);

    if (loading) return <div style={{ color: 'white', textAlign: 'center', marginTop: '50px' }}>Loading...</div>;
    if (!product) return <div style={{ color: 'white', textAlign: 'center', marginTop: '50px' }}>Product not found. <Link to="/search" style={{ color: '#fff', textDecoration: 'underline' }}>Go back</Link></div>;

    return (
        <div className="container fade-in" style={{
            paddingTop: '20px',
            minHeight: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
        }}>
            <div className="card" style={{
                backgroundColor: 'white',
                display: 'flex',
                flexDirection: 'column',
                maxWidth: '1200px',
                width: '95%',
                height: '92vh', // Tweak height
                position: 'relative',
                padding: '30px',
                overflow: 'hidden'
            }}>

                {/* Header Title */}
                <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '20px', fontSize: '2rem', flexShrink: 0 }}>
                    Product Location: {product.location || 'Section A'}
                </h2>

                <div style={{ display: 'flex', flex: 1, gap: '40px', height: '100%', overflow: 'hidden' }}>

                    {/* Left Side: Shelf Grid */}
                    <div style={{ flex: '2 1 600px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(5, 1fr)',
                            gridTemplateRows: 'repeat(4, 1fr)',
                            gap: '15px',
                            width: '100%',
                            height: '100%',
                            maxHeight: '100%',
                            aspectRatio: '5/4' // Keeps shape
                        }}>
                            {/* Create a 5x4 grid (20 slots) */}
                            {[...Array(20)].map((_, i) => {
                                // Deterministic slot position based on product ID hash
                                const productHash = String(product.id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                                const activeSlot = productHash % 20;
                                const isActive = (i === activeSlot);

                                return (
                                    <div
                                        key={i}
                                        style={{
                                            backgroundColor: isActive ? '#3498db' : '#ecf0f1',
                                            borderRadius: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: isActive ? 'white' : '#bdc3c7',
                                            fontWeight: 'bold',
                                            border: isActive ? '4px solid #2980b9' : '1px solid #dcdcdc',
                                            position: 'relative',
                                            boxShadow: isActive ? '0 0 20px rgba(52, 152, 219, 0.6)' : 'none',
                                            transform: isActive ? 'scale(1.02)' : 'scale(1)', // Reduced scale
                                            transition: 'all 0.3s ease',
                                            zIndex: isActive ? 10 : 1,
                                            overflow: 'hidden' // Important!
                                        }}
                                    >
                                        {isActive ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', padding: '5px' }}>
                                                <img
                                                    src={product.image}
                                                    alt=""
                                                    style={{
                                                        maxWidth: '80%',
                                                        maxHeight: '80%',
                                                        objectFit: 'contain',
                                                        filter: 'drop-shadow(0 5px 5px rgba(0,0,0,0.2))'
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <span style={{ fontSize: '1.2rem', opacity: 0.5 }}>{i + 1}</span>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Right Side: Product Info */}
                    <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', paddingLeft: '20px', justifyContent: 'center', overflowY: 'auto' }}>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div style={{ marginBottom: 'auto' }}>
                                <h1 style={{ color: '#2c3e50', fontSize: '3rem', margin: '0 0 10px 0', lineHeight: 1.2 }}>{product.name}</h1>
                                <p style={{ fontSize: '2.5rem', color: '#e74c3c', fontWeight: 'bold', margin: '0 0 20px 0' }}>₹{product.price}</p>
                            </div>

                            {/* Location Details Card */}
                            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-color)', marginBottom: '32px' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                            <circle cx="12" cy="10" r="3" />
                                        </svg>
                                        Precise Location
                                    </div>
                                </h3>

                                {(() => {
                                    // Calculate deterministic location
                                    const hash = String(product.id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                                    const slotIndex = hash % 20;

                                    const rackNum = (hash % 4) + 1; // Random Rack 1-4
                                    const rowNum = Math.floor(slotIndex / 5) + 1; // Row 1-4
                                    const colNum = (slotIndex % 5) + 1; // Col 1-5

                                    return (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                                            <div style={{ background: '#f8fafc', padding: '16px 8px', borderRadius: '12px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                                                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Rack</div>
                                                <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--primary)' }}>{rackNum}</div>
                                            </div>
                                            <div style={{ background: '#f8fafc', padding: '16px 8px', borderRadius: '12px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                                                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Row</div>
                                                <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)' }}>{rowNum}</div>
                                            </div>
                                            <div style={{ background: '#f8fafc', padding: '16px 8px', borderRadius: '12px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                                                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Column</div>
                                                <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)' }}>{colNum}</div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        <div style={{ marginTop: 'auto' }}>
                            <Link to="/scanner" className="btn btn-primary" style={{ display: 'block', width: '100%', padding: '25px', fontSize: '1.6rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px', borderRadius: '12px', boxShadow: '0 10px 20px rgba(39, 174, 96, 0.3)' }}>
                                Start Scanning
                            </Link>
                            <div style={{ marginTop: '20px', textAlign: 'center' }}>
                                <Link to="/search" style={{ color: '#7f8c8d', textDecoration: 'none', fontSize: '1.1rem' }}>&larr; Back to Gallery</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetails;

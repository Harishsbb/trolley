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
            // Fetch all products and find the one with the matching ID
            const fetchProduct = async () => {
                try {
                    const res = await axios.get('/search?query=');
                    // Ensure we compare strings properly (ObjectId is string)
                    const found = res.data.find(p => String(p.id) === String(id));
                    if (found) {
                        setProduct(found);
                    }
                } catch (err) {
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            };
            fetchProduct();
        }
    }, [id, product]);

    if (loading) return <div style={{ color: 'white', textAlign: 'center', marginTop: '50px' }}>Loading...</div>;
    if (!product) return <div style={{ color: 'white', textAlign: 'center', marginTop: '50px' }}>Product not found. <Link to="/search" style={{ color: '#fff', textDecoration: 'underline' }}>Go back</Link></div>;

    return (
        <div className="container fade-in" style={{ paddingTop: '20px', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
            <div className="card" style={{ backgroundColor: 'white', display: 'flex', flexDirection: 'column', maxWidth: '1000px', width: '100%', position: 'relative', padding: '30px' }}>

                {/* Header Title */}
                <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '30px' }}>
                    Product Location: {product.location || 'Unknown Shelf'}
                </h2>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '40px' }}>

                    {/* Left Side: Shelf Grid */}
                    <div style={{ flex: '2 1 500px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '15px' }}>
                            {/* Create a 5x4 grid (20 slots) as a visual representation */}
                            {[...Array(20)].map((_, i) => {
                                // Simple logic to determine "active" shelf based on location string or index
                                // For now, let's say the product is at index 5 (Shelf 2, Row 1) or parse 'Shelf 3'
                                const shelfNum = parseInt(product.location?.replace('Shelf ', '') || '0');
                                const isActive = (i + 1) === shelfNum || (i === 5); // Example: Highlight 6th box as demo if parsing fails

                                return (
                                    <div
                                        key={i}
                                        style={{
                                            height: '80px',
                                            backgroundColor: isActive ? '#3498db' : '#ecf0f1',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: isActive ? 'white' : '#bdc3c7',
                                            fontWeight: 'bold',
                                            border: isActive ? '2px solid #2980b9' : 'none'
                                        }}
                                    >
                                        {isActive ? <img src={product.image} alt="" style={{ height: '60px', objectFit: 'contain' }} /> : `Slot ${i + 1}`}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Right Side / Bottom: Product Info & Action */}
                    <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                            <h1 style={{ color: '#2c3e50', fontSize: '1.8rem' }}>{product.name}</h1>
                            <p style={{ fontSize: '1.5rem', color: '#e74c3c', fontWeight: 'bold' }}>₹{product.price}</p>
                            <p style={{ color: '#7f8c8d' }}>{product.description}</p>
                        </div>

                        <div style={{ marginTop: '30px', textAlign: 'center' }}>
                            <Link to="/scanner" className="btn btn-primary" style={{ display: 'block', width: '100%', padding: '15px', fontSize: '1.2rem' }}>
                                Go to Scanning
                            </Link>
                            <div style={{ marginTop: '10px' }}>
                                <Link to="/search" style={{ color: '#95a5a6' }}>Back to Gallery</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetails;

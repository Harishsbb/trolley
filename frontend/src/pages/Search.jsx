import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../index.css';

const Search = () => {
    const [query, setQuery] = useState('');
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchProducts = async (searchQuery = '') => {
        setLoading(true);
        try {
            const res = await axios.get(`/search?query=${searchQuery}`);
            setProducts(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchProducts(query);
    };

    const clearSearch = () => {
        setQuery('');
        fetchProducts('');
    };

    return (
        <div className="container" style={{ paddingTop: '20px', minHeight: '100vh', backgroundColor: '#fff', maxWidth: '1200px', margin: '0 auto' }}>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h1 style={{ color: '#3498db', fontSize: '2.5rem', fontWeight: '300', margin: '0' }}>Product Gallery</h1>
            </div>

            {/* Search Bar */}
            <div style={{ marginBottom: '40px' }}>
                <form onSubmit={handleSearch} style={{ position: 'relative', maxWidth: '800px', margin: '0 auto' }}>
                    <input
                        type="text"
                        placeholder="Search for products..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '15px 50px 15px 20px',
                            borderRadius: '5px',
                            border: '1px solid #3498db',
                            fontSize: '1.2rem',
                            outline: 'none',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                        }}
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={clearSearch}
                            style={{
                                position: 'absolute',
                                right: '15px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                color: '#3498db',
                                fontSize: '1.5rem',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            &times;
                        </button>
                    )}
                </form>
            </div>

            {/* Category Title (Static for now to match UI) */}
            <div style={{ borderBottom: '2px solid #3498db', marginBottom: '30px', paddingBottom: '10px' }}>
                <h2 style={{ color: '#3498db', margin: 0, fontWeight: '400' }}>
                    {query ? 'Search Results' : 'Daily Use Products'}
                </h2>
            </div>

            {/* Results Grid */}
            {loading ? (
                <div style={{ textAlign: 'center', color: '#7f8c8d', fontSize: '1.5rem' }}>Loading products...</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '30px' }}>
                    {products.map((product) => (
                        <div key={product.id} className="card fade-in" style={{
                            backgroundColor: 'white',
                            padding: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            border: '1px solid #eee',
                            borderRadius: '10px',
                            boxShadow: '0 5px 15px rgba(0,0,0,0.05)',
                            transition: 'transform 0.2s',
                            alignItems: 'flex-start' // Left align content
                        }}>
                            <div style={{ width: '100%', height: '200px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px' }}>
                                <img
                                    src={product.image}
                                    alt={product.name}
                                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                    onError={(e) => { e.target.src = '/static/images/placeholder.svg'; }}
                                />
                            </div>

                            <h3 style={{ fontSize: '1.4rem', margin: '0 0 5px 0', color: '#333', fontWeight: 'bold' }}>{product.name}</h3>
                            <p style={{ color: '#e74c3c', fontWeight: 'bold', fontSize: '1.2rem', margin: '0 0 10px 0' }}>₹{product.price}</p>
                            <p style={{ color: '#7f8c8d', fontSize: '0.9rem', marginBottom: '20px', lineHeight: '1.4' }}>
                                {product.description && product.description.length > 50
                                    ? product.description.substring(0, 50) + '...'
                                    : (product.description || 'No description available.')}
                            </p>

                            <Link to={`/product/${product.id}`} className="btn btn-primary" style={{
                                marginTop: 'auto',
                                width: 'auto',
                                padding: '10px 20px',
                                backgroundColor: '#3498db',
                                fontSize: '1rem'
                            }}>
                                View Shelf
                            </Link>
                        </div>
                    ))}
                    {products.length === 0 && (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#7f8c8d', fontSize: '1.2rem', marginTop: '50px' }}>
                            No products found matching "{query}".
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Search;

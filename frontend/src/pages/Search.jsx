import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../index.css';

const Search = () => {
    const [query, setQuery] = useState('');
    const [allProducts, setAllProducts] = useState([]);
    const [displayedProducts, setDisplayedProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Helper: Define Categories Heuristic (Moved up for reuse)
    const getCategory = (product) => {
        // Respect stored category if it exists
        if (product.category && product.category !== 'Uncategorized') return product.category;

        const n = (product.name || '').toLowerCase();

        // Snacks & Breakfast
        if (n.match(/biscuit|cookie|rusk|wafer|cracker|good day|tiger|parle|britannia|sunfeast|treat|marie|monaco|oreo|bourbon/)) return 'Snacks';
        if (n.match(/chip|lays|lay's|bingo|kurkure|puff|nacho|popcorn|snack|mixture|bhujia|sev|murukku/)) return 'Snacks';
        if (n.match(/chocolate|choco|candy|bar|sweet|cake|brownie|muffin|donut|dessert|ice cream|dark fantasy|mom's magic|hide & seek/)) return 'Snacks';
        if (n.match(/noodle|pasta|maggi|yippee|top ramen|soup|instant|cup|flake|cereal|kellogg|oats|breakfast/)) return 'Snacks';

        // Beverages (Use word boundaries \b to avoid matches like 'fanta' inside 'fantasy')
        if (n.match(/\b(juice|drink|soda|cola|coke|pepsi|sprite|fanta|limca|thums up|7up|mirinda|maaza|slice|frooti|appy|fizz)\b/)) return 'Beverages';
        if (n.match(/\b(water|coffee|tea|milk|shake|smoothie|brew|red bull|energy|squash|syrup|bot|bottle)\b/)) return 'Beverages';

        // Household
        if (n.match(/soap|shampoo|conditioner|wash|cleaner|detergent|laundry|rin|surf|ariel|tide|vim|dettol|lysol|harpic|vanish/)) return 'Household & Personal Care';
        if (n.match(/tooth|paste|brush|colgate|pepsodent|sensodyne|close up|himalaya|mouthwash|shave|razor|blade|tissue|napkin|diaper/)) return 'Household & Personal Care';
        if (n.match(/perfume|deo|spray|scent|cream|lotion|moisturizer|powder|cosmetic|face|body/)) return 'Household & Personal Care';

        // Pantry
        if (n.match(/oil|ghee|butter|cheese|paneer|curd|yogurt|cream/)) return 'Pantry & Dairy';
        if (n.match(/rice|dal|lentil|pulse|flour|atta|maida|sooji|sugar|salt|spice|masala|chilli|turmeric|honey|jam|sauce|ketchup/)) return 'Pantry & Dairy';

        return 'Others';
    };

    // Fetch all products with cache-first strategy
    useEffect(() => {
        const fetchAllProducts = async () => {
            // 1. Try to load from cache immediately
            const cached = localStorage.getItem('snapshop_products_cache');
            if (cached) {
                const parsed = JSON.parse(cached);
                setAllProducts(parsed);
                setDisplayedProducts(parsed);
                setLoading(false); // Show content immediately
            }

            // 2. Fetch fresh data in background (or foreground if no cache)
            try {
                const res = await axios.get('/search?query=');
                setAllProducts(res.data);
                if (!query) {
                    setDisplayedProducts(res.data);
                }
                localStorage.setItem('snapshop_products_cache', JSON.stringify(res.data));
            } catch (err) {
                console.error("Error fetching products:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAllProducts();
    }, []);

    // Levenshtein distance for fuzzy matching
    const getLevenshteinDistance = (a, b) => {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    };

    // Debounce the query to prevent lag while typing
    const [debouncedQuery, setDebouncedQuery] = useState(query);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(query);
        }, 300); // Wait 300ms after user stops typing

        return () => {
            clearTimeout(handler);
        };
    }, [query]);

    // Filter logic
    useEffect(() => {
        if (!debouncedQuery.trim()) {
            setDisplayedProducts(allProducts);
            return;
        }

        const lowerQuery = debouncedQuery.toLowerCase().trim();

        const scored = allProducts.map(product => {
            const name = product.name.toLowerCase();
            let score = 0;

            if (name === lowerQuery) score = 100;
            else if (getCategory(product).toLowerCase().includes(lowerQuery)) score = 85;
            else if (name.startsWith(lowerQuery)) score = 90;
            else if (name.includes(lowerQuery)) score = 75;
            else {
                // Fuzzy search only runs when user pauses typing
                const dist = getLevenshteinDistance(name, lowerQuery);
                const maxLength = Math.max(name.length, lowerQuery.length);
                const similarity = (maxLength - dist) / maxLength;
                if (similarity > 0.4) score = 50 * similarity;
            }
            return { product, score };
        });

        const filtered = scored
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .map(item => item.product);

        setDisplayedProducts(filtered);
    }, [debouncedQuery, allProducts]);

    return (
        <div className="fade-in" style={{ paddingBottom: '60px' }}>
            {/* Header Section */}
            <div style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid #e2e8f0' }}>
                <div className="container header-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0' }}>
                    <Link to="/home" className="btn btn-ghost" style={{ padding: '8px 16px', borderRadius: '12px' }}>
                        &larr; Back
                    </Link>
                    <h1 className="section-title" style={{ fontSize: '1.5rem', margin: 0 }}>SnapShop</h1>
                    <div style={{ width: '80px' }}></div> {/* Spacer for alignment */}
                </div>
            </div>

            <div className="container" style={{ marginTop: '40px' }}>
                {/* Hero / Search Section */}
                <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                    <h2 className="section-title" style={{ marginBottom: '24px' }}>Find your favorites</h2>
                    <div className="search-container">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search fresh products..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                {/* Loading State */}
                {/* Loading State */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '16px' }}>⏳</div>
                        <p>Loading fresh catalog...</p>
                    </div>
                ) : (
                    /* Grouped Product Grid */
                    <div>
                        {displayedProducts.length === 0 ? (
                            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🧐</div>
                                <h3 style={{ fontSize: '1.25rem', color: 'var(--text-main)', marginBottom: '8px' }}>No products found</h3>
                                <p style={{ color: 'var(--text-muted)' }}>Try searching for generic terms like "juice" or "biscuit"</p>
                                <button className="btn btn-ghost" onClick={() => setQuery('')} style={{ marginTop: '16px' }}>Clear Search</button>
                            </div>
                        ) : (
                            (() => {
                                // 2. Group Products
                                const grouped = displayedProducts.reduce((acc, product) => {
                                    const cat = getCategory(product);
                                    if (!acc[cat]) acc[cat] = [];
                                    acc[cat].push(product);
                                    return acc;
                                }, {});

                                // 3. Define Display Order
                                const categoryOrder = ['Snacks', 'Beverages', 'Pantry & Dairy', 'Household & Personal Care', 'Others'];

                                return categoryOrder.map(category => {
                                    const products = grouped[category];
                                    if (!products || products.length === 0) return null;

                                    return (
                                        <div key={category} className="fade-in" style={{ marginBottom: '48px' }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                marginBottom: '24px',
                                                paddingBottom: '12px',
                                                borderBottom: '2px solid #f1f5f9'
                                            }}>
                                                <h3 style={{
                                                    fontSize: '1.5rem',
                                                    fontWeight: '700',
                                                    color: 'var(--text-main)',
                                                    margin: 0
                                                }}>
                                                    {category}
                                                </h3>
                                                <span style={{
                                                    background: 'var(--primary)',
                                                    color: 'white',
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '600'
                                                }}>
                                                    {products.length}
                                                </span>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '32px' }}>
                                                {products.map((product) => (
                                                    <div key={product.id} className="product-card">
                                                        <div className="product-image-container">
                                                            <img
                                                                src={product.image}
                                                                alt={product.name}
                                                                className="product-image"
                                                                onError={(e) => { e.target.src = '/static/images/placeholder.svg'; }}
                                                            />
                                                        </div>
                                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                                                <h3 className="product-title">{product.name}</h3>
                                                                <span className="badge-price">₹{product.price}</span>
                                                            </div>
                                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px', lineHeight: '1.4' }}>
                                                                In Stock • Fresh
                                                            </p>
                                                            <Link to={`/product/${product.id}`} className="btn btn-primary" style={{ marginTop: 'auto', width: '100%' }}>
                                                                View Details
                                                            </Link>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                });
                            })()
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Search;

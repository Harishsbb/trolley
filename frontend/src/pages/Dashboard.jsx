import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import '../index.css';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const Dashboard = () => {
    const [products, setProducts] = useState([]);
    const [offers, setOffers] = useState([]);
    const [formData, setFormData] = useState({ name: '', price: '', qty: '', imageUrl: '', category: 'Snacks', barcode: '', barcode_type: 'EAN_13' });
    const [offerFormData, setOfferFormData] = useState({ title: '', product_name: '', image: '', discount_label: '', tagline: '', color: '#4f46e5', offer_type: 'pct', offer_value: 0 });
    const [removeName, setRemoveName] = useState('');
    const [loading, setLoading] = useState(true);
    const [editingProduct, setEditingProduct] = useState(null); // { id, name, price, barcode, barcode_type, image, category }
    const [editingOffer, setEditingOffer] = useState(null);

    // Helper: Auto-categorize based on name if category is missing
    const getCategory = (p) => {
        if (p.category && p.category !== 'Uncategorized') return p.category;

        const n = (p.product_name || p.name || '').toLowerCase();

        // Snacks
        if (n.match(/biscuit|cookie|rusk|wafer|cracker|good day|tiger|parle|britannia|sunfeast|treat|marie|monaco|oreo|bourbon/)) return 'Snacks';
        if (n.match(/chip|lays|lay's|bingo|kurkure|puff|nacho|popcorn|snack|mixture|bhujia|sev|murukku/)) return 'Snacks';
        if (n.match(/chocolate|choco|candy|bar|sweet|cake|brownie|muffin|donut|dessert|ice cream|dark fantasy|mom's magic|hide & seek/)) return 'Snacks';
        if (n.match(/noodle|pasta|maggi|yippee|top ramen|soup|instant|cup|flake|cereal|kellogg|oats|breakfast/)) return 'Snacks';

        // Beverages
        if (n.match(/\b(juice|drink|soda|cola|coke|pepsi|sprite|fanta|limca|thums up|7up|mirinda|maaza|slice|frooti|appy|fizz)\b/)) return 'Beverages';
        if (n.match(/\b(water|coffee|tea|milk|shake|smoothie|brew|red bull|energy|squash|syrup|bot|bottle)\b/)) return 'Beverages';

        // Household
        if (n.match(/soap|shampoo|conditioner|wash|cleaner|detergent|laundry|rin|surf|ariel|tide|vim|dettol|lysol|harpic|vanish/)) return 'Household & Personal Care';
        if (n.match(/tooth|paste|brush|colgate|pepsodent|sensodyne|close up|himalaya|mouthwash|shave|razor|blade|tissue|napkin|diaper/)) return 'Household & Personal Care';
        if (n.match(/perfume|deo|spray|scent|cream|lotion|moisturizer|powder|cosmetic|face|body/)) return 'Household & Personal Care';

        // Pantry
        if (n.match(/oil|ghee|butter|cheese|paneer|curd|yogurt|cream/)) return 'Pantry & Dairy';
        if (n.match(/rice|dal|lentil|pulse|flour|atta|maida|sooji|sugar|salt|spice|masala|chilli|turmeric|honey|jam|sauce|ketchup/)) return 'Pantry & Dairy';

        if (n.match(/fruit|apple|banana|orange|mango|grape|veg|onion|potato|tomato/)) return 'Fruits & Vegetables';

        return 'Others';
    };

    const groupedProducts = products.reduce((acc, product) => {
        const cat = getCategory(product);
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(product);
        return acc;
    }, {});

    const sortedCategories = Object.keys(groupedProducts).sort();

    const CATEGORIES = [
        'Snacks',
        'Beverages',
        'Pantry & Dairy',
        'Fruits & Vegetables',
        'Household & Personal Care',
        'Others'
    ];

    const BARCODE_TYPES = [
        'EAN_13',
        'EAN_8',
        'UPC_A',
        'UPC_E',
        'CODE_128',
        'QR_CODE'
    ];

    const fetchStock = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        try {
            const res = await axios.get('/api/stock');
            setProducts(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    const fetchOffers = async () => {
        try {
            const res = await axios.get('/api/offers');
            setOffers(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchStock();
        fetchOffers();
    }, []);

    const findImage = () => {
        if (!formData.name) return alert('Enter a product name first');
        window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(formData.name)}`, '_blank');
    };

    const handleAdd = async (e) => {
        e.preventDefault();

        // Optimistic Update
        const tempId = Date.now();
        const newProd = {
            product_name: formData.name,
            product_price: parseFloat(formData.price),
            quantity: parseInt(formData.qty),
            image: formData.imageUrl || '/static/images/placeholder.svg',
            barcodedata: formData.barcode || formData.name, // fallback
            category: formData.category
        };

        setProducts(prev => [newProd, ...prev]);
        setFormData({ name: '', price: '', qty: '', imageUrl: '', category: 'Snacks', barcode: '', barcode_type: 'EAN_13' });

        try {
            await axios.post('/api/product/add', {
                name: newProd.product_name,
                price: newProd.product_price,
                barcode: newProd.barcodedata,
                image_url: formData.imageUrl,
                quantity: newProd.quantity,
                category: newProd.category,
                barcode_type: formData.barcode_type
            });
            // Silent refresh to get real ID/data
            fetchStock(true);
        } catch (err) {
            alert('Failed to add product');
            fetchStock(true); // Revert on error
        }
    };

    const handleRemove = async (e) => {
        e.preventDefault();

        // Optimistic Update
        const toRemove = removeName.toLowerCase();
        setProducts(prev => prev.filter(p =>
            (p.product_name?.toLowerCase() !== toRemove) &&
            (p.barcodedata !== toRemove)
        ));
        setRemoveName('');

        try {
            await axios.post('/api/product/remove', {
                barcode: removeName
            });
            fetchStock(true);
        } catch (err) {
            alert('Failed to remove product');
            fetchStock(true);
        }
    };

    const updateStock = async (product, change) => {
        // Optimistic update
        setProducts(prev => prev.map(p => {
            if (p.barcodedata === product.barcodedata && p.product_name === product.product_name) {
                // Ensure we don't go below 0
                const newQty = Math.max(0, (p.quantity || 0) + change);
                return { ...p, quantity: newQty };
            }
            return p;
        }));

        try {
            await axios.post('/api/product/update-stock', {
                barcode: product.barcodedata || product.product_name,
                change: change
            });
        } catch (err) {
            console.error('Failed to update stock', err);
            fetchStock(true); // Revert/Refresh
        }
    };

    // Prepare Chart Data: Stock Distribution by Category
    const categoryStats = Object.keys(groupedProducts).map(cat => ({
        label: cat,
        total: groupedProducts[cat].reduce((sum, p) => sum + (p.quantity || 0), 0)
    }));

    const chartData = {
        labels: categoryStats.map(d => d.label),
        datasets: [
            {
                label: 'Total Items in Stock',
                data: categoryStats.map(d => d.total),
                backgroundColor: [
                    '#4f46e5', '#ec4899', '#f59e0b', '#10b981',
                    '#3b82f6', '#8b5cf6', '#ef4444', '#6366f1'
                ],
                borderRadius: 8,
                barThickness: 40,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#1e293b',
                padding: 12,
                cornerRadius: 8,
                titleFont: { family: "'Outfit', sans-serif", size: 14 },
                bodyFont: { family: "'Outfit', sans-serif", size: 14 },
                displayColors: true,
                callbacks: {
                    label: (context) => ` ${context.raw} Units`
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: '#f1f5f9', drawBorder: false },
                ticks: {
                    font: { family: "'Outfit', sans-serif", size: 11 },
                    color: '#94a3b8'
                },
                border: { display: false }
            },
            x: {
                grid: { display: false },
                ticks: {
                    font: { family: "'Outfit', sans-serif", size: 11, weight: '600' },
                    color: '#475569'
                },
                border: { display: false }
            }
        },
        animation: {
            duration: 1500,
            easing: 'easeOutQuart'
        }
    };

    const handleEditClick = (p) => {
        setEditingProduct({
            id: p._id,
            name: p.product_name || p.name,
            price: p.product_price || p.price,
            barcode: p.barcodedata,
            barcode_type: p.barcode_type || 'EAN_13',
            image: p.image,
            category: p.category || getCategory(p) || 'Snacks'
        });
    };

    const handleEditSave = async (e) => {
        e.preventDefault();

        // Optimistic Update: Update local state immediately
        const updatedProduct = {
            _id: editingProduct.id,
            product_name: editingProduct.name,
            product_price: parseFloat(editingProduct.price),
            barcodedata: editingProduct.barcode,
            barcode_type: editingProduct.barcode_type,
            image: editingProduct.image,
            category: editingProduct.category,
            // Preserve existing fields we aren't editing
            quantity: products.find(p => p._id === editingProduct.id)?.quantity || 0
        };

        setProducts(prev => prev.map(p => p._id === editingProduct.id ? updatedProduct : p));
        setEditingProduct(null); // Close modal immediately

        try {
            await axios.post('/api/product/edit', {
                id: editingProduct.id,
                name: editingProduct.name,
                price: editingProduct.price,
                barcode: editingProduct.barcode,
                barcode_type: editingProduct.barcode_type,
                image: editingProduct.image,
                category: editingProduct.category
            });
            // No need to fetchStock() immediately if successful, generic refresh can happen later
        } catch (err) {
            alert('Failed to update product');
            fetchStock(true); // Revert on error
        }
    };

    const handleAddOffer = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/offer/add', offerFormData);
            setOfferFormData({ title: '', product_name: '', image: '', discount_label: '', tagline: '', color: '#4f46e5', offer_type: 'pct', offer_value: 0 });
            fetchOffers();
        } catch (err) {
            alert('Failed to add offer');
        }
    };

    const handleEditOfferSave = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/offer/edit', {
                id: editingOffer._id,
                ...editingOffer
            });
            setEditingOffer(null);
            fetchOffers();
        } catch (err) {
            alert('Failed to update offer');
        }
    };

    const handleRemoveOffer = async (id) => {
        if (!window.confirm('Are you sure you want to remove this offer?')) return;
        try {
            await axios.post('/api/offer/remove', { id });
            fetchOffers();
        } catch (err) {
            alert('Failed to remove offer');
        }
    };

    return (
        <div style={{
            background: '#f8fafc',
            minHeight: '100vh',
            fontFamily: "'Outfit', sans-serif",
            paddingBottom: '60px'
        }}>
            {/* Navbar / Header */}
            <div className="dashboard-header" style={{
                background: 'white',
                borderBottom: '1px solid #e2e8f0',
                padding: '16px 24px',
                position: 'sticky',
                top: 0,
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                flexWrap: 'wrap',
                gap: '10px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 'min-content' }}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '10px',
                        background: 'linear-gradient(135deg, #4f46e5 0%, #ec4899 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: '1.2rem', flexShrink: 0
                    }}>🛍️</div>
                    <span className="dashboard-title" style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.025em', color: '#1e293b' }}>
                        Self Shopping Smart Trolley <span style={{ fontWeight: '400', color: '#64748b' }}>Admin</span>
                    </span>
                </div>
                <Link to="/home" style={{
                    textDecoration: 'none',
                    color: '#475569',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '50px',
                    background: '#f1f5f9',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                }}>
                    <span>&larr;</span> Back to Home
                </Link>
            </div>

            <div className="container" style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px' }}>

                {/* Actions Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>

                    {/* Add Product Panel */}
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '24px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        border: '1px solid #e2e8f0'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <div style={{
                                width: '48px', height: '48px', borderRadius: '12px',
                                background: '#e0e7ff', color: '#4f46e5',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#1e293b' }}>Add Product</h3>
                                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>Update your store inventory</p>
                            </div>
                        </div>

                        <form onSubmit={handleAdd} style={{ display: 'grid', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Product Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Diet Coke"
                                    className="search-input"
                                    style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '0.95rem', border: '1px solid #cbd5e1', width: '100%' }}
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Barcode (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="Scan or enter barcode"
                                        style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '0.95rem', border: '1px solid #cbd5e1', width: '100%', outline: 'none' }}
                                        value={formData.barcode}
                                        onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Type</label>
                                    <select
                                        value={formData.barcode_type}
                                        onChange={e => setFormData({ ...formData, barcode_type: e.target.value })}
                                        style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '0.95rem', border: '1px solid #cbd5e1', width: '100%', outline: 'none', background: 'white', color: '#1e293b' }}
                                    >
                                        {BARCODE_TYPES.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 1fr) 2fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Category</label>
                                    <select
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '0.95rem', border: '1px solid #cbd5e1', width: '100%', outline: 'none', background: 'white', color: '#1e293b' }}
                                    >
                                        {CATEGORIES.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Image URL</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            type="text"
                                            placeholder="Link..."
                                            style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', fontSize: '0.95rem', border: '1px solid #cbd5e1', width: '100%', outline: 'none' }}
                                            value={formData.imageUrl}
                                            onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                                        />
                                        <button
                                            type="button"
                                            onClick={findImage}
                                            style={{
                                                padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
                                                background: '#f8fafc', cursor: 'pointer', fontSize: '1.2rem'
                                            }}
                                            title="Find image"
                                        >
                                            🔍
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Price (₹)</label>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '0.95rem', border: '1px solid #cbd5e1', width: '100%', outline: 'none' }}
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Quantity</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '0.95rem', border: '1px solid #cbd5e1', width: '100%', outline: 'none' }}
                                        value={formData.qty}
                                        onChange={e => setFormData({ ...formData, qty: e.target.value })}
                                    />
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
                                Add to Inventory
                            </button>
                        </form>
                    </div>

                    {/* Remove Panel & Analytics Preview */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{
                            background: 'white',
                            borderRadius: '16px',
                            padding: '24px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            border: '1px solid #e2e8f0',
                            flex: 1
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                <div style={{
                                    width: '48px', height: '48px', borderRadius: '12px',
                                    background: '#fee2e2', color: '#dc2626',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#1e293b' }}>Remove Product</h3>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>Scanner or Manual Entry</p>
                                </div>
                            </div>
                            <form onSubmit={handleRemove} style={{ display: 'flex', gap: '12px' }}>
                                <input
                                    type="text"
                                    placeholder="Enter barcode or name..."
                                    style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                                    value={removeName}
                                    onChange={e => setRemoveName(e.target.value)}
                                />
                                <button type="submit" className="btn" style={{ background: '#ef4444', color: 'white', padding: '0 24px' }}>Remove</button>
                            </form>
                        </div>

                        {/* Mini Analytics */}
                        <div style={{
                            background: 'white',
                            borderRadius: '16px',
                            padding: '20px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            border: '1px solid #e2e8f0',
                            height: '340px',
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stock Overview</h4>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <Bar key={JSON.stringify(chartOptions)} data={chartData} options={chartOptions} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Inventory Grouped by Category */}
                {/* Inventory Grouped by Category */}
                {sortedCategories.map((category) => {
                    const categoryProducts = groupedProducts[category];
                    return (
                        <div key={category} style={{ marginBottom: '40px' }}>
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
                                    color: '#1e293b',
                                    margin: 0
                                }}>
                                    {category}
                                </h3>
                                <span style={{
                                    background: 'var(--primary, #4f46e5)', // Fallback to indigo if var missing
                                    color: 'white',
                                    padding: '4px 10px',
                                    borderRadius: '20px',
                                    fontSize: '0.85rem',
                                    fontWeight: '700',
                                    minWidth: '24px',
                                    textAlign: 'center'
                                }}>
                                    {categoryProducts.length}
                                </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '24px' }}>
                                {categoryProducts.map((p, i) => (
                                    <div key={i} className="product-card" style={{
                                        background: 'white',
                                        borderRadius: '16px',
                                        padding: '16px',
                                        border: '1px solid #e2e8f0',
                                        transition: 'all 0.3s ease',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}>
                                        {/* Stock Indicator Dot */}
                                        <div style={{
                                            position: 'absolute', top: '16px', right: '16px',
                                            width: '10px', height: '10px', borderRadius: '50%',
                                            background: p.quantity > 10 ? '#22c55e' : p.quantity > 0 ? '#f59e0b' : '#ef4444',
                                            boxShadow: '0 0 0 4px rgba(255,255,255,0.8)',
                                            zIndex: 10
                                        }} title={p.quantity > 0 ? 'In Stock' : 'Out of Stock'}></div>

                                        {/* Edit Button */}
                                        <button
                                            onClick={() => handleEditClick(p)}
                                            style={{
                                                position: 'absolute', top: '12px', left: '12px',
                                                width: '32px', height: '32px', borderRadius: '8px',
                                                background: 'white', border: '1px solid #e2e8f0',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                                zIndex: 10, color: '#475569'
                                            }}
                                            title="Edit Details"
                                        >
                                            ✏️
                                        </button>

                                        <div style={{
                                            height: '160px', borderRadius: '12px', background: '#f8fafc',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            marginBottom: '16px', overflow: 'hidden'
                                        }}>
                                            <img
                                                src={p.image || '/static/images/placeholder.svg'}
                                                alt={p.product_name}
                                                onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/400x400/f1f5f9/94a3b8.png?text=${encodeURIComponent(p.product_name)}` }}
                                                style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'multiply' }}
                                            />
                                        </div>

                                        <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: '700', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {p.product_name || p.name}
                                        </h4>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Barcode: <span style={{ fontFamily: 'monospace' }}>{p.barcodedata?.slice(-6) || 'N/A'}</span></span>
                                            <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#4f46e5' }}>₹{p.product_price || p.price}</span>
                                        </div>

                                        <div style={{ background: '#f1f5f9', borderRadius: '8px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Stock Level</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', padding: '2px', borderRadius: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                                <button
                                                    onClick={() => updateStock(p, -1)}
                                                    disabled={p.quantity <= 0}
                                                    style={{
                                                        width: '28px', height: '28px', borderRadius: '6px', border: 'none',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        cursor: p.quantity <= 0 ? 'not-allowed' : 'pointer',
                                                        background: p.quantity <= 0 ? '#f1f5f9' : '#fee2e2',
                                                        color: p.quantity <= 0 ? '#cbd5e1' : '#dc2626',
                                                        fontSize: '1.2rem', fontWeight: 'bold', lineHeight: 1
                                                    }}
                                                    title="Decrease Stock"
                                                >−</button>
                                                <span style={{ fontSize: '1rem', fontWeight: '700', color: '#1e293b', minWidth: '30px', textAlign: 'center' }}>{p.quantity}</span>
                                                <button
                                                    onClick={() => updateStock(p, 1)}
                                                    style={{
                                                        width: '28px', height: '28px', borderRadius: '6px', border: 'none',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        background: '#e0e7ff', color: '#4f46e5',
                                                        fontSize: '1.2rem', fontWeight: 'bold', lineHeight: 1
                                                    }}
                                                    title="Increase Stock"
                                                >+</button>
                                            </div>
                                        </div>

                                        {/* Visual Bar for Stock */}
                                        <div style={{ marginTop: '8px', height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%', width: `${Math.min(p.quantity, 100)}%`,
                                                background: p.quantity < 5 ? '#ef4444' : '#4f46e5',
                                                borderRadius: '2px',
                                                transition: 'width 0.5s ease'
                                            }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}

                {/* --- Manage Offers Section --- */}
                <div style={{
                    marginTop: '60px',
                    padding: '32px',
                    background: 'white',
                    borderRadius: '24px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                    border: '1px solid #e2e8f0'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '12px',
                            background: '#fef3c7', color: '#d97706',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>✨</div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: '#1e293b' }}>Manage Mascot Special Offers</h3>
                            <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#64748b' }}>Configure the floating ads appearing in the shop</p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
                        {/* Add Offer Form */}
                        <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                            <h4 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', fontWeight: '700' }}>Add New Offer</h4>
                            <form onSubmit={handleAddOffer} style={{ display: 'grid', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '6px', color: '#64748b' }}>Badge Title (e.g. Flash Offer! 🔥)</label>
                                    <input required value={offerFormData.title} onChange={e => setOfferFormData({ ...offerFormData, title: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '6px', color: '#64748b' }}>Target Product Name</label>
                                    <select 
                                        required 
                                        value={offerFormData.product_name} 
                                        onChange={e => setOfferFormData({ ...offerFormData, product_name: e.target.value })} 
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white' }}
                                    >
                                        <option value="">-- Select Product --</option>
                                        {Array.from(new Set(products.map(p => p.product_name || p.name))).sort().map(name => (
                                            <option key={name} value={name}>{name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '6px', color: '#64748b' }}>Discount Label</label>
                                        <input required value={offerFormData.discount_label} onChange={e => setOfferFormData({ ...offerFormData, discount_label: e.target.value })} placeholder="50% OFF" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '6px', color: '#64748b' }}>Banner Color</label>
                                        <input type="color" value={offerFormData.color} onChange={e => setOfferFormData({ ...offerFormData, color: e.target.value })} style={{ width: '100%', height: '42px', padding: '4px', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer' }} />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '6px', color: '#64748b' }}>Offer Type</label>
                                        <select value={offerFormData.offer_type} onChange={e => setOfferFormData({...offerFormData, offer_type: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                            <option value="pct">Percentage (%)</option>
                                            <option value="flat">Flat Discount (₹)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '6px', color: '#64748b' }}>Value</label>
                                        <input type="number" required value={offerFormData.offer_value} onChange={e => setOfferFormData({ ...offerFormData, offer_value: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '6px', color: '#64748b' }}>Tagline</label>
                                    <input value={offerFormData.tagline} onChange={e => setOfferFormData({ ...offerFormData, tagline: e.target.value })} placeholder="Tap to add to cart!" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '6px', color: '#64748b' }}>Image URL</label>
                                    <input value={offerFormData.image} onChange={e => setOfferFormData({ ...offerFormData, image: e.target.value })} placeholder="Leave empty for auto-search from inventory" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                </div>
                                <button type="submit" style={{ padding: '12px', borderRadius: '10px', border: 'none', background: '#d97706', color: 'white', fontWeight: '700', cursor: 'pointer', marginTop: '8px' }}>Create Offer</button>
                            </form>
                        </div>

                        {/* Offers List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <h4 style={{ margin: '0', fontSize: '1.1rem', fontWeight: '700' }}>Active Offers ({offers.length})</h4>
                            <div style={{ display: 'grid', gap: '16px', maxHeight: '600px', overflowY: 'auto', paddingRight: '8px' }}>
                                {offers.map(off => (
                                    <div key={off._id} style={{ 
                                        background: 'white', 
                                        borderRadius: '16px', 
                                        padding: '16px', 
                                        border: '1px solid #e2e8f0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '16px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                    }}>
                                        <div style={{ 
                                            width: '60px', height: '60px', borderRadius: '10px', 
                                            background: '#f1f5f9', padding: '8px', flexShrink: 0
                                        }}>
                                            <img 
                                                src={off.image || 'https://placehold.co/100'} 
                                                onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/400x400/f1f5f9/94a3b8.png?text=${encodeURIComponent(off.product_name)}` }}
                                                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                                                alt="" 
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '0.7rem', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', background: off.color, color: 'white' }}>{off.title}</span>
                                                <h5 style={{ margin: 0, fontWeight: '700' }}>{off.product_name}</h5>
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: '800', marginTop: '4px' }}>{off.discount_label} | {off.offer_type === 'pct' ? `${off.offer_value}% OFF` : `₹${off.offer_value} OFF`}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{off.tagline}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => setEditingOffer(off)} style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>✏️</button>
                                            <button onClick={() => handleRemoveOffer(off._id)} style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #fee2e2', background: 'white', color: '#ef4444', cursor: 'pointer' }}>🗑️</button>
                                        </div>
                                    </div>
                                ))}
                                {offers.length === 0 && <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>No offers configured yet.</p>}
                            </div>
                        </div>
                    </div>
                </div>

                {products.length === 0 && !loading && (
                    <div style={{ textAlign: 'center', padding: '60px', opacity: 0.6 }}>
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📦</div>
                        <h3>No products found in inventory.</h3>
                        <p>Use the "Add Product" panel to get started.</p>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editingProduct && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        background: 'white', borderRadius: '24px', padding: '32px',
                        width: '90%', maxWidth: '500px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }}>
                        <h3 style={{ marginTop: 0, fontSize: '1.5rem', color: '#1e293b' }}>Edit Product</h3>
                        <form onSubmit={handleEditSave} style={{ display: 'grid', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px', color: '#64748b' }}>Name</label>
                                <input
                                    value={editingProduct.name}
                                    onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px', color: '#64748b' }}>Price</label>
                                <input
                                    value={editingProduct.price}
                                    onChange={e => setEditingProduct({ ...editingProduct, price: e.target.value })}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px', color: '#64748b' }}>Category</label>
                                <select
                                    value={editingProduct.category}
                                    onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white' }}
                                >
                                    {CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px', color: '#64748b' }}>Image URL</label>
                                <input
                                    value={editingProduct.image}
                                    onChange={e => setEditingProduct({ ...editingProduct, image: e.target.value })}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px', color: '#64748b' }}>Barcode</label>
                                    <input
                                        value={editingProduct.barcode}
                                        onChange={e => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px', color: '#64748b' }}>Type</label>
                                    <select
                                        value={editingProduct.barcode_type}
                                        onChange={e => setEditingProduct({ ...editingProduct, barcode_type: e.target.value })}
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white' }}
                                    >
                                        {BARCODE_TYPES.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                <button type="button" onClick={() => setEditingProduct(null)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: '#f1f5f9', color: '#64748b', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: '#4f46e5', color: 'white', fontWeight: '600', cursor: 'pointer' }}>Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Edit Offer Modal */}
            {editingOffer && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', zIndex: 1001,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        background: 'white', borderRadius: '24px', padding: '32px',
                        width: '90%', maxWidth: '500px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                    }}>
                        <h3 style={{ marginTop: 0, fontSize: '1.5rem', color: '#1e293b' }}>Edit Special Offer</h3>
                        <form onSubmit={handleEditOfferSave} style={{ display: 'grid', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px', color: '#64748b' }}>Title</label>
                                <input value={editingOffer.title} onChange={e => setEditingOffer({...editingOffer, title: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px', color: '#64748b' }}>Product Name</label>
                                <select 
                                    required
                                    value={editingOffer.product_name} 
                                    onChange={e => setEditingOffer({...editingOffer, product_name: e.target.value})} 
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white' }}
                                >
                                    {Array.from(new Set(products.map(p => p.product_name || p.name))).sort().map(name => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px', color: '#64748b' }}>Discount Label</label>
                                    <input value={editingOffer.discount_label} onChange={e => setEditingOffer({...editingOffer, discount_label: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px', color: '#64748b' }}>Color</label>
                                    <input type="color" value={editingOffer.color} onChange={e => setEditingOffer({...editingOffer, color: e.target.value})} style={{ width: '100%', height: '45px', padding: '4px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white' }} />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px', color: '#64748b' }}>Type</label>
                                    <select value={editingOffer.offer_type} onChange={e => setEditingOffer({...editingOffer, offer_type: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white' }}>
                                        <option value="pct">Percentage (%)</option>
                                        <option value="flat">Flat (₹)</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px', color: '#64748b' }}>Value</label>
                                    <input type="number" value={editingOffer.offer_value} onChange={e => setEditingOffer({...editingOffer, offer_value: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px', color: '#64748b' }}>Tagline</label>
                                <input value={editingOffer.tagline} onChange={e => setEditingOffer({...editingOffer, tagline: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                <button type="button" onClick={() => setEditingOffer(null)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: '#f1f5f9', color: '#64748b', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: '#d97706', color: 'white', fontWeight: '600', cursor: 'pointer' }}>Save Offer</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;

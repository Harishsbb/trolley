import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../index.css';
import successSound from '../assets/sounds/success.mp3';
import scanSound from '../assets/sounds/scan.mp3';
import beepSound from '../assets/sounds/beep-02.mp3';
import thankyouSound from '../assets/sounds/thankyou.mp3';

const Scanner = () => {
    const [scannedItems, setScannedItems] = useState([]);
    const [totalPrice, setTotalPrice] = useState(0);
    const [scanning, setScanning] = useState(false);
    const [recommendations, setRecommendations] = useState([]);
    const [lastScanned, setLastScanned] = useState(null);
    const [toast, setToast] = useState({ message: '', type: '', visible: false });
    const [dynamicOffers, setDynamicOffers] = useState({});

    // Use a counter for pending actions to handle multiple rapid scans correctly
    const [pendingScans, setPendingScans] = useState(0);
    const isAdding = pendingScans > 0;

    const scannerRef = useRef(null);
    const lastScannedCode = useRef(null);
    const lastScannedTime = useRef(0);

    const showToast = (message, type = 'success') => {
        setToast({ message, type, visible: true });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
    };

    const fetchCart = async () => {
        try {
            const res = await axios.get('/api/get-scanned-items');
            setScannedItems(res.data.products || []);
            setTotalPrice(res.data.total_prize || 0);
        } catch (err) {
            console.error("Error fetching cart", err);
        }
    };

    const fetchRecommendations = async () => {
        try {
            const res = await axios.get('/api/recommended');
            setRecommendations(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const [productMap, setProductMap] = useState({});
    const [productNameMap, setProductNameMap] = useState({});

    // Fetch full product list for offline-like instant lookup
    useEffect(() => {
        axios.get('/api/stock')
            .then(res => {
                const map = {};
                const nameMap = {};
                if (Array.isArray(res.data)) {
                    res.data.forEach(p => {
                        if (p.barcodedata) {
                            map[p.barcodedata] = p;
                        }
                        if (p.product_name) {
                            nameMap[p.product_name] = p;
                        }
                    });
                }
                setProductMap(map);
                setProductNameMap(nameMap);
            })
            .catch(err => console.log("Background product sync failed", err));

        // Fetch dynamic offers for optimistic updates
        axios.get('/api/offers')
            .then(res => {
                const offersMap = {};
                res.data.forEach(o => {
                    offersMap[o.product_name.toLowerCase()] = {
                        type: o.offer_type,
                        value: o.offer_value
                    };
                });
                setDynamicOffers(offersMap);
            })
            .catch(err => console.error("Failed to fetch offers for scanner", err));

        fetchCart();
        fetchRecommendations();
    }, []);

    const handleScanSuccess = async (decodedText, decodedResult) => {
        const now = Date.now();
        // Debounce: Ignore same code if scanned within 3 seconds
        if (decodedText === lastScannedCode.current && (now - lastScannedTime.current) < 3000) {
            return;
        }

        lastScannedCode.current = decodedText;
        lastScannedTime.current = now;

        // Check local map for instant result
        const localProduct = productMap[decodedText];

        if (localProduct) {
            console.log(`Instant Scan: ${localProduct.product_name}`);

            // Play Success Sound Immediately
            const chime = new Audio(successSound);
            chime.play().catch(e => { });

            // Apply Offer Logic Optimistically - Dynamically from Backend
            const OFFERS = dynamicOffers;

            const originalPrice = parseFloat(localProduct.product_price);
            let finalPrice = originalPrice;
            let onOffer = false;

            // Normalize: lowercase and remove extra spaces
            const p_name_norm = localProduct.product_name.toLowerCase().split(/\s+/).join(' ');

            for (const [key, offer] of Object.entries(OFFERS)) {
                if (p_name_norm.includes(key)) {
                    if (offer.type === "pct") {
                        finalPrice = originalPrice * (1 - offer.value / 100);
                    } else if (offer.type === "flat") {
                        finalPrice = Math.max(0, originalPrice - offer.value);
                    }
                    onOffer = true;
                    break;
                }
            }

            // Optimistic Update
            setScannedItems(prev => {
                const newItems = [...prev];
                const existingItemIndex = newItems.findIndex(i => i.name === localProduct.product_name);

                if (existingItemIndex >= 0) {
                    newItems[existingItemIndex] = {
                        ...newItems[existingItemIndex],
                        quantity: newItems[existingItemIndex].quantity + 1
                    };
                } else {
                    newItems.push({
                        name: localProduct.product_name,
                        price: finalPrice,
                        original_price: originalPrice,
                        quantity: 1,
                        image: localProduct.image || '/static/images/placeholder.svg',
                        on_offer: onOffer
                    });
                }
                return newItems;
            });

            setTotalPrice(prev => prev + finalPrice);
            setLastScanned(localProduct.product_name);
            showToast(`Added: ${localProduct.product_name}`, 'success');

            // Sync with backend seamlessly
            try {
                const res = await axios.post('/api/scan-item', { barcode: decodedText });
                if (res.data.cart) {
                    setScannedItems(res.data.cart.products || []);
                    setTotalPrice(res.data.cart.total_prize || 0);
                }
            } catch (err) {
                console.error("Sync error", err);
            }

            return;
        }

        // Fallback for unknown items: Normal flow with spinner
        console.log(`Server Scan: ${decodedText}`);

        // Immediate feedback: Beep
        const beep = new Audio(beepSound);
        beep.play().catch(e => console.log('Sound error', e));

        setPendingScans(prev => prev + 1);

        try {
            const res = await axios.post('/api/scan-item', { barcode: decodedText });

            if (res.data.status === 'success') {
                // Success Chime (if not played already)
                const chime = new Audio(successSound);
                chime.play().catch(e => console.log('Sound error', e));

                setLastScanned(res.data.product);
                showToast(`Added: ${res.data.product}`, 'success');

                if (res.data.cart) {
                    setScannedItems(res.data.cart.products || []);
                    setTotalPrice(res.data.cart.total_prize || 0);
                } else {
                    fetchCart();
                }
            } else {
                showToast(res.data.message || "Product not found", 'error');
            }
        } catch (err) {
            console.error("Scan API error detail:", err);
            showToast("Scanner Error: " + (err.response?.data?.message || err.message), 'error');
        } finally {
            setPendingScans(prev => Math.max(0, prev - 1));
        }
    };

    // Helper to safely stop scanner
    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
            } catch (err) {
                console.warn("Scanner stop/clear error:", err);
            }
            scannerRef.current = null;
        }
    };

    useEffect(() => {
        let isMounted = true;

        if (scanning) {
            window.dispatchEvent(new CustomEvent('scanning-status', { detail: true }));
            const startScanner = async () => {
                try {
                    // Safety check: make sure any previous instance is dead
                    await stopScanner();

                    if (!isMounted) return;

                    const html5QrCode = new Html5Qrcode("reader");
                    scannerRef.current = html5QrCode;

                    const config = {
                        fps: 20,
                        qrbox: { width: 250, height: 250 },
                        formatsToSupport: [
                            Html5QrcodeSupportedFormats.EAN_13, 
                            Html5QrcodeSupportedFormats.EAN_8, 
                            Html5QrcodeSupportedFormats.UPC_A, 
                            Html5QrcodeSupportedFormats.UPC_E, 
                            Html5QrcodeSupportedFormats.CODE_128,
                            Html5QrcodeSupportedFormats.QR_CODE
                        ]
                    };

                    await html5QrCode.start(
                        { facingMode: "environment" },
                        config,
                        handleScanSuccess,
                        (errorMessage) => {
                            // verbose logging off
                        }
                    );
                } catch (err) {
                    console.error("Error starting scanner", err);
                    if (isMounted) {
                        setScanning(false);
                        showToast("Failed to start camera. Check permissions.", 'error');
                    }
                }
            };

            // Small delay to ensure DOM is ready
            const timer = setTimeout(startScanner, 100);
            return () => clearTimeout(timer);
        }

        // Cleanup function for unmount or dependency change
        return () => {
            isMounted = false;
            window.dispatchEvent(new CustomEvent('scanning-status', { detail: false }));
            // logic moved to stopScanner, but we can't await in cleanup.
            // Best effort stop if component unmounts while scanning.
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => { }).finally(() => {
                    if (scannerRef.current) try { scannerRef.current.clear(); } catch (e) { }
                });
            }
        };
    }, [scanning]);

    const handleStartScan = () => {
        setScanning(true);
        const scanStart = new Audio(scanSound);
        scanStart.play().catch(e => console.log('Scan start sound error', e));
    };

    const handleStopScan = async () => {
        await stopScanner();
        setScanning(false);
        const thanks = new Audio(thankyouSound);
        thanks.play().catch(e => console.log('Thanks sound error', e));
    };



    const handleRemoveItem = async (productName) => {
        // Optimistic Update: Remove immediately from UI
        const itemToRemove = scannedItems.find(item => item.name === productName);
        const itemTotal = itemToRemove ? itemToRemove.price * itemToRemove.quantity : 0;

        setScannedItems(prev => prev.filter(item => item.name !== productName));
        setTotalPrice(prev => prev - itemTotal);
        showToast(`Removed: ${productName}`, 'remove');

        try {
            const res = await axios.post('/api/remove-item', { product_name: productName });

            // Sync with backend truth
            if (res.data.cart) {
                setScannedItems(res.data.cart.products || []);
                setTotalPrice(res.data.cart.total_prize || 0);
            }
        } catch (err) {
            console.error(err);
            // Revert on failure by fetching actual state
            fetchCart();
            showToast("Failed to remove item", 'error');
        }
    };


    const handleSaveHistory = async () => {
        try {
            const res = await axios.post('/api/save-history');
            if (res.data.status === 'success') {
                showToast(res.data.message, 'success');
                setScannedItems([]);
                setTotalPrice(0);
                setLastScanned(null);
                setRecommendations([]);
                // Optional: Play a success sound
                const success = new Audio(successSound);
                success.play().catch(e => { });
            } else {
                showToast(res.data.message, 'error');
            }
        } catch (err) {
            console.error(err);
            showToast("Failed to save history", 'error');
        }
    };

    const handleGenerateBill = () => {
        // Save current cart state to ensure Bill matches UI exactly
        localStorage.setItem('billData', JSON.stringify({
            products: scannedItems,
            total_prize: totalPrice
        }));
        window.open('/bill', '_blank', 'width=600,height=800');
    };

    return (
        <div className="fade-in" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
            {/* Custom Toast Notification */}
            {toast.visible && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: toast.type === 'error' ? '#ef4444' : toast.type === 'remove' ? '#dc2626' : toast.type === 'info' ? '#3b82f6' : '#22c55e',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '50px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    zIndex: 2000,
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    animation: 'slideDown 0.3s ease-out',
                    maxWidth: '90%',
                    width: 'max-content'
                }}>
                    <span>{toast.type === 'error' ? '⚠️' : toast.type === 'remove' ? '🗑️' : '✅'}</span>
                    {toast.message}
                </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h1 style={{ margin: 0 }}>Self Shopping Smart Trolley</h1>
                {lastScanned && (
                    <div className="fade-in" style={{ background: '#dcfce7', padding: '8px 16px', borderRadius: '20px', color: '#166534', fontWeight: '600' }}>
                        Last Scanned: {lastScanned}
                    </div>
                )}
            </div>

            <div className="scanner-layout" style={{ display: 'grid', gap: '20px' }}>
                {/* Left Column: Camera */}
                <div className="card" style={{ backgroundColor: 'white', minHeight: '400px', position: 'relative', overflow: 'hidden' }}>
                    {/* Always keep the reader element in DOM to prevent cleanup crash, hide it when not scanning */}
                    <div
                        id="reader"
                        style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '12px',
                            display: scanning ? 'block' : 'none'
                        }}
                    ></div>

                    {!scanning && (
                        <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                            <div style={{ marginBottom: '16px' }}>
                                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                    <circle cx="12" cy="13" r="4"></circle>
                                </svg>
                            </div>
                            <h3 style={{ marginBottom: '20px' }}>Ready to Scan</h3>
                            <button className="btn btn-primary" onClick={handleStartScan} style={{ fontSize: '1.2em', padding: '15px 30px' }}>
                                Start Camera
                            </button>
                        </div>
                    )}

                    {scanning && (
                        <button
                            type="button"
                            className="btn btn-danger"
                            onClick={(e) => { e.preventDefault(); handleStopScan(); }}
                            style={{
                                position: 'absolute',
                                bottom: '20px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                zIndex: 10,
                                width: 'auto',
                                padding: '10px 30px',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                                fontSize: '1rem'
                            }}
                        >
                            Stop Scanning
                        </button>
                    )}
                </div>

                {/* Right Column: Cart */}
                <div className="card" style={{ backgroundColor: 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ margin: 0, color: '#2c3e50' }}>Your Cart</h3>
                        <span style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#27ae60' }}>₹{totalPrice.toFixed(2)}</span>
                    </div>

                    <div style={{ height: '300px', overflow: 'auto', border: '1px solid #eee', borderRadius: '8px', marginBottom: '15px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ position: 'sticky', top: 0, background: '#f8f9fa', zIndex: 10 }}>
                                <tr>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Item</th>
                                    <th style={{ padding: '10px', textAlign: 'center' }}>Qty</th>
                                    <th style={{ padding: '10px', textAlign: 'right' }}>Price</th>
                                    <th style={{ padding: '10px', textAlign: 'center' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {scannedItems.map((item, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '10px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <img
                                                    src={item.image || productNameMap[item.name]?.image || '/static/images/placeholder.svg'}
                                                    alt=""
                                                    style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'contain', background: '#f8fafc', border: '1px solid #e2e8f0', mixBlendMode: 'multiply' }}
                                                    onError={(e) => { e.target.onerror = null; e.target.src = '/static/images/placeholder.svg'; }}
                                                />
                                                <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                                                {item.on_offer && (
                                                    <div style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: '800', background: '#f0fdf4', padding: '2px 6px', borderRadius: '4px', width: 'fit-content', marginTop: '4px' }}>
                                                        ✨ OFFER APPLIED
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '10px', textAlign: 'center' }}>{item.quantity}</td>
                                        <td style={{ padding: '10px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                <div style={{ fontWeight: 'bold' }}>₹{(item.price * item.quantity).toFixed(2)}</div>
                                                {item.on_offer && (
                                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                                                        ₹{(item.original_price * item.quantity).toFixed(2)}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '10px', textAlign: 'center' }}>
                                            <button
                                                onClick={() => handleRemoveItem(item.name)}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: '#e74c3c',
                                                    cursor: 'pointer',
                                                    fontSize: '1.2em',
                                                    fontWeight: 'bold'
                                                }}
                                                title="Remove Item"
                                            >
                                                ✕
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {isAdding && (
                                    <tr style={{ background: '#f0fdf4', animation: 'pulse 1s infinite' }}>
                                        <td style={{ padding: '10px', color: '#166534', fontWeight: 'bold' }}>
                                            Scanning found...
                                        </td>
                                        <td style={{ padding: '10px', textAlign: 'center' }}>
                                            <div className="spinner-small" style={{ border: '2px solid #22c55e', borderTopColor: 'transparent', borderRadius: '50%', width: '16px', height: '16px', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
                                        </td>
                                        <td style={{ padding: '10px', textAlign: 'right' }}>...</td>
                                        <td style={{ padding: '10px', textAlign: 'center' }}>...</td>
                                    </tr>
                                )}
                                {!isAdding && scannedItems.length === 0 && (
                                    <tr>
                                        <td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: '#ccc' }}>
                                            Cart is empty. Scan products to begin!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="btn btn-primary" style={{ flex: 1, backgroundColor: '#27ae60' }} onClick={handleGenerateBill} disabled={scannedItems.length === 0}>
                            Generate Bill
                        </button>
                        <button 
                            className="btn btn-primary" 
                            style={{ flex: 1, backgroundColor: '#3b82f6' }} 
                            onClick={handleSaveHistory} 
                            disabled={scannedItems.length === 0}
                        >
                            Save History
                        </button>
                    </div>
                </div>
            </div>
            {/* Recommendations */}
            <div style={{ marginTop: '30px' }}>
                <h3>You might also like</h3>
                <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px' }}>
                    {recommendations.map((rec, i) => (
                        <Link 
                            to={`/product/${rec.id}`} 
                            key={i} 
                            className="product-card" 
                            style={{ 
                                minWidth: '220px', 
                                padding: '16px', 
                                textDecoration: 'none', 
                                color: 'inherit',
                                position: 'relative',
                                background: 'white',
                                borderRadius: '16px',
                                border: '1px solid #f1f5f9',
                                transition: 'transform 0.2s',
                                cursor: 'pointer'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            {rec.reason && (
                                <div style={{
                                    position: 'absolute',
                                    top: '10px',
                                    right: '10px',
                                    background: rec.reason === 'Top Choice' ? '#4f46e5' : '#10b981',
                                    color: 'white',
                                    fontSize: '0.65rem',
                                    padding: '4px 8px',
                                    borderRadius: '50px',
                                    fontWeight: '800',
                                    zIndex: 2,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.02em',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}>
                                    {rec.reason}
                                </div>
                            )}
                            <div style={{ width: '100%', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                                <img src={rec.image} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt={rec.name} />
                            </div>
                            <h5 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: '700', color: '#1e293b', lineHeight: '1.4' }}>{rec.name}</h5>
                            <div style={{ fontWeight: '800', color: '#ef4444', fontSize: '1.1rem' }}>₹{rec.price}</div>
                        </Link>
                    ))}
                </div>
            </div>

            <style>{`
                @keyframes slideDown {
                    from { transform: translate(-50%, -20px); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default Scanner;

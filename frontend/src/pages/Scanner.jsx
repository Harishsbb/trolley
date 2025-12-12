import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../index.css';

const Scanner = () => {
    const [scanning, setScanning] = useState(false);
    const [products, setProducts] = useState([]);
    const [totalPrice, setTotalPrice] = useState(0);
    const [recommended, setRecommended] = useState([]);
    const [popup, setPopup] = useState({ show: false, message: '', error: false });
    const [showQr, setShowQr] = useState(false);
    const [qrBlob, setQrBlob] = useState(null);

    const showPopupMessage = (msg, isError = false) => {
        setPopup({ show: true, message: msg, error: isError });
        setTimeout(() => setPopup({ show: false, message: '', error: false }), 3000);
    };

    const fetchScannedItems = useCallback(async () => {
        try {
            const res = await axios.get('/get-scanned-items');
            setProducts(res.data.products || []);
            setTotalPrice(res.data.total_prize || 0);
        } catch (err) {
            console.error(err);
        }
    }, []);

    const fetchRecommended = useCallback(async () => {
        try {
            const res = await axios.get('/recommended');
            setRecommended(res.data || []);
        } catch (err) {
            console.error(err);
        }
    }, []);

    // Poll for updates while scanning
    useEffect(() => {
        let interval;
        if (scanning) {
            interval = setInterval(fetchScannedItems, 2000);
        }
        return () => clearInterval(interval);
    }, [scanning, fetchScannedItems]);

    // Initial load
    useEffect(() => {
        fetchScannedItems();
        fetchRecommended();
    }, [fetchScannedItems, fetchRecommended]);

    const startScanning = async () => {
        try {
            const res = await axios.post('/start', { delay: 1, user_id: 1 }); // Hardcoded user_id for now
            showPopupMessage(res.data.status);
            if (res.data.reset) {
                setProducts([]);
                setTotalPrice(0);
            }
            setScanning(true);
        } catch (err) {
            showPopupMessage('Error starting scan', true);
        }
    };

    const stopScanning = async () => {
        try {
            const res = await axios.post('/stop');
            setProducts(res.data.products || []);
            setTotalPrice(res.data.total_prize || 0);
            showPopupMessage(res.data.status);
            setScanning(false);
            fetchRecommended(); // Refresh recommendations
        } catch (err) {
            showPopupMessage('Error stopping scan', true);
        }
    };

    const addMoreItems = async () => {
        try {
            const res = await axios.post('/add-more', { delay: 1, user_id: 1 });
            showPopupMessage(res.data.status);
            setScanning(true);
        } catch (err) {
            showPopupMessage('Error adding more items', true);
        }
    };

    const removeItem = async (productName) => {
        try {
            const res = await axios.post('/remove', { product_name: productName });
            setProducts(res.data.products);
            setTotalPrice(res.data.total_prize);
            showPopupMessage(res.data.status);
        } catch (err) {
            showPopupMessage('Error removing item', true);
        }
    };

    const handleGenerateQr = async () => {
        try {
            const res = await axios.get('/qr', { responseType: 'blob' });
            setQrBlob(URL.createObjectURL(res.data));
            setShowQr(true);
        } catch (err) {
            showPopupMessage('Error generating QR', true);
        }
    };

    const handleGenerateBill = () => {
        // Opens the React Bill page in a new window/tab
        window.open('/bill', '_blank', 'width=600,height=800');
    };

    return (
        <div className="container fade-in" style={{ paddingTop: '20px', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h1 style={{ color: 'white', textShadow: '1px 1px 3px rgba(0,0,0,0.3)', marginBottom: '30px' }}>Barcode Scanner</h1>

            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '15px', marginBottom: '30px' }}>
                {!scanning ? (
                    <>
                        <button className="btn btn-primary" onClick={startScanning}>Start Scanning</button>
                        <button className="btn btn-primary" onClick={addMoreItems}>Add More Items</button>
                    </>
                ) : (
                    <button className="btn btn-primary" style={{ backgroundColor: '#e67e22' }} onClick={stopScanning}>Stop Scanning</button>
                )}

                <button className="btn btn-primary" onClick={handleGenerateQr}>Show QR Code</button>
                <button className="btn btn-primary" onClick={handleGenerateBill}>Generate Bill</button>
            </div>

            <div className="card" style={{ width: '100%', maxWidth: '800px', backgroundColor: 'white', marginBottom: '20px', overflowX: 'auto' }}>
                <h2 style={{ color: '#333', marginBottom: '20px' }}>Scanned Products</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#3498db', color: 'white' }}>
                            <th style={{ padding: '12px', textAlign: 'left' }}>S.No</th>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Product Name</th>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Price</th>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Qty</th>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Total</th>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.length === 0 ? (
                            <tr><td colSpan="6" style={{ padding: '12px', textAlign: 'center' }}>No items scanned yet.</td></tr>
                        ) : (
                            products.map((p, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '12px' }}>{i + 1}</td>
                                    <td style={{ padding: '12px' }}>{p.name}</td>
                                    <td style={{ padding: '12px' }}>{p.price}</td>
                                    <td style={{ padding: '12px' }}>{p.quantity}</td>
                                    <td style={{ padding: '12px' }}>{p.price * p.quantity}</td>
                                    <td style={{ padding: '12px' }}>
                                        <span
                                            style={{ cursor: 'pointer', color: '#e74c3c' }}
                                            onClick={() => removeItem(p.name)}
                                        >
                                            ❌
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                <h3 style={{ textAlign: 'right', color: '#e74c3c' }}>Total Bill: {totalPrice} rupees</h3>
            </div>

            <div className="card" style={{ width: '100%', maxWidth: '800px', backgroundColor: 'white' }}>
                <h2 style={{ color: '#333', marginBottom: '20px' }}>Recommended for You</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#2ecc71', color: 'white' }}>
                            <th style={{ padding: '12px', textAlign: 'left' }}>S.No</th>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Product Name</th>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recommended.map((p, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '12px' }}>{i + 1}</td>
                                <td style={{ padding: '12px' }}>{p.name}</td>
                                <td style={{ padding: '12px' }}>{p.price}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Popup Notification */}
            {popup.show && (
                <div style={{
                    position: 'fixed', top: '20px', right: '20px',
                    backgroundColor: popup.error ? '#e74c3c' : '#3498db',
                    color: 'white', padding: '15px 25px', borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 1000,
                    animation: 'fadeIn 0.3s ease'
                }}>
                    {popup.message}
                </div>
            )}

            {/* QR Code Modal */}
            {showQr && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', position: 'relative' }}>
                        <button
                            onClick={() => setShowQr(false)}
                            style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
                        >
                            ✖
                        </button>
                        <h3 style={{ marginBottom: '15px', color: '#333' }}>Payment QR Code</h3>
                        {qrBlob && <img src={qrBlob} alt="QR Code" style={{ maxWidth: '300px' }} />}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Scanner;

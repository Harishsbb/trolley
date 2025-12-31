import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../index.css';

const Bill = () => {
    const [products, setProducts] = useState([]);
    const [totalPrice, setTotalPrice] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBillData = async () => {
            try {
                // Try to get local data passed from Scanner first (WYSIWYG)
                const localData = localStorage.getItem('billData');
                if (localData) {
                    const parsed = JSON.parse(localData);
                    setProducts(parsed.products || []);
                    setTotalPrice(parsed.total_prize || 0);
                    setLoading(false);
                    // Clear it so future direct accesses might fetch fresh
                    // localStorage.removeItem('billData'); 
                    return;
                }

                // Fallback to server fetch
                const res = await axios.get('/get-scanned-items');
                setProducts(res.data.products || []);
                setTotalPrice(res.data.total_prize || 0);
            } catch (err) {
                console.error("Error fetching bill data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchBillData();
    }, []);

    if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>Loading Bill...</div>;

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', width: '100%', maxWidth: '600px', margin: '0 auto', boxSizing: 'border-box' }}>
            <div style={{
                position: 'relative',
                padding: '20px',
                border: '1px solid #ddd',
                backgroundColor: '#f9f9f9',
                overflow: 'hidden'
            }}>
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    backgroundColor: '#27ae60',
                    color: 'white',
                    padding: '10px 30px',
                    borderRadius: '10px',
                    fontSize: '2em',
                    fontWeight: 'bold',
                    transform: 'rotate(-30deg)',
                    opacity: 0.15,
                    pointerEvents: 'none'
                }}>
                    Invoice
                </div>

                <h1 style={{ textAlign: 'center', color: '#333' }}>Your Bill</h1>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', backgroundColor: 'white' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f2f2f2' }}>
                                <th style={{ border: '1px solid #000', padding: '10px', textAlign: 'left' }}>S.No</th>
                                <th style={{ border: '1px solid #000', padding: '10px', textAlign: 'left' }}>Product Name</th>
                                <th style={{ border: '1px solid #000', padding: '10px', textAlign: 'left' }}>Price</th>
                                <th style={{ border: '1px solid #000', padding: '10px', textAlign: 'left' }}>Quantity</th>
                                <th style={{ border: '1px solid #000', padding: '10px', textAlign: 'left' }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((product, index) => (
                                <tr key={index}>
                                    <td style={{ border: '1px solid #000', padding: '10px' }}>{index + 1}</td>
                                    <td style={{ border: '1px solid #000', padding: '10px' }}>{product.name}</td>
                                    <td style={{ border: '1px solid #000', padding: '10px' }}>{product.price}</td>
                                    <td style={{ border: '1px solid #000', padding: '10px' }}>{product.quantity}</td>
                                    <td style={{ border: '1px solid #000', padding: '10px' }}>{product.price * product.quantity}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div style={{ textAlign: 'right', fontSize: '1.2em', fontWeight: 'bold' }}>
                    Total: {Number(totalPrice).toFixed(2)} rupees
                </div>

                <div style={{ marginTop: '20px', textAlign: 'center', borderTop: '1px dashed #ccc', paddingTop: '20px' }}>
                    <h3>Scan to Pay</h3>
                    <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`upi://pay?pa=bavaharishkumar-2@okicici&pn=SnapShop&am=${Number(totalPrice).toFixed(2)}&cu=INR`)}`}
                        alt="Payment QR Code"
                        style={{ padding: '10px', background: 'white', border: '1px solid #ddd', borderRadius: '8px' }}
                    />
                    <p style={{ marginTop: '10px', color: '#666', fontSize: '0.9em' }}>
                        UPI / Wallet Payment
                    </p>
                </div>

                <div style={{ marginTop: '30px', textAlign: 'center' }}>
                    <button className="btn btn-primary" onClick={() => window.print()}>Print Bill</button>
                    <button className="btn" style={{ marginLeft: '10px', background: '#ccc' }} onClick={() => window.close()}>Close</button>
                </div>
            </div>
        </div>
    );
};

export default Bill;

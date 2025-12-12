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
    const [formData, setFormData] = useState({ name: '', price: '', qty: '' });
    const [removeName, setRemoveName] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchStock = async () => {
        try {
            const res = await axios.get('/api/stock');
            setProducts(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStock();
    }, []);

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('/api/product/add', {
                name: formData.name,
                price: parseFloat(formData.price),
                barcode: formData.name, // Using name as barcode per original code logic
                image_url: '',
                quantity: parseInt(formData.qty)
            });
            alert(res.data.status);
            setFormData({ name: '', price: '', qty: '' });
            fetchStock();
        } catch (err) {
            alert('Failed to add product');
        }
    };

    const handleRemove = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('/api/product/remove', {
                barcode: removeName
            });
            alert(res.data.status);
            setRemoveName('');
            fetchStock();
        } catch (err) {
            alert('Failed to remove product');
        }
    };

    const chartData = {
        labels: products.map(p => p.product_name || p.name),
        datasets: [
            {
                label: 'Available Stock',
                data: products.map(p => p.quantity),
                backgroundColor: 'rgba(52, 152, 219, 0.8)',
                borderRadius: 5,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Stock Levels',
            },
        },
    };

    return (
        <div className="container fade-in" style={{ paddingTop: '20px', minHeight: '100vh', paddingBottom: '50px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <Link to="/home" className="btn btn-primary" style={{ backgroundColor: '#7f8c8d' }}>&larr; Back to Home</Link>
                <h1 style={{ color: 'white', margin: 0 }}>Shop Dashboard</h1>
                <div style={{ width: '100px' }}></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                {/* Add Product Form */}
                <div className="card" style={{ backgroundColor: 'white' }}>
                    <h3 style={{ color: '#333' }}>Add Product</h3>
                    <form onSubmit={handleAdd}>
                        <div className="input-group">
                            <label>Product Name</label>
                            <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div className="input-group">
                            <label>Price</label>
                            <input type="number" required value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                        </div>
                        <div className="input-group">
                            <label>Quantity</label>
                            <input type="number" required value={formData.qty} onChange={e => setFormData({ ...formData, qty: e.target.value })} />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Add Product</button>
                    </form>
                </div>

                {/* Remove Product Form */}
                <div className="card" style={{ backgroundColor: 'white', height: 'fit-content' }}>
                    <h3 style={{ color: '#333' }}>Remove Product</h3>
                    <form onSubmit={handleRemove}>
                        <div className="input-group">
                            <label>Product name / Barcode</label>
                            <input type="text" required value={removeName} onChange={e => setRemoveName(e.target.value)} />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#e74c3c', width: '100%' }}>Remove Product</button>
                    </form>
                </div>
            </div>

            {/* Chart */}
            <div className="card" style={{ backgroundColor: 'white', marginBottom: '30px' }}>
                <div style={{ height: '300px' }}>
                    {loading ? 'Loading chart...' : <Bar options={chartOptions} data={chartData} />}
                </div>
            </div>

            {/* Product List */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                {products.map((p, i) => (
                    <div key={i} className="card" style={{ backgroundColor: 'white', padding: '15px' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>{p.product_name}</h4>
                        <p style={{ margin: '5px 0', color: '#7f8c8d' }}>Price: ₹{p.product_price}</p>
                        <p style={{ margin: '5px 0', fontWeight: 'bold', color: 'green' }}>Qty: {p.quantity}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Dashboard;

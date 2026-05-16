import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Mascot = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [visible, setVisible] = useState(false);
    const [bubbleVisible, setBubbleVisible] = useState(true);
    const [currentOffer, setCurrentOffer] = useState(null);
    const [availableOffers, setAvailableOffers] = useState([]);
    const [pos, setPos] = useState({ bottom: '30px', right: '30px', top: 'auto', left: 'auto', side: 'right' });
    const [isScanning, setIsScanning] = useState(false);
    
    // Drag-and-drop state
    const [dragPos, setDragPos] = useState(null); 
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const isRightSide = dragPos 
        ? (dragPos.x > window.innerWidth / 2) 
        : (pos.side === 'right');

    const hasMovedRef = React.useRef(false);

    useEffect(() => {
        const handleStatus = (e) => {
            setIsScanning(e.detail);
        };
        window.addEventListener('scanning-status', handleStatus);
        
        const handleMove = (e) => {
            if (!isDragging) return;
            hasMovedRef.current = true;
            const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
            const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
            
            // Boundary checks
            const newX = Math.max(20, Math.min(window.innerWidth - 100, clientX - dragStart.x));
            const newY = Math.max(20, Math.min(window.innerHeight - 100, clientY - dragStart.y));
            
            setDragPos({ x: newX, y: newY });
        };

        const handleUp = () => {
            setIsDragging(false);
            // Restore bubble only if it was already visible or if we didn't just drag
            // Actually, we want it to stay visible if it was visible.
            // setBubbleVisible(true); // Don't force show, let the user toggle
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleUp);
            window.addEventListener('touchmove', handleMove);
            window.addEventListener('touchend', handleUp);
        }

        return () => {
            window.removeEventListener('scanning-status', handleStatus);
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleUp);
        };
    }, [isDragging, dragStart]);

    const handleDragStart = (e) => {
        e.preventDefault();
        hasMovedRef.current = false;
        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
        
        const rect = e.currentTarget.getBoundingClientRect();
        setDragStart({
            x: clientX - rect.left,
            y: clientY - rect.top
        });
        setIsDragging(true);
        // setBubbleVisible(false); // Removed to keep suggestion visible while moving
    };

    const offers = [
        {
            title: "Flash Offer! 🔥",
            name: "Ariel Matic",
            image: "/static/images/ariel matic liquid detergent.jpg",
            discount: "50% OFF TODAY",
            tagline: "Save Big! Tap to add this offer to your cart 🛒✨",
            color: '#22c55e'
        },
        {
            title: "Limited Deal! ⚡",
            name: "Oreo Biscuits",
            image: "/static/images/oreo.jpeg",
            discount: "BUY 1 GET 1 FREE",
            tagline: "Snack time just got better! Limited stock 🍪",
            color: '#3b82f6'
        },
        {
            title: "Daily Special! ✨",
            name: "Maaza Juice",
            image: "/static/images/slice.jpeg",
            discount: "FLAT 30% OFF",
            tagline: "Refresh your day with some mango magic! 🥭",
            color: '#f59e0b'
        },
        {
            title: "Mega Sale! 📦",
            name: "Surf Excel",
            image: "/static/images/surf excel washing powder.jpg",
            discount: "EXTRA ₹100 OFF",
            tagline: "Best time to stock up on essentials! 🧺",
            color: '#0ea5e9'
        },
        {
            title: "Quick Snack! 🍟",
            name: "Lays Classic",
            image: "/static/images/lays.jpeg",
            discount: "FREE GIFT",
            tagline: "Free pack on orders above ₹499! 😋",
            color: '#ef4444'
        }
    ];

    const positions = [
        { bottom: '30px', right: '30px', top: 'auto', left: 'auto', side: 'right' },
        { bottom: '30px', left: '30px', top: 'auto', right: 'auto', side: 'left' },
        { top: '30px', right: '20px', bottom: 'auto', left: 'auto', side: 'right' },
        { top: '100px', left: '20px', bottom: 'auto', right: 'auto', side: 'left' },
    ];

    // Only show on dashboard/customer pages, and NOT for admins
    const dashboardPages = ['/home', '/scanner', '/search', '/history', '/product'];
    const isAdmin = localStorage.getItem('role') === 'admin';
    const isCustomerPage = dashboardPages.some(path => location.pathname.startsWith(path));
    const shouldShow = isCustomerPage && !isAdmin;

    // 1. Data Fetching - Only on mount or page change
    useEffect(() => {
        if (!shouldShow) {
            setVisible(false);
            return;
        }

        const fetchAndFilterOffers = async () => {
            try {
                const offersRes = await axios.get('/api/offers');
                const rawOffers = offersRes.data;

                const res = await axios.get('/api/stock');
                const stock = res.data;

                const filtered = [];
                rawOffers.forEach(o => {
                    const product = stock.find(p =>
                        (p.product_name || p.name || "").toLowerCase().includes(o.product_name.toLowerCase()) &&
                        (p.quantity > 0)
                    );

                    if (product) {
                        const original = parseFloat(product.product_price || 0);
                        let final = original;
                        
                        if (o.offer_type === 'pct') {
                            final = original * (1 - (o.offer_value || 0) / 100);
                        } else if (o.offer_type === 'flat') {
                            final = Math.max(0, original - (o.offer_value || 0));
                        }

                        filtered.push({
                            title: o.title,
                            name: o.product_name,
                            image: o.image,
                            discount: o.discount_label,
                            tagline: o.tagline,
                            color: o.color,
                            original_price: original,
                            discounted_price: final
                        });
                    }
                });

                let finalOffers = filtered;
                if (filtered.length === 0) {
                    const inStock = stock.filter(p => (p.quantity || 0) > 0);
                    finalOffers = inStock.slice(0, 5).map(p => ({
                        title: "Smart Pick! ✨",
                        name: p.product_name || p.name,
                        image: p.image || "/static/images/placeholder.svg",
                        discount: "AVAILABLE NOW",
                        tagline: `Only ${p.quantity} left in stock! Grab yours now 🛍️`,
                        color: '#6366f1',
                        original_price: parseFloat(p.product_price || 0),
                        discounted_price: parseFloat(p.product_price || 0)
                    }));
                }

                setAvailableOffers(finalOffers);

                if (finalOffers.length > 0 && !currentOffer) {
                    setCurrentOffer(finalOffers[Math.floor(Math.random() * finalOffers.length)]);
                    setPos(positions[Math.floor(Math.random() * positions.length)]);
                    setTimeout(() => setVisible(true), 2000);
                }
            } catch (err) {
                console.error("Mascot failed to fetch data:", err);
                setVisible(false);
            }
        };

        fetchAndFilterOffers();
    }, [shouldShow, location.pathname]);

    // 2. Roaming Interval - Positions stop if dragPos exists, but Offers continue
    useEffect(() => {
        if (!shouldShow || availableOffers.length === 0) return;

        const interval = setInterval(() => {
            const randomOffer = availableOffers[Math.floor(Math.random() * availableOffers.length)];
            setCurrentOffer(randomOffer);
            
            // Only move automatically if user hasn't taken manual control
            if (!dragPos) {
                const randomPos = positions[Math.floor(Math.random() * positions.length)];
                setPos(randomPos);
            }
        }, 10000); // 10 seconds per suggestion as requested

        return () => clearInterval(interval);
    }, [shouldShow, dragPos, availableOffers]);

    if (!visible || !currentOffer || isScanning) return null;

    const emojis = ['🛒', '✨', '🔥', '🍎', '🍫', '🛍️', '💰', '🏷️', '📦', '🎁', '🚀'];

    const isTopHalf = dragPos && dragPos.y < 300;

    return (
        <div style={{
            position: 'fixed',
            zIndex: 10000,
            display: 'flex',
            flexDirection: isTopHalf ? 'column-reverse' : 'column',
            pointerEvents: 'none',
            // Manual positioning overrides auto-roaming
            ...(dragPos ? {
                top: dragPos.y,
                left: dragPos.x,
                bottom: 'auto',
                right: 'auto',
                transition: isDragging ? 'none' : 'all 0.5s ease', // Smooth snap after drop
                animation: 'none',
                alignItems: dragPos.x > window.innerWidth / 2 ? 'flex-end' : 'flex-start'
            } : {
                bottom: pos.bottom,
                right: pos.right,
                top: pos.top,
                left: pos.left,
                alignItems: pos.side === 'right' ? 'flex-end' : 'flex-start',
                transition: 'all 2.5s cubic-bezier(0.4, 0, 0.2, 1)',
                animation: 'roam 15s linear infinite'
            })
        }}>
            {/* 3D Mascot Image Container (Anchor) */}
            <div 
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
                style={{
                    width: '140px',
                    height: '140px',
                    cursor: isDragging ? 'grabbing' : 'move',
                    pointerEvents: 'auto',
                    animation: 'floatMascot 4s ease-in-out infinite',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    userSelect: 'none',
                    position: 'relative' // Anchor for bubble and particles
                }} 
                onClick={() => {
                    if (hasMovedRef.current) return;
                    setBubbleVisible(!bubbleVisible);
                }}
            >
                {/* Continuous Floating Emojis Effect */}
                <div style={{ position: 'absolute', bottom: '60px', left: '50%', transform: 'translateX(-50%)' }}>
                    {[...Array(6)].map((_, i) => (
                        <span key={i} style={{
                            position: 'absolute',
                            fontSize: '1.2rem',
                            animation: `floatParticle ${2 + i}s linear infinite`,
                            animationDelay: `${i * 0.5}s`,
                            opacity: 0,
                            zIndex: -1
                        }}>
                            {emojis[Math.floor(Math.random() * emojis.length)]}
                        </span>
                    ))}
                </div>

                {/* New Integrated Glassmorphic Bubble (No inner rectangle box) */}
                {bubbleVisible && currentOffer && (
                    <div
                        key={`${currentOffer.name}-${isRightSide ? 'right' : 'left'}`}
                        className="bubble-premium fade-in"
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate('/search', { state: { query: currentOffer.name } });
                        }}
                        style={{
                            background: `linear-gradient(135deg, ${currentOffer.color}bb 0%, ${currentOffer.color}ee 100%)`,
                            backdropFilter: 'blur(24px) saturate(200%)',
                            padding: '24px',
                            borderRadius: isRightSide ? '40px 40px 4px 40px' : '40px 40px 40px 4px',
                            boxShadow: `0 35px 70px -15px ${currentOffer.color}88, inset 0 0 0 1.5px rgba(255, 255, 255, 0.4)`,
                            position: 'absolute',
                            width: '320px',
                            ...(isTopHalf ? { top: '150px' } : { bottom: '150px' }),
                            ...(isRightSide ? { right: '-20px' } : { left: '-20px' }),
                            pointerEvents: 'auto',
                            cursor: 'pointer',
                            zIndex: 10001,
                            animation: 'floatBubble 3.1s ease-in-out infinite',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                            border: '1px solid rgba(255, 255, 255, 0.2)'
                        }}
                    >
                        {/* Integrated Content Layout */}
                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                            {/* Floating Image with Glow */}
                            <div style={{
                                width: '100px',
                                height: '100px',
                                background: 'rgba(255, 255, 255, 0.15)',
                                borderRadius: '24px',
                                padding: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.2), inset 0 0 20px rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                flexShrink: 0
                            }}>
                                <img 
                                    src={currentOffer.image || 'https://placehold.co/100'} 
                                    style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.2))' }} 
                                    alt="" 
                                />
                            </div>

                            {/* Info Section */}
                            <div style={{ flex: 1 }}>
                                <div style={{ 
                                    color: 'white', 
                                    fontSize: '1rem', 
                                    fontWeight: '900', 
                                    lineHeight: '1.2', 
                                    marginBottom: '8px',
                                    textShadow: '0 2px 4px rgba(0,0,0,0.2)' 
                                }}>
                                    {currentOffer.name}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <div style={{ 
                                        color: '#fbbf24', 
                                        fontWeight: '900', 
                                        fontSize: '0.8rem', 
                                        letterSpacing: '0.05em',
                                        textTransform: 'uppercase' 
                                    }}>
                                        {currentOffer.discount}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                                        <span style={{ color: 'white', fontSize: '1.4rem', fontWeight: '900' }}>₹{currentOffer.discounted_price.toFixed(0)}</span>
                                        {currentOffer.discounted_price < currentOffer.original_price && (
                                            <span style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'line-through', fontSize: '0.9rem', fontWeight: '600' }}>₹{currentOffer.original_price}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Integrated Action Footer */}
                        <div style={{ 
                            borderTop: '1px solid rgba(255,255,255,0.2)', 
                            paddingTop: '12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span style={{ color: 'white', fontWeight: '700', fontSize: '0.9rem' }}>{currentOffer.title}</span>
                            <div style={{ 
                                background: 'white', 
                                color: currentOffer.color, 
                                padding: '6px 16px', 
                                borderRadius: '12px', 
                                fontWeight: '800', 
                                fontSize: '0.85rem',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                            }}>
                                Add to cart! 🛒
                            </div>
                        </div>
                    </div>
                )}
                
                <img
                    src="/mascot-removebg-preview.png"
                    alt="Assistant Mascot"
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 20px 40px rgba(0, 0, 0, 0.15))'
                    }}
                />
            </div>

            <style>{`
                @keyframes floatMascot {
                    0%, 100% { transform: translateY(0) rotate(0); }
                    50% { transform: translateY(-12px) rotate(4deg); }
                }
                @keyframes floatBubble {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }
                @keyframes pulseDiscount {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.05); opacity: 0.8; }
                }
                @keyframes slideInUp {
                    from { transform: translateY(30px) scale(0.9); opacity: 0; }
                    to { transform: translateY(0) scale(1); opacity: 1; }
                }
                .fade-in {
                    animation: slideInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                @keyframes floatParticle {
                    0% { transform: translateY(0) scale(0.5); opacity: 0; }
                    20% { opacity: 1; }
                    80% { opacity: 0.8; }
                    100% { transform: translateY(-120px) scale(1.2); opacity: 0; }
                }
                @keyframes roam {
                    0% { transform: translate(0, 0); }
                    25% { transform: translate(-20px, -20px); }
                    50% { transform: translate(20px, -10px); }
                    75% { transform: translate(-10px, 20px); }
                    100% { transform: translate(0, 0); }
                }
                .bubble-premium {
                    transition: all 0.5s ease;
                }
            `}</style>
        </div>
    );
};

export default Mascot;

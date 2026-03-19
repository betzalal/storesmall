import { useState, useEffect } from 'react';
import axios from 'axios';
import { ShoppingCart, Plus, Minus, Trash2, X, Check, ChevronDown, ChevronUp, FileDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';



const HistoryItem = ({ sale, user, onDelete }) => {
    const [expanded, setExpanded] = useState(false);
    const hasDetails = (sale.items && sale.items.length > 0) || sale.notes;

    return (
        <>
            <tr style={{ borderBottom: expanded ? 'none' : '1px solid #eee', background: expanded ? '#f9f9f9' : 'transparent' }}>
                <td style={{ padding: '10px' }}>{new Date(sale.timestamp).toLocaleString()}</td>
                <td style={{ padding: '10px' }}>
                    <div>{sale.customer_name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#777' }}>{sale.customer_nit}</div>
                    {sale.customer_whatsapp && <div style={{ fontSize: '0.8rem', color: '#25D366', fontWeight: 'bold' }}>{sale.customer_whatsapp}</div>}
                </td>
                <td style={{ padding: '10px' }}>{sale.seller}</td>
                <td style={{ padding: '10px' }}>{sale.payment_method}</td>
                <td style={{ padding: '10px', fontWeight: 'bold' }}>Bs {sale.total}</td>
                <td style={{ padding: '10px' }}>
                    <div style={{ display: 'flex', gap: '5px' }}>
                        {hasDetails && (
                            <button onClick={() => setExpanded(!expanded)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                        )}
                        {user?.role === 'admin' && (
                            <button onClick={() => onDelete(sale.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'red' }} title="Eliminar Venta">
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                </td>
            </tr>
            {expanded && (
                <tr style={{ borderBottom: '1px solid #eee', background: '#f9f9f9' }}>
                    <td colSpan="6" style={{ padding: '10px 20px' }}>
                        {sale.notes && (
                            <div style={{ marginBottom: '10px', color: '#555', fontStyle: 'italic' }}>
                                <strong>Nota:</strong> {sale.notes}
                            </div>
                        )}
                        {sale.items && sale.items.length > 0 && (
                            <table style={{ width: '100%', fontSize: '0.9rem', background: 'rgba(255,255,255,0.5)', borderRadius: '5px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #ddd' }}>
                                        <th style={{ textAlign: 'left', padding: '5px' }}>Producto</th>
                                        <th style={{ textAlign: 'center', padding: '5px' }}>Cant</th>
                                        <th style={{ textAlign: 'right', padding: '5px' }}>P. Unit</th>
                                        <th style={{ textAlign: 'right', padding: '5px' }}>Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sale.items.map((item, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: '5px' }}>{item.name} <span style={{ color: '#777', fontSize: '0.8em' }}>({item.code})</span></td>
                                            <td style={{ textAlign: 'center', padding: '5px' }}>{item.quantity}</td>
                                            <td style={{ textAlign: 'right', padding: '5px' }}>{item.price}</td>
                                            <td style={{ textAlign: 'right', padding: '5px' }}>{(item.quantity * item.price).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </td>
                </tr>
            )}
        </>
    );
};

const POS = ({ selectedMonth }) => {
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [history, setHistory] = useState([]);
    const [isFastMode, setIsFastMode] = useState(false);
    const [variantsModalId, setVariantsModalId] = useState(null);
    const [fullScreenImage, setFullScreenImage] = useState(null);
    const BACKEND_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/api$/, '');

    const [editingPriceId, setEditingPriceId] = useState(null); // For Catalog
    const [cartEditingId, setCartEditingId] = useState(null); // For Cart
    const [newPrice, setNewPrice] = useState('');
    const [cartNewPrice, setCartNewPrice] = useState(''); // For Cart
    const { user } = useAuth();
    const { currentStore } = useStore();
    const [notes, setNotes] = useState(''); // Sales notes

    // Customer Form State
    const [customer, setCustomer] = useState({
        name: '',
        nit: '',
        whatsapp: '',
        delivery: 'store' // 'store' or 'shipping'
    });
    const [paymentMethod, setPaymentMethod] = useState('cash'); // cash, qr, deposit

    useEffect(() => {
        if (currentStore) fetchProducts();
    }, [currentStore]);

    const fetchProducts = async () => {
        try {
            const res = await axios.get(`/products?store_id=${currentStore?.id || 1}`);
            setProducts(res.data);
        } catch (err) {
            console.error("Error fetching products", err);
        }
    };

    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                // Check stock limit
                if (existing.quantity + 1 > product.quantity) {
                    alert('Stock insuficiente');
                    return prev;
                }
                return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const removeFromCart = (productId) => {
        setCart(prev => prev.filter(item => item.id !== productId));
    };

    const updateQuantity = (productId, delta) => {
        setCart(prev => prev.map(item => {
            if (item.id === productId) {
                const newQty = item.quantity + delta;
                if (newQty < 1) return item;
                // Stock check
                const product = products.find(p => p.id === productId);
                if (newQty > product.quantity) {
                    alert('Stock insuficiente');
                    return item;
                }
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const updateCartPrice = (productId, price) => {
        setCart(prev => prev.map(item => item.id === productId ? { ...item, price: parseFloat(price) } : item));
        setCartEditingId(null);
    };



    const handleCheckout = async () => {
        if (cart.length === 0) return;

        let finalCustomer = customer;
        if (isFastMode) {
            finalCustomer = { name: 'Venta Rápida', nit: '', whatsapp: '', delivery: 'store' };
        }

        try {
            const saleData = {
                store_id: currentStore?.id,
                user_id: user?.id,
                customer: finalCustomer,
                items: cart,
                payment_method: paymentMethod,
                total: cartTotal,
                notes: notes
            };

            const res = await axios.post('/sales', saleData);
            if (res.data.success) {
                alert('Venta realizada con éxito!');
                setCart([]);
                setIsCheckoutOpen(false);
                setCustomer({ name: '', nit: '', whatsapp: '', delivery: 'store' });
                setNotes('');
                fetchProducts(); // Refresh stock
            }
        } catch (err) {
            alert('Error al procesar la venta');
            console.error(err);
        }
    };

    const handlePriceUpdate = async (id) => {
        await axios.post('/products/price', { id, price: parseFloat(newPrice) });
        setEditingPriceId(null);
        fetchProducts();
    };

    const fetchHistory = async () => {
        let url = `/sales?store_id=${currentStore?.id || 1}`;
        if (selectedMonth) url += `&month=${selectedMonth}`;
        const res = await axios.get(url);
        setHistory(res.data);
    };

    useEffect(() => {
        if (isHistoryOpen) {
            fetchHistory();
        }
    }, [selectedMonth, currentStore]);

    const handleDeleteSale = async (id) => {
        if (!confirm('¿Está seguro de eliminar esta venta? Esta acción no se puede deshacer.')) return;
        try {
            await axios.delete(`/sales/${id}`);
            fetchHistory(); // Reload
        } catch (e) {
            alert('Error al eliminar venta');
        }
    };

    const handleExportPDF = () => {
        const element = document.getElementById('sales-history-table');
        if (!element) return;

        const opt = {
            margin: 0.5,
            filename: `Reporte_Ventas_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        if (window.html2pdf) {
            window.html2pdf().set(opt).from(element).save();
        } else {
            alert("Librería PDF no disponible. Intente imprimir (Ctrl+P).");
        }
    };

    const socketIo = null; // Placeholder to avoid breaking if referenced later? No.

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ padding: '20px', height: '100%', display: 'flex', gap: '20px', overflow: 'hidden' }}>
            {/* Products Grid */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', padding: '15px' }}>
                    <h2 style={{ margin: 0 }}>Productos</h2>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: isFastMode ? '#28a745' : '#e0e0e0', color: isFastMode ? 'white' : '#333', padding: '8px 15px', borderRadius: '20px', fontWeight: 'bold' }}>
                            <input type="checkbox" checked={isFastMode} onChange={e => setIsFastMode(e.target.checked)} style={{ display: 'none' }} />
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: isFastMode ? 'white' : '#999' }}></div>
                            {isFastMode ? 'Modo Rápido' : 'Modo Normal'}
                        </label>
                        <button onClick={() => { setIsHistoryOpen(true); fetchHistory(); }} className="btn-primary" style={{ background: '#6c757d', padding: '8px' }}>Ver Ventas</button>
                        <input
                            type="text"
                            placeholder="Buscar producto..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ width: '300px' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px', overflowY: 'auto', paddingBottom: '20px' }}>
                    {filteredProducts.filter(p => !p.parent_id).map(p => {
                        const variants = products.filter(v => v.parent_id === p.id);
                        return (
                            <div key={p.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'transform 0.2s', position: 'relative' }}>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.8rem', color: '#777', marginBottom: '5px' }}>{p.code}</div>
                                        <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem' }}>{p.name}</h3>

                                        {editingPriceId === p.id ? (
                                            <div style={{ marginBottom: '10px' }}>
                                                <input value={newPrice} onChange={e => setNewPrice(e.target.value)} style={{ width: '60px', padding: '5px' }} />
                                                <button onClick={() => handlePriceUpdate(p.id)} style={{ marginLeft: '5px', padding: '5px', cursor: 'pointer' }}>OK</button>
                                                <button onClick={() => setEditingPriceId(null)} style={{ marginLeft: '5px', padding: '5px', cursor: 'pointer' }}>X</button>
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--secondary-color)', display: 'flex', alignItems: 'center' }}>
                                                Bs {p.price} {variants.length > 0 && <span style={{fontSize:'0.7rem', color:'#999', marginLeft:'5px'}}>(Base)</span>}
                                                {user?.role === 'admin' && (
                                                    <button onClick={() => { setEditingPriceId(p.id); setNewPrice(p.price); }} style={{ marginLeft: '10px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5 }}>✏️</button>
                                                )}
                                            </div>
                                        )}

                                        <div style={{ fontSize: '0.9rem', color: p.quantity > 0 || variants.length > 0 ? 'green' : 'red' }}>
                                            {variants.length > 0 ? `${variants.length} Opciones` : `Stock: ${p.quantity}`}
                                        </div>
                                    </div>
                                    {p.image_url && (
                                        <div 
                                            style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd', flexShrink: 0, cursor: 'pointer' }}
                                            onClick={() => setFullScreenImage(`${BACKEND_URL}${p.image_url}`)}
                                            title="Ver Imagen"
                                        >
                                            <img src={`${BACKEND_URL}${p.image_url}`} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    )}
                                </div>
                                {variants.length > 0 ? (
                                    <button
                                        onClick={() => setVariantsModalId(p.id)}
                                        className="btn-primary"
                                        style={{ marginTop: '15px', padding: '8px', background: '#17a2b8' }}
                                    >
                                        Ver Opciones
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => addToCart(p)}
                                        disabled={p.quantity <= 0}
                                        className="btn-primary"
                                        style={{ marginTop: '15px', padding: '8px', opacity: p.quantity <= 0 ? 0.5 : 1 }}
                                    >
                                        Agregar
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Cart Sidebar */}
            <div className="glass-card" style={{ width: '400px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ borderBottom: '1px solid #ddd', paddingBottom: '15px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ShoppingCart size={24} />
                    <h2 style={{ margin: 0 }}>Carrito</h2>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {cart.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#999', marginTop: '50px' }}>Carrito vacío</div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.5)', padding: '10px', borderRadius: '10px' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                                    <div style={{ fontSize: '0.9rem', color: '#555', display: 'flex', alignItems: 'center' }}>
                                        {item.quantity} x
                                        {cartEditingId === item.id ? (
                                            <div style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '5px' }}>
                                                <input
                                                    value={cartNewPrice}
                                                    onChange={e => setCartNewPrice(e.target.value)}
                                                    style={{ width: '50px', padding: '2px' }}
                                                    autoFocus
                                                />
                                                <button onClick={() => updateCartPrice(item.id, cartNewPrice)} style={{ marginLeft: '2px', cursor: 'pointer', background: '#ccc', border: 'none', borderRadius: '3px' }}>ok</button>
                                            </div>
                                        ) : (
                                            <>
                                                <span style={{ margin: '0 5px' }}>Bs {item.price}</span>
                                                <button onClick={() => { setCartEditingId(item.id); setCartNewPrice(item.price); }} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5 }}>✏️</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <button onClick={() => updateQuantity(item.id, -1)} style={{ padding: '5px', borderRadius: '5px', border: 'none', cursor: 'pointer' }}><Minus size={14} /></button>
                                    <span>{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.id, 1)} style={{ padding: '5px', borderRadius: '5px', border: 'none', cursor: 'pointer' }}><Plus size={14} /></button>
                                </div>
                                <button onClick={() => removeFromCart(item.id)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={18} /></button>
                            </div>
                        ))
                    )}
                </div>

                <div style={{ marginTop: '20px', borderTop: '1px solid #ddd', paddingTop: '15px' }}>
                    <div className="flex-between" style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '20px' }}>
                        <span>Total:</span>
                        <span>Bs {cartTotal.toFixed(2)}</span>
                    </div>
                    <button
                        className="btn-primary"
                        style={{ width: '100%', padding: '15px', fontSize: '1.1rem' }}
                        disabled={cart.length === 0}
                        onClick={() => setIsCheckoutOpen(true)}
                    >
                        Procesar Venta
                    </button>
                </div>
            </div>

            {/* Checkout Modal */}
            {isCheckoutOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="glass-card" style={{ width: '600px', background: '#fff' }}>
                        <div className="flex-between" style={{ marginBottom: '20px' }}>
                            <h2>Confirmar Venta {isFastMode && <span style={{fontSize: '0.8em', color: '#28a745'}}>(Modo Rápido)</span>}</h2>
                            <button onClick={() => setIsCheckoutOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                        </div>

                        {!isFastMode && (
                            <>
                                <div className="grid-cols-2" style={{ marginBottom: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '5px' }}>Nombre Cliente</label>
                                        <input value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} placeholder="Nombre completo" />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '5px' }}>NIT / CI</label>
                                        <input value={customer.nit} onChange={e => setCustomer({ ...customer, nit: e.target.value })} placeholder="1234567" />
                                    </div>
                                </div>

                                <div className="grid-cols-2" style={{ marginBottom: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '5px' }}>WhatsApp</label>
                                        <input value={customer.whatsapp} onChange={e => setCustomer({ ...customer, whatsapp: e.target.value })} placeholder="+591..." />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '5px' }}>Tipo de Entrega</label>
                                        <select value={customer.delivery} onChange={e => setCustomer({ ...customer, delivery: e.target.value })}>
                                            <option value="store">Venta en Tienda</option>
                                            <option value="shipping">Envío</option>
                                        </select>
                                    </div>
                                </div>
                            </>
                        )}

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Método de Pago</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {['cash', 'qr', 'deposit'].map(method => (
                                    <button
                                        key={method}
                                        onClick={() => setPaymentMethod(method)}
                                        style={{
                                            flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #ccc',
                                            background: paymentMethod === method ? 'var(--primary-color)' : 'white',
                                            color: paymentMethod === method ? 'white' : 'black',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {method === 'cash' ? 'Efectivo' : method === 'qr' ? 'QR' : 'Depósito'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-between" style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '20px', background: '#f0f0f0', padding: '15px', borderRadius: '10px' }}>
                            <span>Total a Pagar:</span>
                            <span>Bs {cartTotal.toFixed(2)}</span>
                        </div>

                        <button className="btn-primary" style={{ width: '100%', padding: '15px', fontSize: '1.2rem' }} onClick={handleCheckout}>
                            <Check style={{ marginRight: '10px', verticalAlign: 'middle' }} />
                            Finalizar Venta
                        </button>
                    </div>
                </div>
            )}
            {isHistoryOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="glass-card" style={{ width: '800px', background: '#fff', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                        <div className="flex-between" style={{ padding: '20px', borderBottom: '1px solid #eee' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <h2>Historial de Ventas</h2>
                                <button onClick={handleExportPDF} className="btn-primary" style={{ padding: '5px 10px', fontSize: '0.9rem', background: '#28a745', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <FileDown size={16} /> PDF
                                </button>
                            </div>
                            <button onClick={() => setIsHistoryOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }} id="sales-history-content">
                            <table id="sales-history-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                                        <th style={{ padding: '10px' }}>Fecha</th>
                                        <th style={{ padding: '10px' }}>Cliente</th>
                                        <th style={{ padding: '10px' }}>Vendedor</th>
                                        <th style={{ padding: '10px' }}>Pago</th>
                                        <th style={{ padding: '10px' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map(sale => (
                                        <HistoryItem key={sale.id} sale={sale} user={user} onDelete={handleDeleteSale} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Variants Modal */}
            {variantsModalId && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="glass-card" style={{ width: '400px', background: '#fff', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                        <div className="flex-between" style={{ marginBottom: '20px' }}>
                            <h2 style={{ margin: 0 }}>Seleccionar Opción</h2>
                            <button onClick={() => setVariantsModalId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
                            {products.filter(v => v.parent_id === variantsModalId).map(v => (
                                <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: '#f5f5f5', borderRadius: '8px', border: '1px solid #eee' }}>
                                    <div>
                                        <strong style={{ fontSize: '1.1rem' }}>{v.name}</strong>
                                        <div style={{ fontSize: '0.9rem', color: '#555', marginTop: '5px' }}>Bs {v.price} | Disp: <span style={{color: v.quantity > 0 ? 'green' : 'red', fontWeight:'bold'}}>{v.quantity}</span></div>
                                    </div>
                                    <button className="btn-primary" onClick={() => { addToCart(v); setVariantsModalId(null); }} disabled={v.quantity <= 0} style={{ opacity: v.quantity <= 0 ? 0.5 : 1, padding: '8px 15px' }}>Agregar</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Full Screen Image Modal */}
            {fullScreenImage && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setFullScreenImage(null)}>
                    <img src={fullScreenImage} style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: '8px' }} alt="Muestra de Producto" />
                    <button style={{ position: 'absolute', top: '20px', right: '20px', background: 'white', border: 'none', borderRadius: '50%', padding: '5px', cursor: 'pointer' }} onClick={() => setFullScreenImage(null)}>
                        <X size={24} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default POS;

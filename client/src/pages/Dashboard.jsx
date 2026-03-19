import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Link } from 'react-router-dom';
import { Settings, LogOut, Users, Activity, Building } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import axios from 'axios';

import POS from './POS';
import Inventory from './Inventory';
import Quotes from './Quotes';
import StoreManager from './StoreManager';
import SalesReports from './SalesReports';

// Sub-components (Placeholder)
const Menu = () => {
    // Images: 
    // 0: Logo (used in login)
    // 1: Cotizaciones? 
    // 2: Tiendas?
    // 3: Almacen?
    // We'll use them as backgrounds for cards.
    const menuItems = [
        { title: 'Cotizaciones', path: 'quotes', img: '/assets/menu_cotizaciones.jpg' },
        { title: 'Tiendas / Ventas', path: 'pos', img: '/assets/menu_tiendas.jpg' },
        { title: 'Inventario', path: 'inventory', img: '/assets/menu_almacen.jpg' }
    ];

    return (
        <div style={{ padding: '40px', display: 'flex', gap: '40px', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
            {menuItems.map((item, idx) => (
                <Link to={item.path} key={idx} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="glass-card" style={{
                        width: '300px', height: '400px',
                        display: 'flex', flexDirection: 'column',
                        transition: 'transform 0.3s', cursor: 'pointer',
                        overflow: 'hidden', padding: 0
                    }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <div style={{ flex: 1, background: `url(${item.img}) center/cover` }}></div>
                        <div style={{ padding: '20px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>
                            {item.title}
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );
};

// Placeholders for modules


const SettingsModal = ({ onClose }) => {
    const { logout, user } = useAuth();
    const [view, setView] = useState('menu'); // menu, users, logs
    const [users, setUsers] = useState([]);
    const [logs, setLogs] = useState([]);
    // Default store_id will be set when stores are loaded or first one picked
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user', store_id: '' });
    const { stores, currentStore, setStore } = useStore();

    useEffect(() => {
        if (stores.length > 0 && !newUser.store_id) {
            setNewUser(prev => ({ ...prev, store_id: stores[0].id }));
        }
    }, [stores]);

    const fetchUsers = async () => {
        try {
            const res = await axios.get('/users');
            setUsers(res.data);
        } catch (e) { console.error(e); }
    };

    const fetchLogs = async () => {
        try {
            const res = await axios.get('/logs');
            setLogs(res.data);
        } catch (e) { console.error(e); }
    };

    const addUser = async () => {
        try {
            await axios.post('/users', newUser);
            setNewUser({ username: '', password: '', role: 'user', store_id: 1 });
            fetchUsers();
            alert('Usuario creado');
        } catch (e) { alert('Error al crear usuario'); }
    };

    const deleteUser = async (id) => {
        if (confirm('¿Eliminar usuario?')) {
            await axios.delete(`/users/${id}`);
            fetchUsers();
        }
    };



    const renderContent = () => {
        if (view === 'menu') {
            return (
                <div style={{ display: 'grid', gap: '10px' }}>
                    {/* Store Selector for Admin inside Settings */}
                    {user?.role === 'admin' && (
                        <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '5px', marginBottom: '5px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.8rem', color: '#777' }}>Tienda Activa:</label>
                            <div style={{ display: 'flex', gap: '5px' }}>
                                <Building size={18} />
                                <select
                                    value={currentStore?.id || ''}
                                    onChange={(e) => setStore(e.target.value)}
                                    style={{ flex: 1, padding: '5px' }}
                                >
                                    {stores.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {user?.role === 'admin' && (
                        <>
                            <button onClick={() => { setView('users'); fetchUsers(); }} className="btn-primary" style={{ background: '#ddd', color: '#333' }}>
                                <Users size={18} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
                                Gestión de Usuarios (Admin)
                            </button>
                            <button onClick={() => setView('stores')} className="btn-primary" style={{ background: '#ddd', color: '#333' }}>
                                <Building size={18} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
                                Gestión de Tiendas (Admin)
                            </button>
                            <button onClick={() => { setView('logs'); fetchLogs(); }} className="btn-primary" style={{ background: '#ddd', color: '#333' }}>
                                <Activity size={18} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
                                Ver Logs de Acceso
                            </button>
                        </>
                    )}
                    <button onClick={logout} className="btn-primary" style={{ background: '#ff4d4d', color: 'white' }}>
                        <LogOut size={18} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
                        Cerrar Sesión
                    </button>
                </div>
            );
        }
        // ... users, logs, stores views remain similar
        if (view === 'users') {
            return (
                <div>
                    <button onClick={() => setView('menu')} style={{ marginBottom: '10px', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>&lt; Volver</button>
                    <h3>Usuarios</h3>
                    <div style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
                        <input value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} placeholder="Usuario" style={{ width: '100px' }} />
                        <input value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} placeholder="Pass" style={{ width: '100px' }} />
                        <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} style={{ width: '80px' }}><option value="user">User</option><option value="admin">Admin</option></select>
                        <select value={newUser.store_id} onChange={e => setNewUser({ ...newUser, store_id: e.target.value })} style={{ width: '120px' }}>
                            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <button onClick={addUser} className="btn-primary" style={{ padding: '5px' }}>+</button>
                    </div>
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {users.map(u => (
                            <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px', borderBottom: '1px solid #eee' }}>
                                <div>
                                    <strong>{u.username}</strong> ({u.role})
                                    <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: u.is_online ? 'green' : 'gray' }}>● {u.is_online ? 'Online' : 'Offline'}</span>
                                    <div style={{ fontSize: '0.7rem', color: '#999' }}>Last: {new Date(u.last_seen).toLocaleString()}</div>
                                </div>
                                <div>
                                    <button onClick={() => {
                                        const newPass = prompt(`Nuevo password para ${u.username}:`);
                                        if (newPass) {
                                            axios.put(`/users/${u.id}/password`, { password: newPass })
                                                .then(() => alert('Contraseña actualizada'))
                                                .catch(e => alert('Error al actualizar contraseña'));
                                        }
                                    }} style={{ color: '#007bff', border: '1px solid #007bff', background: 'none', cursor: 'pointer', marginRight: '10px', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>Reset Pass</button>
                                    <button onClick={() => deleteUser(u.id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', padding: '2px 5px', fontSize: '1rem' }} title="Eliminar">&times;</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        if (view === 'logs') {
            return (
                <div>
                    <button onClick={() => setView('menu')} style={{ marginBottom: '10px', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>&lt; Volver</button>
                    <h3>Logs de Acceso</h3>
                    <div style={{ maxHeight: '300px', overflowY: 'auto', fontSize: '0.8rem' }}>
                        {logs.map(l => (
                            <div key={l.id} style={{ padding: '5px', borderBottom: '1px solid #eee' }}>
                                <strong>{l.username || 'Unknown'}</strong> - {l.action} [{l.ip}] <br />
                                <span style={{ color: '#777' }}>{new Date(l.timestamp).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        if (view === 'stores') {
            return (
                <div>
                    <button onClick={() => setView('menu')} style={{ marginBottom: '10px', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>&lt; Volver</button>
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <StoreManager />
                    </div>
                </div>
            );
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div className="glass-card" style={{ width: view === 'stores' ? '800px' : '500px', background: 'white', maxHeight: '80vh', overflow: 'hidden', transition: 'width 0.3s' }}>
                <div className="flex-between" style={{ marginBottom: '20px' }}>
                    <h3 style={{ margin: 0 }}>Configuración</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
                </div>
                {renderContent()}
            </div>
        </div>
    );
};

const Dashboard = () => {
    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
    const [currentDate, setCurrentDate] = useState(new Date().toLocaleDateString());
    const [ip, setIp] = useState('Loading...');
    const [showSettings, setShowSettings] = useState(false);
    const { user } = useAuth();
    const { stores, currentStore, setStore } = useStore();

    // Monthly filter state
    const [months, setMonths] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState('');

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date().toLocaleTimeString());
            setCurrentDate(new Date().toLocaleDateString());
        }, 1000);

        // Fetch IP (mock or real)
        // In real app, server sends it or we use 3rd party. 
        // We'll use a placeholder or ask server 'whoami'
        setIp('192.168.1.X'); // TODO: Fetch from server session
        
        // Fetch available months
        axios.get('/sales/months').then(res => {
            const data = res.data;
            setMonths(data);
            const current = new Date().toISOString().substring(0, 7);
            if (data.includes(current)) {
                setSelectedMonth(current);
            } else if (data.length > 0) {
                setSelectedMonth(data[0]); // latest month
            } else {
                setMonths([current]);
                setSelectedMonth(current);
            }
        }).catch(err => console.error(err));

        return () => clearInterval(timer);
    }, []);

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)' }}>
            {/* Header / Nav could go here */}

            {/* Main Content */}
            <div style={{ flex: 1, overflow: 'auto' }}>
                <Routes>
                    <Route path="/" element={<Menu />} />
                    <Route path="pos" element={<POS selectedMonth={selectedMonth} />} />
                    <Route path="sales" element={<SalesReports selectedMonth={selectedMonth} />} />
                    <Route path="inventory" element={<Inventory />} />
                    <Route path="quotes" element={<Quotes />} />
                </Routes>
            </div>

            {/* Footer */}
            <div className="glass-card" style={{ borderRadius: 0, padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
                <div style={{ display: 'flex', gap: '20px', fontSize: '0.9rem', color: '#555', alignItems: 'center' }}>
                    <span>📅 {currentDate}</span>
                    <span>🕒 {currentTime}</span>
                    <span>🌐 IP: {ip}</span>
                    <span>v1.0</span>
                    {/* Store Selector for Admin */}
                    {user?.role === 'admin' && (
                        <div style={{ marginLeft: '20px', display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,0.05)', padding: '5px 10px', borderRadius: '20px' }}>
                            <Building size={14} />
                            <select
                                value={currentStore?.id || ''}
                                onChange={(e) => setStore(e.target.value)}
                                style={{ background: 'none', border: 'none', fontWeight: 'bold', outline: 'none', cursor: 'pointer' }}
                            >
                                {stores.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    {user?.role !== 'admin' && (
                        <span style={{ marginLeft: '20px', fontWeight: 'bold' }}>🏪 {currentStore?.name}</span>
                    )}
                    
                    {/* Month Selector */}
                    <div style={{ marginLeft: '10px', display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,0.05)', padding: '5px 10px', borderRadius: '20px' }}>
                        <span onClick={() => navigate('/dashboard/sales')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }} title="Ir a Pestaña de Reportes">📅 Mes:</span>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            style={{ background: 'none', border: 'none', fontWeight: 'bold', outline: 'none', cursor: 'pointer' }}
                        >
                            {months.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>
                        <div><strong>{user?.username}</strong></div>
                        <div style={{ color: '#777' }}>{user?.role === 'admin' ? 'Administrador' : 'Vendedor'}</div>
                    </div>
                    <button
                        onClick={() => setShowSettings(true)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px', borderRadius: '50%', transition: 'background 0.2s' }}
                        className="hover-bg"
                    >
                        <Settings size={24} color="#333" />
                    </button>
                </div>
            </div>

            {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
        </div>
    );
};

export default Dashboard;

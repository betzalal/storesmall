import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Link, useLocation } from 'react-router-dom';
import { Settings, LogOut, Users, Activity, Building, ArrowLeft, Palette, Save } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
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

    const [company, setCompany] = useState({ 
        name: localStorage.getItem('companyName') || 'SAWALIFE', 
        tagline: localStorage.getItem('companyTagline') || 'Filtros purificadores de agua', 
        logoUrl: localStorage.getItem('companyLogoUrl') || '/assets/logo.jpg' 
    });

    useEffect(() => {
        axios.get('/system/company').then(res => {
            if (res.data && res.data.name && res.data.name !== 'SAWALIFE') {
                setCompany(res.data);
            }
        }).catch(e => console.warn("Usando configuración local por defecto", e));
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '40px 0' }}>
            <div style={{ marginBottom: '30px', textAlign: 'center' }}>
                <img src={company.logoUrl} alt="Logo" style={{ height: '90px', objectFit: 'contain' }} />
                <h1 style={{ margin: '10px 0 0', color: 'var(--secondary-color)', fontSize: '1.8rem' }}>{company.name}</h1>
                <p style={{ margin: 0, color: '#555', fontSize: '1.1rem' }}>{company.tagline}</p>
            </div>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', padding: '20px', boxSizing: 'border-box', width: '100%' }}>
                {menuItems.map((item, idx) => (
                    <Link to={item.path} key={idx} style={{ textDecoration: 'none', color: 'inherit', maxWidth: '100%' }}>
                        <div className="glass-card" style={{
                            width: '300px', maxWidth: '100%', minHeight: '300px', height: 'auto', flex: 1,
                            display: 'flex', flexDirection: 'column',
                            transition: 'transform 0.3s', cursor: 'pointer',
                            overflow: 'hidden', padding: 0
                        }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <div style={{ flex: 1, minHeight: '200px', background: `url(${item.img}) center/cover` }}></div>
                            <div style={{ padding: '20px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>
                                {item.title}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

const THEMES = [
    { name: 'Original', bg: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)', primary: '#00d2ff', secondary: '#3a7bd5' },
    { name: 'Oceano', bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', primary: '#0052D4', secondary: '#4364F7' },
    { name: 'Gris Limpio', bg: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)', primary: '#606c88', secondary: '#3f4c6b' },
    { name: 'Amanecer', bg: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)', primary: '#f5576c', secondary: '#f093fb' },
    { name: 'Azul Suave', bg: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)', primary: '#667eea', secondary: '#764ba2' },
    { name: 'Verde Esmeralda', bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', primary: '#11998e', secondary: '#38ef7d' },
    { name: 'Ocaso', bg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', primary: '#f83600', secondary: '#f9d423' },
    { name: 'Medianoche', bg: 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)', primary: '#30cfd0', secondary: '#330867' },
    { name: 'Menta', bg: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)', primary: '#2ebf91', secondary: '#8360c3' },
    { name: 'Uva', bg: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', primary: '#89216b', secondary: '#da4453' }
];

// Placeholders for modules


const SettingsModal = ({ onClose, currentTheme, setCurrentTheme, ip }) => {
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
                    <div className="show-on-mobile-block" style={{ display: 'none', background: '#f5f5f5', padding: '10px', borderRadius: '5px', marginBottom: '5px', textAlign: 'center', fontSize: '0.8rem', color: '#555' }}>
                        <div style={{ marginBottom: '5px' }}>📅 {new Date().toLocaleDateString()} | 🕒 {new Date().toLocaleTimeString()}</div>
                        <div>🌐 IP: {ip} | v1.0</div>
                    </div>
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
                    <button onClick={() => setView('finalizar')} className="btn-primary" style={{ background: '#28a745', color: 'white', fontWeight: 'bold' }}>
                        <Save size={18} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
                        Finalizar Jornada (Exportar)
                    </button>
                    <button onClick={() => setView('theme')} className="btn-primary" style={{ background: '#ddd', color: '#333' }}>
                        <Palette size={18} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
                        Personalizar Fondo
                    </button>
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
        if (view === 'finalizar') {
            const sid = localStorage.getItem('sawa_session_id');
            return (
                <div style={{ textAlign: 'center' }}>
                    <button onClick={() => setView('menu')} style={{ marginBottom: '10px', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>&lt; Volver</button>
                    <h3 style={{ color: '#28a745' }}>Jornada Finalizada</h3>
                    <p style={{ color: '#555', marginBottom: '20px' }}>Escanea este código con tu celular para recuperar los datos a través de esta sesión <b>{sid?.substring(0,8)}</b>.</p>
                    <div style={{ background: 'white', padding: '15px', display: 'inline-block', borderRadius: '10px', border: '1px solid #ccc' }}>
                        <QRCodeSVG value={JSON.stringify({ ip, port: window.location.port || "3000", status: "download_ready", session_id: sid })} size={200} />
                    </div>
                    <p style={{ marginTop: '20px' }}>
                        <a href={`/api/system/sync-download?session_id=${sid}`} download="empresa.db" onClick={() => {
                            setTimeout(() => {
                                localStorage.removeItem('sawa_session_id');
                                window.location.href = '/';
                            }, 5000);
                        }} style={{ color: '#007bff', textDecoration: 'none', fontWeight: 'bold' }}>
                            O descargar archivo y CERRAR SESIÓN web
                        </a>
                    </p>
                </div>
            );
        }
        if (view === 'theme') {
            return (
                <div>
                    <button onClick={() => setView('menu')} style={{ marginBottom: '10px', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>&lt; Volver</button>
                    <h3>Selecciona un Fondo</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '15px', marginTop: '15px' }}>
                        {THEMES.map((t, idx) => (
                            <div
                                key={idx}
                                onClick={() => {
                                    setCurrentTheme(t.bg);
                                    localStorage.setItem('sawa_app_theme', t.bg);
                                }}
                                style={{
                                    height: '60px',
                                    borderRadius: '10px',
                                    background: t.bg,
                                    cursor: 'pointer',
                                    border: currentTheme === t.bg ? '3px solid #333' : '1px solid #ccc',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                                }}
                                title={t.name}
                            />
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '10px' }}>
            <div className="glass-card" style={{ width: view === 'stores' ? '800px' : '500px', maxWidth: '100%', background: 'white', maxHeight: '90vh', overflowY: 'auto', transition: 'width 0.3s' }}>
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
    const location = useLocation();
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
    const [currentTheme, setCurrentTheme] = useState(() => {
        return localStorage.getItem('sawa_app_theme') || 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)';
    });
    const [currentDate, setCurrentDate] = useState(new Date().toLocaleDateString());
    const [ip, setIp] = useState('Loading...');
    const [showSettings, setShowSettings] = useState(false);
    const { user } = useAuth();
    const { stores, currentStore, setStore } = useStore();

    // Monthly filter state
    const [months, setMonths] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState('');

    // Theme effect
    useEffect(() => {
        const t = THEMES.find(th => th.bg === currentTheme) || THEMES[0];
        document.documentElement.style.setProperty('--primary-color', t.primary);
        document.documentElement.style.setProperty('--secondary-color', t.secondary);
    }, [currentTheme]);

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
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: currentTheme, transition: 'background 0.5s ease' }}>
            {/* Header / Nav could go here */}

            {/* Main Content */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {location.pathname !== '/dashboard' && location.pathname !== '/dashboard/' && (
                    <div className="no-print" style={{ padding: '10px 20px', background: '#f8f9fa', borderBottom: '1px solid #ddd' }}>
                        <button
                            onClick={() => navigate('/dashboard')}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '5px',
                                background: 'var(--secondary-color)', color: 'white', border: 'none',
                                padding: '8px 15px', borderRadius: '5px', cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            <ArrowLeft size={16} /> Volver al Menú
                        </button>
                    </div>
                )}
                <div style={{ flex: 1, overflow: 'auto' }}>
                    <Routes>
                        <Route path="/" element={<Menu />} />
                        <Route path="pos" element={<POS selectedMonth={selectedMonth} />} />
                        <Route path="sales" element={<SalesReports selectedMonth={selectedMonth} />} />
                        <Route path="inventory" element={<Inventory />} />
                        <Route path="quotes" element={<Quotes />} />
                    </Routes>
                </div>
            </div>

            {/* Footer */}
            <div className="glass-card mobile-col mobile-p-10" style={{ borderRadius: 0, padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0, gap: '10px' }}>
                <div className="mobile-wrap" style={{ display: 'flex', gap: '15px', fontSize: '0.9rem', color: '#555', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="hide-on-mobile">📅 {currentDate}</span>
                    <span className="hide-on-mobile">🕒 {currentTime}</span>
                    <span className="hide-on-mobile">🌐 IP: {ip}</span>
                    <span className="hide-on-mobile">v1.0</span>
                    
                    {/* Mobile Centered Selectors */}
                    <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {/* Store Selector for Admin */}
                        {user?.role === 'admin' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,0.05)', padding: '5px 10px', borderRadius: '20px' }}>
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
                            <span style={{ fontWeight: 'bold' }}>🏪 {currentStore?.name}</span>
                        )}

                        {/* Month Selector */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,0.05)', padding: '5px 10px', borderRadius: '20px' }}>
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
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', justifyContent: 'center' }}>
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

            {showSettings && <SettingsModal
                onClose={() => setShowSettings(false)}
                currentTheme={currentTheme}
                setCurrentTheme={setCurrentTheme}
                ip={ip}
            />}
        </div>
    );
};

export default Dashboard;

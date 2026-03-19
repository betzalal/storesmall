import { useState, useEffect } from 'react';
import axios from 'axios';
import { Building, MapPin, Plus, Check, Trash } from 'lucide-react';
import { useStore } from '../context/StoreContext';

const StoreManager = () => {
    const [stores, setStores] = useState([]);
    const [view, setView] = useState('list'); // list | create
    const [form, setForm] = useState({
        name: '', location: '', type: '', address: '', phone: '',
        rent_status: 'rent', size_m2: '', pros_cons: '', map_url: '', other_details: ''
    });

    useEffect(() => {
        fetchStores();
    }, []);

    const fetchStores = async () => {
        const res = await axios.get('/stores');
        setStores(res.data);
    };

    const { refreshStores } = useStore();

    const handleCreate = async () => {
        try {
            await axios.post('/stores', form);
            alert('Tienda Creada!');
            setForm({ name: '', location: '', type: '', address: '', phone: '', rent_status: 'rent', size_m2: '', pros_cons: '', map_url: '', other_details: '' });
            fetchStores();
            refreshStores(); // Update global context
            setView('list');
        } catch (e) {
            alert('Error creating store');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar esta tienda? Esta acción no se puede deshacer.')) return;
        try {
            await axios.delete(`/stores/${id}`);
            fetchStores();
            refreshStores();
            alert('Tienda eliminada');
        } catch (e) {
            alert('Error eliminando tienda');
        }
    };

    if (view === 'create') {
        return (
            <div className="glass-card" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', overflowY: 'auto', maxHeight: '80vh' }}>
                <div className="flex-between" style={{ marginBottom: '20px' }}>
                    <h2 style={{ margin: 0 }}>Nueva Tienda</h2>
                    <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>Cancelar</button>
                </div>

                <div className="grid-cols-2">
                    <input placeholder="Nombre (Ej. Tienda Norte)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ marginBottom: '10px' }} />
                    <input placeholder="Ubicación General (Ej. Zona Norte)" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} style={{ marginBottom: '10px' }} />

                    <input placeholder="Dirección Exacta" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} style={{ marginBottom: '10px' }} />
                    <input placeholder="Teléfonos" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={{ marginBottom: '10px' }} />

                    <select value={form.rent_status} onChange={e => setForm({ ...form, rent_status: e.target.value })} style={{ marginBottom: '10px' }}>
                        <option value="rent">Alquiler</option>
                        <option value="own">Propio</option>
                    </select>
                    <input placeholder="Tamaño (m2)" value={form.size_m2} onChange={e => setForm({ ...form, size_m2: e.target.value })} style={{ marginBottom: '10px' }} />
                </div>

                <input placeholder="Tipo (Sucursal/Almacén)" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={{ marginBottom: '10px' }} />
                <textarea placeholder="Ventajas y Desventajas" value={form.pros_cons} onChange={e => setForm({ ...form, pros_cons: e.target.value })} style={{ width: '100%', marginBottom: '10px', height: '80px' }} />
                <textarea placeholder="Otros Detalles" value={form.other_details} onChange={e => setForm({ ...form, other_details: e.target.value })} style={{ width: '100%', marginBottom: '10px', height: '60px' }} />

                <input placeholder="Google Maps Embed URL (src='...')" value={form.map_url} onChange={e => setForm({ ...form, map_url: e.target.value })} style={{ marginBottom: '10px' }} />
                {form.map_url && (
                    <div style={{ height: '200px', background: '#eee', marginBottom: '20px', borderRadius: '10px', overflow: 'hidden' }}>
                        <iframe src={form.map_url} width="100%" height="100%" frameBorder="0" style={{ border: 0 }} allowFullScreen></iframe>
                    </div>
                )}

                <button className="btn-primary" onClick={handleCreate} style={{ width: '100%' }}>Crear Tienda</button>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px' }}>
            <div className="flex-between" style={{ marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>Gestión de Tiendas</h2>
                <button className="btn-primary" onClick={() => setView('create')}>
                    <Plus style={{ marginRight: '5px', verticalAlign: 'middle' }} /> Nueva Tienda
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {stores.map(s => (
                    <div key={s.id} className="glass-card" style={{ padding: '20px' }}>
                        <div className="flex-between">
                            <h3 style={{ margin: 0 }}>{s.name}</h3>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <Building size={20} color="var(--primary-color)" />
                                <button
                                    onClick={() => handleDelete(s.id)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '5px',
                                        color: '#ff4444'
                                    }}
                                    title="Eliminar Tienda"
                                >
                                    <Trash size={18} />
                                </button>
                            </div>
                        </div>
                        <p style={{ color: '#777', fontSize: '0.9rem' }}><MapPin size={14} style={{ marginRight: '4px' }} />{s.location}</p>
                        <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '10px 0' }} />
                        <div style={{ fontSize: '0.8rem', color: '#555' }}>
                            <p><strong>Dir:</strong> {s.address || 'N/A'}</p>
                            <p><strong>Tel:</strong> {s.phone || 'N/A'}</p>
                            <p><strong>Estado:</strong> {s.rent_status === 'own' ? 'Propio' : 'Alquiler'} - {s.size_m2} m2</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StoreManager;

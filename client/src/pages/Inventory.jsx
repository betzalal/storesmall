import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Save, Edit2, RotateCcw, Plus, Trash2, Camera, ChevronUp, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';

const Inventory = () => {
    const [products, setProducts] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [expandedVariants, setExpandedVariants] = useState({});

    // New Product State
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newProduct, setNewProduct] = useState({ name: '', price: 0, category: 'Filtros', parent_id: '' });
    
    // Inline Variant State
    const [addingVariantToId, setAddingVariantToId] = useState(null);
    const [inlineVariantForm, setInlineVariantForm] = useState({ name: '', price: 0, quantity: 0, expiration_date: '' });

    const { user } = useAuth();
    const { currentStore } = useStore();

    useEffect(() => {
        if (currentStore) fetchInventory();
    }, [currentStore]);

    const fetchInventory = async () => {
        try {
            const res = await axios.get(`/products?store_id=${currentStore?.id || 1}`);
            setProducts(res.data);
        } catch (err) {
            console.error("Error fetching inventory", err);
        }
    };

    const handleEdit = (product) => {
        setEditingId(product.id);
        setEditForm({ ...product });
    };

    const handleSave = async () => {
        try {
            // Update stock
            await axios.post('/inventory/update', {
                store_id: currentStore?.id,
                product_id: editingId,
                quantity: parseInt(editForm.quantity),
                expiration_date: editForm.expiration_date
            });

            // Re-fetch to confirm
            await fetchInventory();
            setEditingId(null);
            alert('Inventario actualizado');
        } catch (err) {
            console.error(err);
            alert('Error al guardar');
        }
    };

    const handleAddProduct = async () => {
        if (!newProduct.name || newProduct.price === '') return;
        try {
            await axios.post('/products', {
                ...newProduct,
                parent_id: newProduct.parent_id || null
            });
            alert('Producto Creado!');
            setIsAddOpen(false);
            setNewProduct({ name: '', price: 0, category: 'Filtros', parent_id: '' });
            fetchInventory();
        } catch (e) {
            alert('Error al crear producto');
        }
    };

    const handleInlineAddVariant = async (parentProduct) => {
        if (!inlineVariantForm.name || inlineVariantForm.price === '') return;
        try {
            const res = await axios.post('/products', {
                name: `${parentProduct.name} - ${inlineVariantForm.name}`,
                price: parseFloat(inlineVariantForm.price) || 0,
                category: parentProduct.category,
                parent_id: parentProduct.id
            });
            
            // Set initial stock and expiration date immediately
            if (inlineVariantForm.quantity > 0 || inlineVariantForm.expiration_date) {
                await axios.post('/inventory/update', {
                    store_id: currentStore?.id || 1,
                    product_id: res.data.id,
                    quantity: parseInt(inlineVariantForm.quantity) || 0,
                    expiration_date: inlineVariantForm.expiration_date || null
                });
            }

            alert('Variante Añadida!');
            setAddingVariantToId(null);
            setInlineVariantForm({ name: '', price: 0, quantity: 0, expiration_date: '' });
            fetchInventory();
        } catch (e) {
            alert('Error al crear variante');
        }
    };

    const handleDelete = async (id, name) => {
        if (window.confirm(`¿Seguro que deseas eliminar "${name}" del inventario?`)) {
            try {
                await axios.delete(`/products/${id}`);
                fetchInventory();
            } catch (e) {
                alert('Error al eliminar');
            }
        }
    };

    const handleImageUpload = async (product, e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64Data = reader.result;
            try {
                await axios.post(`/products/${product.id}/image`, { image_data: base64Data });
                fetchInventory();
                alert('Imagen subida con éxito');
            } catch (err) {
                alert('Error al subir imagen');
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <div style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>
            <div className="flex-between mobile-col" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Package size={24} color="var(--primary-color)" />
                    <h2 style={{ margin: 0 }}>Gestión de Inventario</h2>
                </div>
                {user?.role === 'admin' && (
                    <button onClick={() => setIsAddOpen(!isAddOpen)} className="btn-primary">
                        <Plus size={18} style={{ marginRight: '5px', verticalAlign: 'text-bottom' }} /> Nuevo Producto
                    </button>
                )}
            </div>

            {isAddOpen && (
                <div className="glass-card" style={{ marginBottom: '20px', padding: '20px', background: '#f9f9f9', border: '1px solid #ddd' }}>
                    <h3 style={{ marginTop: 0 }}>Nuevo Item (Código Automático)</h3>
                    <div className="mobile-col" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'end' }}>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: '#777' }}>Nombre Producto</label>
                            <input style={{ width: '100%' }} value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: '#777' }}>Precio (Bs)</label>
                            <input type="number" style={{ width: '100%' }} value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) })} />
                        </div>
                        <div style={{ flex: 1, minWidth: '150px' }}>
                            <label style={{ fontSize: '0.8rem', color: '#777' }}>Categoría</label>
                            <input style={{ width: '100%' }} value={newProduct.category} onChange={e => setNewProduct({ ...newProduct, category: e.target.value })} />
                        </div>
                        <div style={{ flex: 1, minWidth: '150px' }}>
                            <label style={{ fontSize: '0.8rem', color: '#777' }}>Variante de (Opcional)</label>
                            <select style={{ width: '100%', padding: '5px' }} value={newProduct.parent_id} onChange={e => setNewProduct({ ...newProduct, parent_id: e.target.value })}>
                                <option value="">Ninguno (Principal)</option>
                                {products.filter(p => !p.parent_id).map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <button className="btn-primary" onClick={handleAddProduct}>Guardar</button>
                    </div>
                </div>
            )}

            <div className="glass-card table-responsive" style={{ padding: 0 }}>
                <table className="mobile-cards-table" style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'rgba(0,0,0,0.05)', color: '#555' }}>
                        <tr>
                            <th style={{ padding: '15px' }}>Código</th>
                            <th style={{ padding: '15px' }}>Producto / Variante</th>
                            <th style={{ padding: '15px' }}>Precio (Bs)</th>
                            <th style={{ padding: '15px' }}>Stock y Caducidad</th>
                            <th style={{ padding: '15px' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.filter(p => !p.parent_id).map(main => (
                            <React.Fragment key={main.id}>
                                <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                    <td data-label="Código" style={{ padding: '15px' }}>{main.code}</td>
                                    <td data-label="Producto" style={{ padding: '15px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                            <span style={{ fontWeight: 'bold' }}>{main.name}</span>
                                            {products.some(v => v.parent_id === main.id) && (
                                                <button 
                                                    onClick={() => setExpandedVariants(p => ({ ...p, [main.id]: !p[main.id] }))} 
                                                    style={{ background: '#f0f0f0', border: '1px solid #ccc', borderRadius: '12px', padding: '2px 8px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 'bold' }}
                                                >
                                                    {expandedVariants[main.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                    {products.filter(v => v.parent_id === main.id).length} Opciones
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td data-label="Precio (Bs)" style={{ padding: '15px' }}>{main.price}</td>
                                    <td data-label="Stock" style={{ padding: '15px' }}>
                                        {editingId === main.id ? (
                                            <div style={{ display: 'flex', gap: '5px', flexDirection: 'column' }}>
                                                <input type="number" value={editForm.quantity} onChange={e => setEditForm({ ...editForm, quantity: e.target.value })} style={{ width: '80px', padding: '5px' }} placeholder="Cant." />
                                                <input type="date" value={editForm.expiration_date || ''} onChange={e => setEditForm({ ...editForm, expiration_date: e.target.value })} style={{ width: '120px', padding: '5px' }} />
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                <span style={{ color: main.quantity < 10 ? 'red' : 'green', fontWeight: 'bold', background: main.quantity < 10 ? '#ffe6e6' : '#e6ffe6', padding: '4px 8px', borderRadius: '4px', display: 'inline-block', width: 'fit-content' }}>
                                                    {main.quantity}
                                                </span>
                                                {main.expiration_date && <span style={{ fontSize: '0.8rem', color: '#777' }}>Vence: {main.expiration_date}</span>}
                                            </div>
                                        )}
                                    </td>
                                    <td data-label="Acciones" style={{ padding: '15px' }}>
                                        {editingId === main.id ? (
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button onClick={handleSave} className="btn-primary" style={{ padding: '5px 10px', fontSize: '0.9rem' }}><Save size={16} /></button>
                                                <button onClick={() => setEditingId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#777' }}><RotateCcw size={16} /></button>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                <button onClick={() => handleEdit(main)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--secondary-color)', display: 'flex', alignItems: 'center', gap: '3px' }} title="Editar">
                                                    <Edit2 size={20} /> <span style={{fontSize: '0.8rem'}}>Editar</span>
                                                </button>
                                                <button onClick={() => { setAddingVariantToId(main.id); setExpandedVariants(p => ({ ...p, [main.id]: true })); setInlineVariantForm({ name: '', price: main.price, quantity: 0, expiration_date: '' }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#28a745', display: 'flex', alignItems: 'center', gap: '3px' }} title="Agregar Variante">
                                                    <Plus size={20} /> <span style={{fontSize: '0.8rem'}}>+Variante</span>
                                                </button>
                                                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#007bff', gap: '3px' }} title="Subir Imagen">
                                                    <Camera size={20} /> <span style={{fontSize: '0.8rem'}}>Foto</span>
                                                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(main, e)} />
                                                </label>
                                                <button onClick={() => handleDelete(main.id, main.name)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', display: 'flex', alignItems: 'center', gap: '3px' }} title="Eliminar">
                                                    <Trash2 size={20} /> <span style={{fontSize: '0.8rem'}}>Borrar</span>
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                                {addingVariantToId === main.id && (
                                    <tr className="variant-row" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', background: '#eefaee' }}>
                                        <td data-label="Código" style={{ padding: '15px', paddingLeft: '40px' }}>↳ Nueva</td>
                                        <td data-label="Variante" style={{ padding: '15px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <span style={{color: '#777', fontSize: '0.9rem', marginRight: '5px', whiteSpace: 'nowrap'}}>{main.name} -</span>
                                                <input value={inlineVariantForm.name} onChange={e => setInlineVariantForm({ ...inlineVariantForm, name: e.target.value })} placeholder="Ej. 1 Litro" style={{ width: '120px', padding: '5px' }} autoFocus />
                                            </div>
                                        </td>
                                        <td data-label="Precio (Bs)" style={{ padding: '15px' }}>
                                            <input type="number" value={inlineVariantForm.price} onChange={e => setInlineVariantForm({ ...inlineVariantForm, price: e.target.value })} style={{ width: '80px', padding: '5px' }} />
                                        </td>
                                        <td data-label="Stock" style={{ padding: '15px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                <input type="number" value={inlineVariantForm.quantity} onChange={e => setInlineVariantForm({ ...inlineVariantForm, quantity: e.target.value })} placeholder="Cant." style={{ width: '80px', padding: '5px' }} />
                                                <input type="date" value={inlineVariantForm.expiration_date} onChange={e => setInlineVariantForm({ ...inlineVariantForm, expiration_date: e.target.value })} style={{ width: '120px', padding: '5px' }} />
                                            </div>
                                        </td>
                                        <td data-label="Acciones" style={{ padding: '15px' }}>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button onClick={() => handleInlineAddVariant(main)} className="btn-primary" style={{ padding: '5px 10px', fontSize: '0.9rem' }}><Save size={16} /></button>
                                                <button onClick={() => setAddingVariantToId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#777' }}><RotateCcw size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                {expandedVariants[main.id] && products.filter(v => v.parent_id === main.id).map(variant => (
                                    <tr key={variant.id} className="variant-row" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', background: '#fafafa' }}>
                                        <td data-label="Código" style={{ padding: '15px', paddingLeft: '40px' }}>↳ {variant.code}</td>
                                        <td data-label="Variante" style={{ padding: '15px' }}>{variant.name}</td>
                                        <td data-label="Precio (Bs)" style={{ padding: '15px' }}>{variant.price}</td>
                                        <td data-label="Stock" style={{ padding: '15px' }}>
                                            {editingId === variant.id ? (
                                                <div style={{ display: 'flex', gap: '5px', flexDirection: 'column' }}>
                                                    <input type="number" value={editForm.quantity} onChange={e => setEditForm({ ...editForm, quantity: e.target.value })} style={{ width: '80px', padding: '5px' }} placeholder="Cant." />
                                                    <input type="date" value={editForm.expiration_date || ''} onChange={e => setEditForm({ ...editForm, expiration_date: e.target.value })} style={{ width: '120px', padding: '5px' }} />
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                    <span style={{ color: variant.quantity < 10 ? 'red' : 'green', fontWeight: 'bold', background: variant.quantity < 10 ? '#ffe6e6' : '#e6ffe6', padding: '4px 8px', borderRadius: '4px', display: 'inline-block', width: 'fit-content' }}>
                                                        {variant.quantity}
                                                    </span>
                                                    {variant.expiration_date && <span style={{ fontSize: '0.8rem', color: '#777' }}>Vence: {variant.expiration_date}</span>}
                                                </div>
                                            )}
                                        </td>
                                        <td data-label="Acciones" style={{ padding: '15px' }}>
                                            {editingId === variant.id ? (
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <button onClick={handleSave} className="btn-primary" style={{ padding: '5px 10px', fontSize: '0.9rem' }}><Save size={16} /></button>
                                                    <button onClick={() => setEditingId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#777' }}><RotateCcw size={16} /></button>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <button onClick={() => handleEdit(variant)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--secondary-color)', display: 'flex', alignItems: 'center', gap: '3px' }} title="Editar">
                                                        <Edit2 size={20} /> <span style={{fontSize: '0.8rem'}}>Editar</span>
                                                    </button>
                                                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#007bff', gap: '3px' }} title="Subir Imagen">
                                                        <Camera size={20} /> <span style={{fontSize: '0.8rem'}}>Foto</span>
                                                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(variant, e)} />
                                                    </label>
                                                    <button onClick={() => handleDelete(variant.id, variant.name)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', display: 'flex', alignItems: 'center', gap: '3px' }} title="Eliminar">
                                                        <Trash2 size={20} /> <span style={{fontSize: '0.8rem'}}>Borrar</span>
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Inventory;

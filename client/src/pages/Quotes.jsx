import { useState, useEffect } from 'react';
import { Plus, Printer, Trash2, Save, FileText } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import axios from 'axios';

// 1. Hardcoded Items
const QUOTE_ITEMS = [
    {
        label: "IT11 Filtros Stefany",
        dbName: "Filtros Stefany",
        description: `velas de triple acción:
 a. Cerámica microporosa: el cual debe filtrar el  agua gota a gota, sin añadir productos químicos y debe retener las partículas
 sólidas (0,5 y 1,0 micrón).
 b. Plata coloidal: que eliminen bacterias, virus, parásitos, hongos y microorganismos.
 c. Carbón activo, en su cavidad interior debe contener carbón activado de origen vegetal, que actúe atrapando impurezas en el
 agua como solventes, pesticidas y residuos industriales`
    },
    {
        label: "IT12 Filtros Agua Segura",
        dbName: "Filtro \"agua segura\"",
        description: `Filtro Agua Segura:
* 2 baldes de plástico para almacenamiento de agua
para consumo humano de 20 litros (plástico virgen (Polipropileno) libre de BPA) con agarradores.
* 2 velas de triple acción:
 a. Cerámica microporosa: el cual debe filtrar el  agua gota a gota, sin añadir productos químicos y debe retener las partículas  sólidas (0,5 y 1,0 micrón).
 b. Plata coloidal: que eliminen bacterias, virus,  parásitos, hongos y microorganismos.
 c. Carbón activo, en su cavidad interior debe  contener carbón activado de origen vegetal, que actúe atrapando impurezas en el  agua como solventes, pesticidas y residuos industriales.
* 1 grifo (plástico reforzado).`
    }
];

const DEFAULT_TERMS = ``;

const Quotes = () => {
    // State
    const { currentStore } = useStore();
    const [quoteNumber, setQuoteNumber] = useState('...');
    const [savedId, setSavedId] = useState(null);

    const [customer, setCustomer] = useState({
        name: '',
        nit: '',
        rs: '',
        contact: '',
        validUntil: ''
    });

    // Company profile info
    const [companyInfo, setCompanyInfo] = useState({
        logoUrl: localStorage.getItem('companyLogoUrl') || '/assets/logo.jpg',
        name: localStorage.getItem('companyName') || 'Cargando...',
        tagline: localStorage.getItem('companyTagline') || '',
        defaultTerms: DEFAULT_TERMS
    });

    useEffect(() => {
        axios.get('/system/company').then(res => {
            if (res.data && res.data.name) {
                localStorage.setItem('companyName', res.data.name);
                localStorage.setItem('companyLogoUrl', res.data.logoUrl);
                localStorage.setItem('companyTagline', res.data.tagline);
                setCompanyInfo(prev => ({ ...prev, name: res.data.name, tagline: res.data.tagline, logoUrl: res.data.logoUrl }));
            }
        }).catch(e => console.warn("No conectado a tabla settings. Usando SAWALIFE."));
    }, []);

    const [items, setItems] = useState([]);
    const [terms, setTerms] = useState(companyInfo.defaultTerms || '');

    // Templates & Current Item Entry
    const [templates, setTemplates] = useState(QUOTE_ITEMS);
    const [selectedItemIdx, setSelectedItemIdx] = useState('');
    const [customLabel, setCustomLabel] = useState('');
    const [customDesc, setCustomDesc] = useState('');
    const [qty, setQty] = useState(1);
    const [price, setPrice] = useState(0);

    // New state for finishing quote
    const [isQuoteFinished, setIsQuoteFinished] = useState(false);

    // Init Logic
    useEffect(() => {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setCustomer(prev => ({ ...prev, validUntil: `${yyyy}-${mm}-${dd}` }));

        fetchNextNumber();
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const res = await axios.get('/quotations/templates');
            if (res.data && res.data.length > 0) {
                const dbTemplates = res.data.map(t => ({
                    id: t.id,
                    label: t.label,
                    description: t.description,
                    isCustom: true
                }));
                setTemplates([...QUOTE_ITEMS, ...dbTemplates]);
            }
        } catch (e) {
            console.error('Error fetching templates:', e);
        }
    };

    const fetchNextNumber = async (force = false) => {
        if (savedId && !force) return;
        try {
            const res = await axios.get('/quotations/next-number');
            setQuoteNumber(res.data.nextId);
        } catch (e) {
            console.error(e);
        }
    };

    // Actions
    const handleNewQuote = () => {
        setSavedId(null);
        setIsQuoteFinished(false);
        setItems([]);
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setCustomer({
            name: '',
            nit: '',
            rs: '',
            contact: '',
            validUntil: `${yyyy}-${mm}-${dd}`
        });
        fetchNextNumber(true);
    };

    const handleAddItem = () => {
        if (selectedItemIdx === '') return;

        let finalLabel = customLabel;
        let finalDesc = customDesc;

        if (selectedItemIdx !== 'new') {
            const template = templates[parseInt(selectedItemIdx)];
            if (!template) return;
            finalLabel = template.label;
            finalDesc = template.description;
        }

        if (!finalLabel || !finalDesc) {
            return alert("Agregue un nombre y descripción al ítem");
        }

        const newItem = {
            description: finalDesc,
            label: finalLabel,
            qty: qty,
            price: price,
            total: qty * price
        };
        setItems([...items, newItem]);
        setSelectedItemIdx('');
        setCustomLabel('');
        setCustomDesc('');
        setQty(1);
        setPrice(0);
    };

    const handleSaveTemplate = async () => {
        if (!customLabel || !customDesc) return alert("Llene nombre y descripción para guardar la plantilla");
        try {
            const res = await axios.post('/quotations/templates', { label: customLabel, description: customDesc });
            const savedId = res.data.id;
            const newTemplates = [...templates, { id: savedId, label: customLabel, description: customDesc, isCustom: true }];
            setTemplates(newTemplates);
            setSelectedItemIdx((newTemplates.length - 1).toString());
            alert("Plantilla guardada correctamente");
        } catch (e) {
            console.error(e);
            alert("Error al guardar plantilla");
        }
    };

    const handleDeleteTemplate = async () => {
        const t = templates[Number(selectedItemIdx)];
        if (!t || !t.id) return;
        if (!window.confirm("¿Seguro que deseas eliminar esta plantilla?")) return;

        try {
            await axios.delete(`/quotations/templates/${t.id}`);
            const newTemplates = templates.filter(temp => temp.id !== t.id);
            setTemplates(newTemplates);
            setSelectedItemIdx('');
            setCustomLabel('');
            setCustomDesc('');
            alert("Plantilla eliminada exitosamente");
        } catch (e) {
            console.error(e);
            alert("Error al eliminar plantilla");
        }
    };

    const handleRemoveItem = (idx) => {
        if (isQuoteFinished) return;
        setItems(items.filter((_, i) => i !== idx));
    };

    const total = items.reduce((acc, curr) => acc + curr.total, 0);

    // SAVE LOGIC
    const handleSave = async () => {
        if (!currentStore) return alert("Seleccione una tienda primero");

        try {
            const payload = {
                store_id: currentStore.id,
                customer,
                items,
                total
            };

            let returnedId = savedId;

            if (savedId) {
                // Update
                console.log("Updating existing quote:", savedId);
                await axios.put(`/quotations/${savedId}`, payload);
            } else {
                // Create
                console.log("Creating new quote");
                const res = await axios.post('/quotations', payload);
                returnedId = res.data.id;
                setSavedId(returnedId);
                setQuoteNumber(returnedId);
            }
            return returnedId;
        } catch (e) {
            console.error("Save Error:", e);
            alert(`Error al guardar: ${e.message}\n${e.response ? JSON.stringify(e.response.data) : ''}`);
            return null;
        }
    };

    const [isPrinting, setIsPrinting] = useState(false);

    const handlePrint = async () => {
        const id = await handleSave();
        if (id) {
            setIsPrinting(true);
            setTimeout(() => {
                window.print();
                setIsPrinting(false);
            }, 500);
        }
    };

    const handlePDF = async () => {
        const id = await handleSave();
        if (!id) return;

        setIsPrinting(true);

        setTimeout(() => {
            const element = document.getElementById('quote-paper');
            if (!element) {
                setIsPrinting(false);
                return alert("Error: No se encuentra el contenido para PDF");
            }

            const opt = {
                margin: 0.4,
                pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.avoid-break'] },
                filename: `Cotizacion_${id}_${customer.name || 'Cliente'}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
            };

            if (window.html2pdf) {
                window.html2pdf().set(opt).from(element).save().then(() => setIsPrinting(false));
            } else {
                alert("Librería PDF no cargada. Por favor recargue la página.");
                setIsPrinting(false);
            }
        }, 500);
    };

    return (
        <div style={{ height: '100%', overflowY: 'auto', padding: '20px', background: '#f0f2f5' }}>

            {/* Toolbar */}
            <div className="no-print mobile-col" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', gap: '10px' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                    <FileText /> COTIZACIONES
                </h2>
                <div className="mobile-wrap" style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={handlePDF} className="btn-primary" style={{ background: '#28a745' }}>
                        <Save size={18} style={{ marginRight: '5px' }} /> Guardar PDF
                    </button>
                    <button onClick={handlePrint} className="btn-primary">
                        <Printer size={18} style={{ marginRight: '5px' }} /> Imprimir
                    </button>
                    <button onClick={handleNewQuote} style={{ padding: '8px 15px', cursor: 'pointer', background: '#e0e0e0', color: 'black', border: '1px solid #ccc', borderRadius: '4px' }}>
                        Nueva
                    </button>
                </div>
            </div>

            {/* =========================================
                1. UI RESPONSIVA PARA LLENAR EN CELULAR 
                ========================================= */}
            {!isPrinting && (
                <div className="glass-card" style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    <div className="grid-cols-2">
                        <div>
                            <label style={{ fontSize: '0.8rem', color: '#777' }}>Cliente (Nombre)</label>
                            <input value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} placeholder="Ej: Juan Perez" />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: '#777' }}>NIT / CI</label>
                            <input value={customer.nit} onChange={e => setCustomer({ ...customer, nit: e.target.value })} placeholder="1234567" />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: '#777' }}>Razón Social</label>
                            <input value={customer.rs} onChange={e => setCustomer({ ...customer, rs: e.target.value })} placeholder="Razón social" />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: '#777' }}>Celular / Email</label>
                            <input value={customer.contact} onChange={e => setCustomer({ ...customer, contact: e.target.value })} placeholder="Contacto" />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: '#777' }}>Validez (Fecha Límite)</label>
                            <input type="date" value={customer.validUntil} onChange={e => setCustomer({ ...customer, validUntil: e.target.value })} />
                        </div>
                    </div>

                    <div>
                        <h3 style={{ borderBottom: '1px solid #ddd', paddingBottom: '10px', marginBottom: '15px' }}>Ítems a Cotizar</h3>
                        <table className="mobile-cards-table" style={{ width: '100%', marginBottom: '15px' }}>
                            <thead className="hide-on-mobile">
                                <tr style={{ background: '#f0f0f0', textAlign: 'left' }}>
                                    <th style={{ padding: '10px' }}>Descripción</th>
                                    <th style={{ padding: '10px' }}>Cant.</th>
                                    <th style={{ padding: '10px' }}>P. Unit</th>
                                    <th style={{ padding: '10px' }}>Subtotal</th>
                                    <th style={{ padding: '10px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                                        <td data-label="Descripción" style={{ padding: '10px', whiteSpace: 'pre-wrap' }}>{item.description}</td>
                                        <td data-label="Cant." style={{ padding: '10px' }}>{item.qty}</td>
                                        <td data-label="P. Unit" style={{ padding: '10px' }}>{item.price.toFixed(2)}</td>
                                        <td data-label="Subtotal" style={{ padding: '10px', fontWeight: 'bold' }}>{item.total.toFixed(2)}</td>
                                        <td data-label="Acciones" style={{ padding: '10px', textAlign: 'right' }}>
                                            {!isQuoteFinished && (
                                                <button onClick={() => handleRemoveItem(i)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}><Trash2 size={24} /></button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {items.length === 0 && (
                                    <tr>
                                        <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>Ningún ítem agregado todavía...</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {!isQuoteFinished && (
                            <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
                                <div className="mobile-col" style={{ display: 'flex', gap: '15px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.8rem', color: '#777', fontWeight: 'bold' }}>Añadir Nuevo Ítem</label>
                                        <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                                            <select
                                                style={{ width: '100%', padding: '10px' }}
                                                value={selectedItemIdx}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setSelectedItemIdx(val);
                                                    if (val !== '' && val !== 'new') {
                                                        const t = templates[Number(val)];
                                                        setCustomLabel(t.label);
                                                        setCustomDesc(t.description);
                                                    } else {
                                                        setCustomLabel('');
                                                        setCustomDesc('');
                                                    }
                                                }}
                                            >
                                                <option value="">-- Seleccionar Plantilla --</option>
                                                {templates.map((item, idx) => (
                                                    <option key={idx} value={idx}>{item.label}</option>
                                                ))}
                                                <option value="new">-- Crear Uno Nuevo En Blanco --</option>
                                            </select>
                                            {selectedItemIdx !== '' && selectedItemIdx !== 'new' && templates[Number(selectedItemIdx)]?.isCustom && (
                                                <button onClick={handleDeleteTemplate} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '0 10px', borderRadius: '5px', cursor: 'pointer' }} title="Borrar plantilla"><Trash2 size={16} /></button>
                                            )}
                                        </div>
                                        {selectedItemIdx === 'new' && (
                                            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                <input placeholder="Nombre corto del ítem..." value={customLabel} onChange={e => setCustomLabel(e.target.value)} />
                                                <textarea placeholder="Descripción detallada de la cotización..." style={{ resize: 'vertical', minHeight: '80px' }} value={customDesc} onChange={e => setCustomDesc(e.target.value)} />
                                                <button onClick={handleSaveTemplate} className="btn-primary" style={{ alignSelf: 'flex-start', padding: '8px 15px', fontSize: '13px' }}>Guardar Para Usar Después</button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mobile-w-full" style={{ width: '80px' }}>
                                        <label style={{ fontSize: '0.8rem', color: '#777', fontWeight: 'bold' }}>Cant.</label>
                                        <input type="number" value={qty} min="1" onChange={e => setQty(Number(e.target.value))} style={{ padding: '10px' }} />
                                    </div>
                                    <div className="mobile-w-full" style={{ width: '100px' }}>
                                        <label style={{ fontSize: '0.8rem', color: '#777', fontWeight: 'bold' }}>P.Unit</label>
                                        <input type="number" value={price} min="0" onChange={e => setPrice(Number(e.target.value))} style={{ padding: '10px' }} />
                                    </div>
                                    <div className="mobile-w-full" style={{ display: 'flex', alignItems: 'flex-end', paddingTop: '10px' }}>
                                        <button onClick={handleAddItem} className="btn-primary mobile-w-full" style={{ height: '44px', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Plus size={20} style={{ marginRight: '5px' }} /> <span className="show-on-mobile-block hide-on-mobile" style={{ display:'none' }}>Agregar Ítem</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{ background: 'var(--secondary-color)', color: 'white', padding: '15px 25px', borderRadius: '8px', fontSize: '20px', fontWeight: 'bold' }}>
                            TOTAL BS: {total.toFixed(2)}
                        </div>
                    </div>

                    <div>
                        <h4 style={{ margin: '0 0 10px 0' }}>Condiciones Generales</h4>
                        <textarea
                            value={terms}
                            onChange={e => setTerms(e.target.value)}
                            style={{ width: '100%', minHeight: '120px', resize: 'vertical', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}
                        />
                    </div>

                    {!isQuoteFinished && (
                        <div style={{ textAlign: 'center', marginTop: '10px' }}>
                            <button onClick={() => setIsQuoteFinished(true)} className="btn-primary mobile-w-full" style={{ background: '#28a745', fontSize: '18px', padding: '15px 30px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                <Save size={24} /> Finalizar Cotización
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* =========================================
                2. PLANTILLA PDF A4 ESTRICTA (Invisible en UI)
                ========================================= */}
            <div style={{ display: isPrinting ? 'block' : 'none' }}>
                <div id="quote-paper" style={{
                    background: 'white',
                    width: '7.5in',
                    margin: '0 auto',
                    padding: '0',
                    position: 'relative',
                    color: 'black',
                    fontFamily: 'Arial, sans-serif',
                    boxSizing: 'border-box'
                }}>

                    {/* HEADER SECTION */}
                    <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <img src={companyInfo.logoUrl} alt="Logo" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
                            <div>
                                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: 'var(--secondary-color)' }}>{companyInfo.name}</h1>
                                <p style={{ margin: 0, fontSize: '14px', color: '#555' }}>{companyInfo.tagline}</p>
                            </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#d32f2f', marginBottom: '5px' }}>
                                Cotizacion N° {quoteNumber}
                            </div>
                            <div style={{ fontSize: '14px', color: '#333' }}>
                                Fecha: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString().slice(0, 5)}
                            </div>
                        </div>
                    </div>

                    {/* CUSTOMER INFO */}
                    <div className="avoid-break" style={{
                        border: '1px solid #ccc',
                        padding: '15px',
                        borderRadius: '5px',
                        background: '#fcfcfc',
                        marginBottom: '30px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '15px'
                    }}>
                        <div style={{ display: 'flex', gap: '20px' }}>
                            <div style={{ flex: 2 }}>
                                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666' }}>CLIENTE:</label>
                                <div style={{ borderBottom: '1px solid #ccc', padding: '5px 0', fontWeight: 'bold' }}>{customer.name || '\u00A0'}</div>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666' }}>NIT / CI:</label>
                                <div style={{ borderBottom: '1px solid #ccc', padding: '5px 0' }}>{customer.nit || '\u00A0'}</div>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666' }}>RAZÓN SOCIAL:</label>
                                <div style={{ borderBottom: '1px solid #ccc', padding: '5px 0' }}>{customer.rs || '\u00A0'}</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '20px' }}>
                            <div style={{ flex: 2 }}>
                                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666' }}>CELULAR / EMAIL:</label>
                                <div style={{ borderBottom: '1px solid #ccc', padding: '5px 0' }}>{customer.contact || '\u00A0'}</div>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666' }}>FECHA LÍMITE:</label>
                                <div style={{ borderBottom: '1px solid #ccc', padding: '5px 0' }}>{customer.validUntil || '\u00A0'}</div>
                            </div>
                        </div>
                    </div>

                    {/* ITEMS TABLE */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
                        <thead>
                            <tr style={{ background: 'var(--secondary-color)', color: 'white' }}>
                                <th style={{ padding: '10px', textAlign: 'left' }}>Item / Descripción</th>
                                <th style={{ padding: '10px', width: '60px', textAlign: 'center' }}>Cant.</th>
                                <th style={{ padding: '10px', width: '90px', textAlign: 'center' }}>P. Unit</th>
                                <th style={{ padding: '10px', width: '90px', textAlign: 'center' }}>Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '10px', whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: '1.4' }}>
                                        {item.description}
                                    </td>
                                    <td style={{ padding: '10px', textAlign: 'center', verticalAlign: 'top' }}>{item.qty}</td>
                                    <td style={{ padding: '10px', textAlign: 'center', verticalAlign: 'top' }}>{item.price.toFixed(2)}</td>
                                    <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'top' }}>{item.total.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* TOTAL */}
                    <div className="avoid-break" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '30px' }}>
                        <div style={{ background: 'var(--secondary-color)', color: 'white', padding: '10px 20px', borderRadius: '5px', fontSize: '18px', fontWeight: 'bold' }}>
                            TOTAL BS: {total.toFixed(2)}
                        </div>
                    </div>

                    {/* TERMS */}
                    <div className="avoid-break" style={{ marginBottom: '20px' }}>
                        <h4 style={{ borderBottom: '1px solid #ccc', paddingBottom: '5px', marginBottom: '10px' }}>Condiciones Generales</h4>
                        <div style={{ whiteSpace: 'pre-wrap', fontSize: '12px', lineHeight: '1.5' }}>
                            {terms.split('\n').map((line, i) => (
                                <div key={i} style={{ marginBottom: '2px' }}>{line || '\u00A0'}</div>
                            ))}
                        </div>
                    </div>

                    {/* FOOTER */}
                    <div className="avoid-break" style={{ textAlign: 'center', marginTop: '20px', borderTop: '2px solid #eee', paddingTop: '20px' }}>
                        <h3 style={{ margin: '10px 0', color: '#555' }}>Gracias por su preferencia</h3>
                        <h2 style={{ margin: 0, color: 'var(--secondary-color)' }}>{companyInfo.name} {new Date().getFullYear()}</h2>
                    </div>

                </div>
            </div>

            {/* STYLES */}
            <style>{`
                .clean-input {
                    border: none;
                    border-bottom: 1px solid #ccc;
                    padding: 5px 0;
                    margin-top: 5px;
                    background: transparent;
                    outline: none;
                    font-family: inherit;
                }
                .clean-input:focus {
                    border-bottom: 2px solid var(--secondary-color);
                }
                .terms-input {
                    background: transparent;
                    outline: none;
                }
                
                .only-print { display: none; }

                @media print {
                    .no-print { display: none !important; }
                    .only-print { display: block !important; }
                    body { background: white; margin: 0; padding: 0; }
                    #quote-paper { margin: 0; width: 100% !important; max-width: none !important; box-shadow: none; padding: 0.5in; }
                }
            `}</style>
        </div>
    );
};

export default Quotes;

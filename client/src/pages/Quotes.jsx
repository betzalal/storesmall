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

const DEFAULT_TERMS = `- Cada filtro tendrá un sticker Full Color de INSTITUCION con las siguientes dimensiones 7 x 6,5 cm.
- Se dará una capacitación al personal necesario sobre el uso, manejo y cuidado del filtro, Se dará material de apoyo, 3 videos de armado, buen uso, y limpieza. Asegurando que cuando se entregue los productos, los usuarios tengan todo el material para su uso.
- La entrega será de 3 a 7 días hábiles, a la orden de compra.
- Se debe cancelar el 70% adelantado a la orden de compra y el 30% restante el día de recepción del producto.
- Entrega en almacén.`;

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

    const [items, setItems] = useState([]);
    const [terms, setTerms] = useState(DEFAULT_TERMS);

    // Current Item Entry
    const [selectedItemIdx, setSelectedItemIdx] = useState('');
    const [qty, setQty] = useState(1);
    const [price, setPrice] = useState(0);

    // New state for finishing quote
    const [isQuoteFinished, setIsQuoteFinished] = useState(false);

    // Init Logic
    useEffect(() => {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        setCustomer(prev => ({ ...prev, validUntil: d.toLocaleDateString() }));

        fetchNextNumber();
    }, []);

    const fetchNextNumber = async () => {
        if (savedId) return;
        try {
            const res = await axios.get('/quotations/next-number');
            setQuoteNumber(res.data.nextId);
        } catch (e) {
            console.error(e);
        }
    };

    // Actions
    const handleAddItem = () => {
        if (selectedItemIdx === '') return;
        const idx = parseInt(selectedItemIdx);
        const template = QUOTE_ITEMS[idx];

        if (!template) return;

        const newItem = {
            description: template.description,
            label: template.label,
            qty: qty,
            price: price,
            total: qty * price
        };
        setItems([...items, newItem]);
        setSelectedItemIdx('');
        setQty(1);
        setPrice(0);
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
                margin: 0,
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
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileText /> Nueva Cotización (v2 Clean)
                </h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={handlePDF} className="btn-primary" style={{ background: '#28a745' }}>
                        <Save size={18} style={{ marginRight: '5px' }} /> Guardar PDF
                    </button>
                    <button onClick={handlePrint} className="btn-primary">
                        <Printer size={18} style={{ marginRight: '5px' }} /> Imprimir
                    </button>
                    <button onClick={() => window.location.reload()} style={{ padding: '8px 15px', cursor: 'pointer' }}>
                        Nueva
                    </button>
                </div>
            </div>

            {/* PAPER */}
            <div id="quote-paper" style={{
                background: 'white',
                width: '8.5in',
                minHeight: '11in',
                margin: '0 auto',
                padding: '0.5in',
                boxShadow: isPrinting ? 'none' : '0 4px 6px rgba(0,0,0,0.1)',
                position: 'relative',
                color: 'black',
                fontFamily: 'Arial, sans-serif',
                boxSizing: 'border-box'
            }}>

                {/* HEADER SECTION */}
                <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    {/* Left: Company Name & Logo */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <img src="/assets/logo.jpg" alt="Logo" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
                        <div>
                            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#0056b3' }}>SAWALIFE</h1>
                            <p style={{ margin: 0, fontSize: '14px', color: '#555' }}>Filtros purificadores de agua</p>
                        </div>
                    </div>

                    {/* Right: Quote Number & Date */}
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
                <div style={{
                    border: '1px solid #ccc',
                    padding: '15px',
                    borderRadius: '5px',
                    background: '#fcfcfc',
                    marginBottom: '30px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '15px'
                }}>
                    {/* Row 1 */}
                    <div style={{ display: 'flex', gap: '20px' }}>
                        <div style={{ flex: 2 }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666' }}>CLIENTE:</label>
                            <input
                                className="clean-input"
                                value={customer.name}
                                onChange={e => setCustomer({ ...customer, name: e.target.value })}
                                style={{ width: '100%', fontWeight: 'bold' }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666' }}>NIT / CI:</label>
                            <input
                                className="clean-input"
                                value={customer.nit}
                                onChange={e => setCustomer({ ...customer, nit: e.target.value })}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666' }}>RAZÓN SOCIAL:</label>
                            <input
                                className="clean-input"
                                value={customer.rs}
                                onChange={e => setCustomer({ ...customer, rs: e.target.value })}
                                style={{ width: '100%' }}
                            />
                        </div>
                    </div>

                    {/* Row 2 */}
                    <div style={{ display: 'flex', gap: '20px' }}>
                        <div style={{ flex: 2 }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666' }}>CELULAR / EMAIL:</label>
                            <input
                                className="clean-input"
                                value={customer.contact}
                                onChange={e => setCustomer({ ...customer, contact: e.target.value })}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666' }}>FECHA LÍMITE:</label>
                            <div style={{ padding: '5px 0', borderBottom: '1px solid #ddd' }}>{customer.validUntil}</div>
                        </div>
                    </div>
                </div>

                {/* ITEMS TABLE */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
                    <thead>
                        <tr style={{ background: '#0056b3', color: 'white' }}>
                            <th style={{ padding: '10px', textAlign: 'left' }}>Item / Descripción</th>
                            <th style={{ padding: '10px', width: '60px', textAlign: 'center' }}>Cant.</th>
                            <th style={{ padding: '10px', width: '90px', textAlign: 'center' }}>P. Unit</th>
                            <th style={{ padding: '10px', width: '90px', textAlign: 'center' }}>Subtotal</th>
                            <th className="no-print" style={{ width: '30px' }}></th>
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
                                <td className="no-print">
                                    {!isQuoteFinished && (
                                        <button onClick={() => handleRemoveItem(i)} style={{ color: 'red', border: 'none', background: 'none' }}><Trash2 size={16} /></button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>

                    {/* INPUT ROW (Hidden in Print and when Finished) */}
                    {!isQuoteFinished && (
                        <tfoot className="no-print">
                            <tr style={{ background: '#f8f9fa' }}>
                                <td style={{ padding: '5px' }}>
                                    <select
                                        style={{ width: '100%', padding: '5px' }}
                                        value={selectedItemIdx}
                                        onChange={e => {
                                            setSelectedItemIdx(e.target.value);
                                            // Optional: auto-fill price from product DB if needed
                                        }}
                                    >
                                        <option value="">-- Seleccionar Item --</option>
                                        {QUOTE_ITEMS.map((item, idx) => (
                                            <option key={idx} value={idx}>{item.label}</option>
                                        ))}
                                    </select>
                                </td>
                                <td style={{ padding: '5px' }}>
                                    <input type="number" min="1" style={{ width: '100%', textAlign: 'center' }} value={qty} onChange={e => setQty(Number(e.target.value))} />
                                </td>
                                <td style={{ padding: '5px' }}>
                                    <input type="number" min="0" style={{ width: '100%', textAlign: 'center' }} value={price} onChange={e => setPrice(Number(e.target.value))} />
                                </td>
                                <td style={{ padding: '5px', textAlign: 'center' }}>{(qty * price).toFixed(2)}</td>
                                <td>
                                    <button onClick={handleAddItem} style={{ background: '#0056b3', color: 'white', border: 'none', borderRadius: '4px', padding: '5px' }}><Plus size={16} /></button>
                                </td>
                            </tr>
                        </tfoot>
                    )}
                </table>

                {/* ACTION BUTTONS (NO PRINT) */}
                {!isQuoteFinished && (
                    <div className="no-print" style={{ textAlign: 'center', marginBottom: '20px' }}>
                        <button
                            onClick={() => setIsQuoteFinished(true)}
                            style={{
                                background: '#28a745',
                                color: 'white',
                                border: 'none',
                                padding: '10px 20px',
                                borderRadius: '5px',
                                fontSize: '16px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <Save size={18} /> Finalizar Cotización
                        </button>
                    </div>
                )}

                {/* TOTAL */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '30px' }}>
                    <div style={{ background: '#0056b3', color: 'white', padding: '10px 20px', borderRadius: '5px', fontSize: '18px', fontWeight: 'bold' }}>
                        TOTAL BS: {total.toFixed(2)}
                    </div>
                </div>

                {/* TERMS */}
                <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ borderBottom: '1px solid #ccc', paddingBottom: '5px', marginBottom: '10px' }}>Condiciones Generales</h4>
                    {!isPrinting ? (
                        <textarea
                            className="terms-input"
                            value={terms}
                            onChange={e => setTerms(e.target.value)}
                            style={{ width: '100%', height: '100px', border: 'none', resize: 'none', fontFamily: 'inherit', fontSize: '12px', lineHeight: '1.5' }}
                        />
                    ) : (
                        <div style={{ whiteSpace: 'pre-wrap', fontSize: '12px', lineHeight: '1.5' }}>
                            {terms.split('\n').map((line, i) => (
                                <div key={i} style={{ marginBottom: '2px' }}>{line || '\u00A0'}</div>
                            ))}
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div style={{ textAlign: 'center', marginTop: '20px', borderTop: '2px solid #eee', paddingTop: '20px' }}>
                    <h3 style={{ margin: '10px 0', color: '#555' }}>Gracias por su preferencia</h3>
                    <h2 style={{ margin: 0, color: '#0056b3' }}>SAWALIFE 2026</h2>
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
                    border-bottom: 2px solid #0056b3;
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

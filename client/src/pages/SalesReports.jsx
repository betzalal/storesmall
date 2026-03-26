import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, List, Search, Trash2, ChevronDown, ChevronUp, FileDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';

const HistoryItem = ({ sale, user, onDelete }) => {
    const [expanded, setExpanded] = useState(false);
    const hasDetails = (sale.items && sale.items.length > 0) || sale.notes;

    return (
        <>
            <tr style={{ borderBottom: expanded ? 'none' : '1px solid #eee', background: expanded ? '#f9f9f9' : 'transparent' }}>
                <td data-label="Fecha" style={{ padding: '10px' }}>{new Date(sale.timestamp).toLocaleString()}</td>
                <td data-label="Cliente" style={{ padding: '10px' }}>
                    <div>{sale.customer_name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#777' }}>{sale.customer_nit}</div>
                    {sale.customer_whatsapp && <div style={{ fontSize: '0.8rem', color: '#25D366', fontWeight: 'bold' }}>{sale.customer_whatsapp}</div>}
                </td>
                <td data-label="Vendedor" style={{ padding: '10px' }}>{sale.seller}</td>
                <td data-label="Pago" style={{ padding: '10px' }}>{sale.payment_method}</td>
                <td data-label="Total" style={{ padding: '10px', fontWeight: 'bold' }}>Bs {(sale.total || 0).toFixed(2)}</td>
                <td data-label="Acciones" style={{ padding: '10px' }}>
                    <div style={{ display: 'flex', gap: '15px' }}>
                        {hasDetails && (
                            <button onClick={() => setExpanded(!expanded)} style={{ background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '5px 10px', display: 'flex', gap: '5px' }}>
                                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />} <span className="hide-on-mobile">Detalles</span>
                            </button>
                        )}
                        {user?.role === 'admin' && (
                            <button onClick={() => onDelete(sale.id)} style={{ background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '5px 10px' }} title="Eliminar Venta">
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                </td>
            </tr>
            {expanded && (
                <tr style={{ borderBottom: '1px solid #eee', background: '#f9f9f9' }}>
                    <td colSpan="6" data-label="Detalle de venta" style={{ padding: '10px 20px' }}>
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

const SalesReports = ({ selectedMonth }) => {
    const [sales, setSales] = useState([]);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
    const [searchTerm, setSearchTerm] = useState('');
    const [minAmount, setMinAmount] = useState('');
    const [maxAmount, setMaxAmount] = useState('');
    
    const { user } = useAuth();
    const { currentStore } = useStore();

    useEffect(() => {
        if (currentStore && selectedMonth) {
            fetchSales();
        }
    }, [currentStore, selectedMonth]);

    const fetchSales = async () => {
        try {
            const res = await axios.get(`/sales?store_id=${currentStore?.id || 1}&month=${selectedMonth}`);
            setSales(res.data);
        } catch (e) {
            console.error('Error fetching sales for reports', e);
        }
    };

    const handleDeleteSale = async (id) => {
        if (!window.confirm('¿Está seguro de eliminar esta venta permanentemente?')) return;
        try {
            await axios.delete(`/sales/${id}`);
            fetchSales();
        } catch (e) {
            alert('Error al eliminar venta');
        }
    };

    const handleExportPDF = () => {
        const element = document.getElementById('sales-reports-table');
        if (!element) return;

        const opt = {
            margin: 0.5,
            filename: `Reporte_${selectedMonth}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        if (window.html2pdf) {
            window.html2pdf().set(opt).from(element).save();
        } else {
            alert("Librería PDF no disponible. Presione Ctrl+P para imprimir.");
        }
    };

    // Filtros locales
    const filteredSales = sales.filter(s => {
        const matchSearch = searchTerm === '' || 
            (s.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (s.customer_nit?.includes(searchTerm)) ||
            (s.seller?.toLowerCase().includes(searchTerm.toLowerCase()));
            
        const matchMin = minAmount === '' || s.total >= parseFloat(minAmount);
        const matchMax = maxAmount === '' || s.total <= parseFloat(maxAmount);

        return matchSearch && matchMin && matchMax;
    });

    const totalFiltered = filteredSales.reduce((sum, s) => sum + s.total, 0);

    // Render Calendario
    const renderCalendar = () => {
        if (!selectedMonth) return null;
        const [yearStr, monthStr] = selectedMonth.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);

        const daysInMonth = new Date(year, month, 0).getDate();
        const firstDay = new Date(year, month - 1, 1).getDay(); // 0(Sun) - 6(Sat)

        // Agrupar totales por dia
        const salesByDay = {};
        filteredSales.forEach(s => {
            // s.timestamp is "YYYY-MM-DD HH:MM:SS"
            const dayStr = (s.timestamp || '').split(' ')[0].split('-')[2];
            const day = parseInt(dayStr);
            if (!isNaN(day)) {
                if (!salesByDay[day]) salesByDay[day] = 0;
                salesByDay[day] += (s.total || 0);
            }
        });

        const days = [];
        // Celdas vacias al inicio
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="calendar-cell empty"></div>);
        }
        // Dias del mes
        for (let d = 1; d <= daysInMonth; d++) {
            const dayTotal = salesByDay[d] || 0;
            days.push(
                <div key={`day-${d}`} className={`calendar-cell ${dayTotal > 0 ? 'has-sales' : ''}`} style={{
                    border: '1px solid rgba(0,0,0,0.1)',
                    background: dayTotal > 0 ? 'rgba(40, 167, 69, 0.1)' : 'rgba(255,255,255,0.5)',
                    padding: '10px',
                    minHeight: '100px',
                    borderRadius: '5px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ fontWeight: 'bold' }}>{d}</div>
                    {dayTotal > 0 && (
                        <div style={{ textAlign: 'right', color: '#28a745', fontWeight: 'bold', fontSize: '1.1rem' }}>
                            Bs {dayTotal.toFixed(2)}
                        </div>
                    )}
                </div>
            );
        }

        const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', marginBottom: '10px', textAlign: 'center', fontWeight: 'bold', color: '#555' }}>
                    {weekDays.map(w => <div key={w}>{w}</div>)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', overflowY: 'auto' }}>
                    {days}
                </div>
            </div>
        );
    };

    return (
        <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="glass-card" style={{ padding: '20px', marginBottom: '20px' }}>
                <div className="flex-between mobile-col" style={{ marginBottom: '15px', gap: '15px' }}>
                    <h2 style={{ margin: 0 }}>Reportes de Ventas ({selectedMonth})</h2>
                    <div className="mobile-wrap" style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => setViewMode('list')} className="btn-primary" style={{ background: viewMode === 'list' ? 'var(--primary-color)' : '#ccc' }}>
                            <List size={18} style={{ marginRight: '5px', verticalAlign: 'middle' }} /> Lista
                        </button>
                        <button onClick={() => setViewMode('calendar')} className="btn-primary" style={{ background: viewMode === 'calendar' ? 'var(--primary-color)' : '#ccc' }}>
                            <Calendar size={18} style={{ marginRight: '5px', verticalAlign: 'middle' }} /> Calendario
                        </button>
                        {viewMode === 'list' && (
                            <button onClick={handleExportPDF} className="btn-primary" style={{ background: '#28a745', marginLeft: '10px' }}>
                                <FileDown size={18} style={{ marginRight: '5px', verticalAlign: 'middle' }} /> PDF
                            </button>
                        )}
                    </div>
                </div>

                <div className="mobile-wrap" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'white', padding: '5px 10px', borderRadius: '20px', minWidth: '200px', flex: 1 }}>
                        <Search size={18} color="#999" style={{ marginRight: '5px' }} />
                        <input 
                            type="text" 
                            placeholder="Buscar cliente, vendedor o NIT..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ border: 'none', background: 'none', outline: 'none', width: '100%' }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>Bs Min:</span>
                        <input type="number" value={minAmount} onChange={e => setMinAmount(e.target.value)} style={{ width: '80px', padding: '5px', borderRadius: '5px', border: '1px solid #ddd' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>Bs Max:</span>
                        <input type="number" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} style={{ width: '80px', padding: '5px', borderRadius: '5px', border: '1px solid #ddd' }} />
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--primary-color)', marginLeft: 'auto' }}>
                        Total Filtro: Bs {totalFiltered.toFixed(2)}
                    </div>
                </div>
            </div>

            <div className="glass-card" style={{ flex: 1, padding: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {viewMode === 'list' ? (
                    <div className="table-responsive" style={{ overflowY: 'auto' }}>
                        <table id="sales-reports-table" className="mobile-cards-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                                    <th style={{ padding: '10px' }}>Fecha</th>
                                    <th style={{ padding: '10px' }}>Cliente</th>
                                    <th style={{ padding: '10px' }}>Vendedor</th>
                                    <th style={{ padding: '10px' }}>Pago</th>
                                    <th style={{ padding: '10px' }}>Total</th>
                                    <th style={{ padding: '10px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSales.map(sale => (
                                    <HistoryItem key={sale.id} sale={sale} user={user} onDelete={handleDeleteSale} />
                                ))}
                                {filteredSales.length === 0 && (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#999' }}>Ninguna venta coincide con la búsqueda.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {renderCalendar()}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SalesReports;

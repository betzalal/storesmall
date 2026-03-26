import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';

const SyncBarrier = ({ onDataReady }) => {
    const [networkInfo, setNetworkInfo] = useState(null);
    const [error, setError] = useState(null);
    const [showRecovery, setShowRecovery] = useState(false);
    const [conflictInfo, setConflictInfo] = useState(null);
    const [recoveryForm, setRecoveryForm] = useState({ username: '', password: '' });
    const [recoveryError, setRecoveryError] = useState(null);

    const handleResolveConflict = async (action) => {
        try {
            await axios.post('/system/resolve-conflict', {
                session_id: localStorage.getItem('sawa_session_id'),
                action
            });
            onDataReady();
        } catch (e) {
            console.error(e);
            alert("Error al resolver el conflicto. Intenta recargar la página.");
        }
    };

    const handleRecover = async (e) => {
        e.preventDefault();
        setRecoveryError(null);
        try {
            const res = await axios.post('/system/recover', recoveryForm);
            if (res.data.success && res.data.session_id) {
                localStorage.setItem('sawa_session_id', res.data.session_id);
                window.location.reload(); 
            }
        } catch (err) {
            setRecoveryError(err.response?.data?.error || "Error al recuperar cuenta");
        }
    };

    useEffect(() => {
        let sid = localStorage.getItem('sawa_session_id');
        if (!sid) {
            sid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('sawa_session_id', sid);
        }

        axios.get('/system/network-info')
            .then(res => {
                setNetworkInfo(res.data);
                if (res.data.status === 'ready') {
                    onDataReady();
                }
            })
            .catch(err => {
                console.error("Error fetching network info", err);
                setError("Error de conexión con el servidor");
            });

        const interval = setInterval(() => {
            axios.get('/system/status')
                .then(res => {
                    if (res.data.hasConflict) {
                        clearInterval(interval);
                        setConflictInfo(res.data.conflictData);
                    } else if (res.data.isSetupComplete) {
                        clearInterval(interval);
                        onDataReady();
                    }
                })
                .catch(e => console.error(e));
        }, 3000);

        return () => clearInterval(interval);
    }, [onDataReady]);

    if (error) {
        return <div style={styles.container}><h2 style={{ color: 'red' }}>{error}</h2></div>;
    }

    if (conflictInfo) {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <h1 style={{ color: '#e74c3c', marginTop: 0 }}>⚠️ Ventas Sin Guardar Detectadas</h1>
                    <p style={styles.description}>
                        Hola <strong>{conflictInfo.username}</strong>, hemos detectado que dejaste una sesión abierta en la nube con <strong>{conflictInfo.backupSales} ventas</strong>, pero tu celular acaba de intentar subir una versión más antigua con solo <strong>{conflictInfo.uploadedSales} ventas</strong>.
                    </p>
                    <p style={{ fontSize: '0.9rem', color: '#555', marginBottom: '30px' }}>
                        Para proteger los datos, bloqueamos la sincronización. ¿Qué deseas hacer?
                    </p>
                    
                    <button 
                        onClick={() => handleResolveConflict('recover')}
                        style={{ display: 'block', width: '100%', padding: '15px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '15px' }}>
                        IGNORAR EL CELULAR<br/>(Recuperar las ventas perdidas de la nube)
                    </button>
                    
                    <button 
                        onClick={() => handleResolveConflict('overwrite')}
                        style={{ display: 'block', width: '100%', padding: '15px', background: '#c0392b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                        DESTRUIR VENTAS DE LA NUBE<br/>(Sobreescribir con versión del celular)
                    </button>
                </div>
            </div>
        );
    }

    if (!networkInfo) {
        return <div style={styles.container}><h3>Cargando información de red...</h3></div>;
    }

    const qrData = JSON.stringify({
        ip: window.location.hostname,
        port: networkInfo.port,
        status: "waiting_data",
        session_id: localStorage.getItem('sawa_session_id')
    });

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h1 style={styles.title}>Esperando Conexión Móvil</h1>
                <p style={styles.description}>
                    Abre la aplicación en tu celular y escanea este código QR para sincronizar tu base de datos PRIVADA a esta sesión web.
                </p>
                <div style={styles.qrContainer}>
                    <QRCodeSVG value={qrData} size={256} />
                </div>
                <div style={styles.ipInfo}>
                    <p style={{ color: '#007bff' }}>Sesión: {localStorage.getItem('sawa_session_id').substring(0, 8)}</p>
                    <p style={{ marginTop: '10px', fontSize: '0.85rem', color: '#555' }}>El servidor limpiará tus datos automáticamente al finalizar tu jornada.</p>
                </div>
                <button onClick={() => setShowRecovery(true)} style={{ marginTop: '20px', background: 'none', border: 'none', color: '#e67e22', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.9rem' }}>
                    ¿Perdiste tu celular? Recuperar Mi Información
                </button>
            </div>
            
            {showRecovery && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '15px', width: '350px', textAlign: 'center' }}>
                        <h3 style={{ marginTop: 0, color: '#2c3e50' }}>Recuperar Base de Datos</h3>
                        <p style={{ fontSize: '0.9rem', color: '#7f8c8d', marginBottom: '20px' }}>Ingresa tus credenciales. Si tienes un respaldo de los últimos 15 días, se cargará inmediatamente tu tienda.</p>
                        <form onSubmit={handleRecover} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <input type="text" placeholder="Usuario" value={recoveryForm.username} onChange={e => setRecoveryForm({...recoveryForm, username: e.target.value})} required style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} />
                            <input type="password" placeholder="Contraseña" value={recoveryForm.password} onChange={e => setRecoveryForm({...recoveryForm, password: e.target.value})} required style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} />
                            {recoveryError && <div style={{ color: 'red', fontSize: '0.8rem', fontWeight: 'bold' }}>{recoveryError}</div>}
                            <button type="submit" style={{ padding: '12px', background: '#3498db', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Recuperar y Entrar</button>
                            <button type="button" onClick={() => setShowRecovery(false)} style={{ padding: '10px', background: 'transparent', color: '#7f8c8d', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Cancelar</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f9', fontFamily: 'system-ui, -apple-system, sans-serif' },
    card: { backgroundColor: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '450px', width: '90%' },
    title: { marginTop: 0, color: '#2c3e50', fontSize: '1.8rem' },
    description: { color: '#7f8c8d', fontSize: '1rem', marginBottom: '30px' },
    qrContainer: { display: 'inline-block', padding: '15px', backgroundColor: 'white', borderRadius: '10px', border: '1px solid #e1e8ed', marginBottom: '20px' },
    ipInfo: { color: '#95a5a6', fontSize: '1rem', fontWeight: 'bold' }
};

export default SyncBarrier;

import { useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Upload } from 'lucide-react';

const Setup = ({ onComplete }) => {
    const { login } = useAuth();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        companyName: '',
        tagline: '',
        logoData: null,
        logoPreview: '/assets/logo.jpg',
        username: '',
        password: ''
    });

    const fileInputRef = useRef(null);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, logoData: reader.result, logoPreview: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleFinish = async () => {
        if (!formData.companyName || !formData.username || !formData.password) {
            return alert("Faltan datos obligatorios (Nombre, Usuario o Contraseña).");
        }
        setLoading(true);
        try {
            const res = await axios.post('/system/setup', formData);
            if (res.data.success) {
                // Auth token handled by context, we log in using new creds
                await login(formData.username, formData.password);
                onComplete();
            }
        } catch (e) {
            console.error(e);
            alert("Error al inicializar. Revisa los logs.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)' }}>
            <div className="glass-card fade-in" style={{ width: '90%', maxWidth: '500px', background: 'white', padding: '40px', boxSizing: 'border-box' }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <h2 style={{ color: '#0056b3', margin: 0 }}>Bienvenido a tu Sistema</h2>
                    <p style={{ color: '#555', marginTop: '5px' }}>Vamos a configurar tu empresa inicial</p>
                </div>
                
                {step === 1 && (
                    <div className="fade-in">
                        <h4 style={{ marginBottom: '15px', color: '#333' }}>Paso 1: Tu Empresa</h4>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
                            <img src={formData.logoPreview} alt="Preview" style={{ width: '100px', height: '100px', objectFit: 'contain', border: '1px solid #ccc', borderRadius: '10px', marginBottom: '10px' }} />
                            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleImageChange} />
                            <button onClick={() => fileInputRef.current?.click()} className="btn-primary" style={{ padding: '8px 15px', background: '#ccc', color: '#333', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Upload size={16} /> Subir Logo
                            </button>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Nombre de la Empresa *</label>
                            <input value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} placeholder="Ej: Super Tienda S.A." className="clean-input" style={{ width: '100%' }} />
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>¿Qué hacen? (Slogan)</label>
                            <input value={formData.tagline} onChange={e => setFormData({...formData, tagline: e.target.value})} placeholder="Ej: Los mejores productos de la ciudad" className="clean-input" style={{ width: '100%' }} />
                        </div>

                        <button onClick={() => setStep(2)} className="btn-primary" style={{ width: '100%' }}>Siguiente</button>
                    </div>
                )}

                {step === 2 && (
                    <div className="fade-in">
                        <h4 style={{ marginBottom: '10px', color: '#333' }}>Paso 2: Cuenta Maestra</h4>
                        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '20px' }}>Crea tu usuario administrador para todo el sistema.</p>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Usuario / Login *</label>
                            <input value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} placeholder="admin" className="clean-input" style={{ width: '100%' }} />
                        </div>
                        <div style={{ marginBottom: '30px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Contraseña *</label>
                            <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="••••••••" className="clean-input" style={{ width: '100%' }} />
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => setStep(1)} className="btn-primary" style={{ flex: 1, background: '#ccc', color: '#333' }}>Atrás</button>
                            <button onClick={handleFinish} disabled={loading} className="btn-primary" style={{ flex: 2, background: '#28a745' }}>
                                {loading ? 'Instalando...' : 'Finalizar y Entrar'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Setup;

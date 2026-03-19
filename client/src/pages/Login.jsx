import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    // Removed store fetching since user is assigned to store backend side or in dashboard config
    useEffect(() => {
        // Just clear existing tokens if here?
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        // No storeId needed for login, server determines it based on user
        const res = await login(username, password);
        if (res.success) {
            navigate('/dashboard');
        } else {
            setError(res.error);
        }
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundImage: 'url(/assets/fondo.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundColor: '#eef2f6'
        }}>

            <div className="glass-card fade-in" style={{ width: '400px', zIndex: 10, padding: '40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <img src="/assets/logo.jpg" alt="Logo" style={{ maxWidth: '150px', maxHeight: '100px', objectFit: 'contain' }} />
                </div>
                <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>Iniciar Sesión</h2>
                {error && <div style={{ color: 'red', marginBottom: '15px', textAlign: 'center' }}>{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Usuario</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="betzalal"
                            autoFocus
                        />
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••"
                        />
                    </div>

                    <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                        Entrar
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;

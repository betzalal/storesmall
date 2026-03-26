import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StoreProvider } from './context/StoreContext';
import axios from 'axios';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Setup from './pages/Setup';
import SyncBarrier from './pages/SyncBarrier';
import './index.css';

// Splash Screen Component
const Splash = ({ onEnter }) => {
  const [company, setCompany] = useState({ 
      name: localStorage.getItem('companyName') || 'SAWALIFE', 
      tagline: localStorage.getItem('companyTagline') || 'Bienvenido a la App de Ventas', 
      logoUrl: localStorage.getItem('companyLogoUrl') || '/assets/logo.jpg' 
    });

  useEffect(() => {
      axios.get('/system/company').then(res => {
          if (res.data && res.data.name !== 'SAWALIFE') setCompany(res.data);
      }).catch(e => console.warn("Usando diseño splash por defecto") );
  }, []);

  return (
    <div
      onClick={onEnter}
      style={{
        position: 'fixed', inset: 0,
        backgroundImage: `url(${company.logoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', zIndex: 50
      }}
      className="fade-out-trigger" // We'll handle animation state in parent
    >
      <div style={{ backgroundColor: 'rgba(255,255,255,0.85)', padding: '50px 80px', borderRadius: '20px', backdropFilter: 'blur(10px)', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
        <img src={company.logoUrl} alt="Logo" style={{ height: '120px', objectFit: 'contain', marginBottom: '20px' }} />
        <h1 style={{ fontSize: '3rem', margin: 0, color: '#0056b3' }}>{company.name}</h1>
        <p style={{ fontSize: '1.5rem', color: '#555', margin: '10px 0' }}>{company.tagline}</p>
        <p style={{ marginTop: '30px', fontSize: '1rem', color: '#777', fontWeight: 'bold', border: '1px solid #ccc', padding: '10px', borderRadius: '10px' }}>Haz clic en cualquier lugar para iniciar</p>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const location = useLocation();

  const [setupStatus, setSetupStatus] = useState('loading'); // loading, needs_setup, ready

  useEffect(() => {
    axios.get('/system/status')
      .then(res => {
          if (res.data.isSetupComplete) setSetupStatus('ready');
          else setSetupStatus('needs_setup');
      })
      .catch(e => {
          setSetupStatus('needs_setup');
      });
  }, []);

  // If already logged in, skip splash
  if (user && showSplash) setShowSplash(false);

  const handleSplashClick = (e) => {
    const target = e.currentTarget;
    target.style.opacity = '0';
    target.style.transition = 'opacity 1s ease';
    setTimeout(() => setShowSplash(false), 1000);
  };

  if (setupStatus === 'loading') {
      return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Cargando sistema...</div>;
  }

  if (setupStatus === 'needs_setup') {
      return <SyncBarrier onDataReady={() => window.location.reload()} />;
  }

  if (showSplash && !user && location.pathname !== '/login') {
    return <Splash onEnter={handleSplashClick} />;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/dashboard/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <Router>
          <AppRoutes />
        </Router>
      </StoreProvider>
    </AuthProvider>
  );
}

export default App;

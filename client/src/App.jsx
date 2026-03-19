import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StoreProvider } from './context/StoreContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import './index.css';

// Splash Screen Component
const Splash = ({ onEnter }) => {
  const logoUrl = '/assets/logo.jpg';

  return (
    <div
      onClick={onEnter}
      style={{
        position: 'fixed', inset: 0,
        backgroundImage: `url(${logoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', zIndex: 50
      }}
      className="fade-out-trigger" // We'll handle animation state in parent
    >
      <div style={{ backgroundColor: 'rgba(255,255,255,0.7)', padding: '40px', borderRadius: '20px', backdropFilter: 'blur(10px)', textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', margin: 0, color: '#333' }}>SAWALIFE</h1>
        <p style={{ fontSize: '1.5rem', color: '#555' }}>Bienvenido a la App de Ventas</p>
        <p style={{ marginTop: '20px', fontSize: '0.9rem', color: '#777' }}>Click para iniciar</p>
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

  // If already logged in, skip splash
  if (user && showSplash) setShowSplash(false);

  const handleSplashClick = (e) => {
    const target = e.currentTarget;
    target.style.opacity = '0';
    target.style.transition = 'opacity 1s ease';
    setTimeout(() => setShowSplash(false), 1000);
  };

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

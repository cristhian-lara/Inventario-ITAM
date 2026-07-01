import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import './Login.css';

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Redirigir de vuelta a donde intentaba ir el usuario, o a home
    const from = location.state?.from?.pathname || '/';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al iniciar sesión');
            }

            login(data.token, data.user);
            navigate(from, { replace: true });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-wrapper">
            <div className="login-ambient-glow"></div>
            <div className="login-ambient-glow-2"></div>
            
            <div className="login-card floating-card">
                <div className="login-header">
                    <div className="login-logo">
                        <span className="logo-icon">I</span>
                        <span className="logo-text">Ikusi<span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>ITAM</span></span>
                    </div>
                    <h2>Bienvenido de nuevo</h2>
                    <p>Ingresa tus credenciales para acceder al inventario</p>
                </div>
                
                {error && <div className="login-error">{error}</div>}
                
                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="username">Usuario</label>
                        <input
                            type="text"
                            id="username"
                            className="glass-input"
                            placeholder="Ej. admin"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="password">Contraseña</label>
                        <input
                            type="password"
                            id="password"
                            className="glass-input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    
                    <button type="submit" disabled={loading} className="btn-primary login-button">
                        {loading ? 'Verificando...' : 'Iniciar Sesión'}
                    </button>
                </form>
                
                <div className="login-footer">
                    <p>Gestión de Inventario y Activos</p>
                </div>
            </div>
        </div>
    );
};

export default Login;

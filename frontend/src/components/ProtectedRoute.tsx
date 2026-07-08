import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
    children: JSX.Element;
    /** Clave del módulo RBAC requerido (con lectura basta). Sin prop = solo exige sesión. */
    module?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, module }) => {
    const { isAuthenticated, can } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) {
        // Redirigir al login si no está autenticado
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (module && !can(module).read) {
        // Sin permiso sobre el módulo (también cubre URLs escritas a mano)
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;

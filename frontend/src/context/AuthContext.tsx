import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

// El backend valida el token en cada petición (apiGuard): se adjunta globalmente.
const storedToken = localStorage.getItem('token');
if (storedToken) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
}

// Sesión expirada o token inválido (401): se limpia la sesión y se vuelve al login.
axios.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export enum Role {
    SUPER_ADMIN = 'SUPER_ADMIN',
    ADMINISTRADOR = 'ADMINISTRADOR',
    ESTANDAR = 'ESTANDAR'
}

export interface PermissionFlags {
    read: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
}

export type PermissionsMap = Record<string, PermissionFlags>;

interface User {
    id: string;
    username: string;
    fullName?: string;
    role: Role;
    permissions?: PermissionsMap;
}

const NO_ACCESS: PermissionFlags = { read: false, create: false, edit: false, delete: false };

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
    /** Flags del módulo (sin acceso si no hay permiso registrado). */
    can: (moduleKey: string) => PermissionFlags;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(() => {
        const storedUser = localStorage.getItem('user');
        return storedUser ? JSON.parse(storedUser) : null;
    });
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));

    // Permisos frescos desde BD al cargar la app: los cambios hechos por el
    // administrador surten efecto sin necesidad de reloguearse.
    useEffect(() => {
        if (!token) return;
        axios.get(`${API_URL}/api/auth/me`)
            .then(res => {
                setUser(res.data);
                localStorage.setItem('user', JSON.stringify(res.data));
            })
            .catch(() => { /* 401 lo maneja el interceptor global */ });
    }, [token]);

    const login = (newToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    };

    const logout = () => {
        // Invalida el token en el servidor (best-effort); la limpieza local no espera la respuesta.
        axios.post(`${API_URL}/api/auth/logout`).catch(() => { /* sesión ya inválida o sin red: se limpia igual */ });
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
    };

    const can = (moduleKey: string): PermissionFlags => {
        if (!user) return NO_ACCESS;
        if (user.role === Role.SUPER_ADMIN) return { read: true, create: true, edit: true, delete: true };
        return user.permissions?.[moduleKey] || NO_ACCESS;
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token, can }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth debe ser usado dentro de un AuthProvider');
    }
    return context;
};

/** Permisos del usuario actual sobre un módulo: { read, create, edit, delete }. */
export const usePermission = (moduleKey: string): PermissionFlags => {
    const { can } = useAuth();
    return can(moduleKey);
};

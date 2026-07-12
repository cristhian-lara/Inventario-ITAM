import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { PackageSearch, Users, Activity, LogOut, Settings as SettingsIcon, Menu, X, FileText, UserCog, KeyRound, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ChangePasswordModal from './ChangePasswordModal';
import { APP_VERSION } from '../version';
import './TopNavbar.css';

export default function TopNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const { user, logout, can } = useAuth();
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Cada link declara su módulo RBAC: aparece solo con permiso de lectura.
  // Dashboard queda siempre visible (es la pantalla de aterrizaje).
  // Usuarios no va aquí: vive en el menú del usuario (esquina superior derecha).
  const allNavLinks = [
    { path: '/', label: 'Dashboard', icon: <Activity size={20} />, module: null },
    { path: '/settings', label: 'Administración', icon: <SettingsIcon size={20} />, module: 'settings' },
    { path: '/collaborators', label: 'Colaboradores', icon: <Users size={20} />, module: 'collaborators' },
    { path: '/assets', label: 'Catálogo', icon: <PackageSearch size={20} />, module: 'assets' },
    { path: '/maintenances', label: 'Mantenimiento', icon: <SettingsIcon size={20} />, module: 'maintenances' },
    { path: '/actas', label: 'Actas', icon: <FileText size={20} />, module: 'actas' }
  ];

  const navLinks = allNavLinks.filter(link => user && (link.module === null || can(link.module).read));
  const canManageUsers = !!user && can('users').read;

  const closeMenu = () => setMenuOpen(false);

  // Cerrar el menú del usuario al hacer clic fuera
  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <nav className="top-navbar">
        <div className="navbar-left">
          <Link to="/" className="navbar-logo" onClick={closeMenu}>
            <span className="logo-icon">I</span>
            <span className="logo-text">Ikusi<span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>ITAM</span></span>
            <span
              title="Versión del sistema"
              style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '1px 8px', marginLeft: '8px', alignSelf: 'center' }}
            >
              v{APP_VERSION}
            </span>
          </Link>
        </div>

        {/* Desktop nav */}
        <div className="navbar-center">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path ||
              (link.path !== '/' && location.pathname.startsWith(link.path));
            return (
              <Link key={link.label} to={link.path} className={`nav-link ${isActive ? 'active' : ''}`}>
                {link.icon}
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="navbar-right">
          {/* Desktop user */}
          <div className="user-menu" ref={userMenuRef}>
            <button
              type="button"
              className="user-profile user-menu-trigger"
              onClick={() => setUserMenuOpen(v => !v)}
              aria-haspopup="true"
              aria-expanded={userMenuOpen}
            >
              <div className="avatar">{user?.username?.substring(0, 2).toUpperCase() || 'U'}</div>
              <div className="user-info">
                <span className="user-name">{user?.fullName || user?.username || 'Usuario'}</span>
              </div>
              <ChevronDown size={16} className={`user-menu-chevron ${userMenuOpen ? 'open' : ''}`} />
            </button>

            {userMenuOpen && (
              <div className="user-menu-dropdown glass-panel">
                {canManageUsers && (
                  <button
                    className="user-menu-item"
                    onClick={() => { setUserMenuOpen(false); navigate('/users'); }}
                  >
                    <UserCog size={16} />
                    Gestión de Usuarios
                  </button>
                )}
                <button
                  className="user-menu-item"
                  onClick={() => { setUserMenuOpen(false); setShowChangePassword(true); }}
                >
                  <KeyRound size={16} />
                  Cambiar contraseña
                </button>
                <button className="user-menu-item danger" onClick={handleLogout}>
                  <LogOut size={16} />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>

          {/* Hamburger button — only on mobile */}
          <button
            className="btn-hamburger"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setMenuOpen(v => !v)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="mobile-overlay" onClick={closeMenu}>
          <div className="mobile-drawer" onClick={e => e.stopPropagation()}>
            <div className="mobile-drawer-header">
              <span className="logo-text">Ikusi<span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>ITAM</span></span>
              <button className="btn-icon" onClick={closeMenu}><X size={22} /></button>
            </div>
            <nav className="mobile-nav">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path ||
                  (link.path !== '/' && location.pathname.startsWith(link.path));
                return (
                  <Link
                    key={link.label}
                    to={link.path}
                    className={`mobile-nav-link ${isActive ? 'active' : ''}`}
                    onClick={closeMenu}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mobile-drawer-footer">
              <div className="user-profile">
                <div className="avatar">{user?.username?.substring(0, 2).toUpperCase() || 'U'}</div>
                <span className="user-name">{user?.fullName || user?.username || 'Usuario'}</span>
              </div>
              <button className="btn-icon" style={{ marginLeft: 'auto' }} aria-label="Cambiar contraseña" onClick={() => { closeMenu(); setShowChangePassword(true); }}>
                <KeyRound size={20} />
              </button>
              <button className="btn-icon" onClick={handleLogout}>
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
    </>
  );
}

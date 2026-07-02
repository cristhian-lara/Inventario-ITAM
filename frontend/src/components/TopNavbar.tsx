import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { PackageSearch, Users, Activity, LogOut, Settings as SettingsIcon, Menu, X, FileText } from 'lucide-react';
import { useAuth, Role } from '../context/AuthContext';
import './TopNavbar.css';

export default function TopNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const allNavLinks = [
    { path: '/', label: 'Dashboard', icon: <Activity size={20} />, roles: [Role.ADMINISTRADOR, Role.VISUALIZADOR] },
    { path: '/settings', label: 'Administración', icon: <SettingsIcon size={20} />, roles: [Role.ADMINISTRADOR] },
    { path: '/collaborators', label: 'Colaboradores', icon: <Users size={20} />, roles: [Role.ADMINISTRADOR] },
    { path: '/assets', label: 'Catálogo', icon: <PackageSearch size={20} />, roles: [Role.ADMINISTRADOR] },
    { path: '/maintenances', label: 'Mantenimiento', icon: <SettingsIcon size={20} />, roles: [Role.ADMINISTRADOR] },
    { path: '/actas', label: 'Actas', icon: <FileText size={20} />, roles: [Role.ADMINISTRADOR] }
  ];

  const navLinks = allNavLinks.filter(link => user && link.roles.includes(user.role as Role));

  const closeMenu = () => setMenuOpen(false);

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
          <div className="user-profile">
            <div className="avatar">{user?.username?.substring(0, 2).toUpperCase() || 'U'}</div>
            <div className="user-info">
              <span className="user-name">{user?.username || 'Usuario'}</span>
            </div>
          </div>
          <button className="btn-icon" aria-label="Cerrar sesión" onClick={handleLogout}>
            <LogOut size={20} />
          </button>

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
                <span className="user-name">{user?.username || 'Usuario'}</span>
              </div>
              <button className="btn-icon" style={{ marginLeft: 'auto' }} onClick={handleLogout}>
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

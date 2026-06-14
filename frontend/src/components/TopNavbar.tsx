import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PackageSearch, Users, Activity, LogOut, Settings as SettingsIcon, Menu, X } from 'lucide-react';
import './TopNavbar.css';

export default function TopNavbar() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { path: '/', label: 'Dashboard', icon: <Activity size={20} /> },
    { path: '/settings', label: 'Administración', icon: <SettingsIcon size={20} /> },
    { path: '/collaborators', label: 'Colaboradores', icon: <Users size={20} /> },
    { path: '/assets', label: 'Catálogo', icon: <PackageSearch size={20} /> },
    { path: '/maintenances', label: 'Mantenimiento', icon: <SettingsIcon size={20} /> }
  ];

  const closeMenu = () => setMenuOpen(false);

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
            <div className="avatar">AD</div>
            <div className="user-info">
              <span className="user-name">Admin</span>
            </div>
          </div>
          <button className="btn-icon" aria-label="Cerrar sesión">
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
                <div className="avatar">AD</div>
                <span className="user-name">Admin</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

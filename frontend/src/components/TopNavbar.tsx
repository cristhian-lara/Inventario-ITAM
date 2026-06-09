import { Link, useLocation } from 'react-router-dom';
import { PackageSearch, Users, Activity, LogOut, Settings as SettingsIcon } from 'lucide-react';
import './TopNavbar.css';

export default function TopNavbar() {
  const location = useLocation();

  const navLinks = [
    { path: '/', label: 'Dashboard', icon: <Activity size={20} /> },
    { path: '/settings', label: 'Administración', icon: <SettingsIcon size={20} /> },
    { path: '/collaborators', label: 'Colaboradores', icon: <Users size={20} /> },
    { path: '/assets', label: 'Catálogo', icon: <PackageSearch size={20} /> },
    { path: '/maintenances', label: 'Mantenimiento', icon: <SettingsIcon size={20} /> }
  ];

  return (
    <nav className="top-navbar">
      <div className="navbar-left">
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">I</span>
          <span className="logo-text">Ikusi<span style={{color: 'var(--text-muted)', fontWeight: 400}}>ITAM</span></span>
        </Link>
      </div>

      <div className="navbar-center">
        {navLinks.map((link) => {
          const isActive = location.pathname === link.path || 
                          (link.path !== '/' && location.pathname.startsWith(link.path));
          
          return (
            <Link
              key={link.label}
              to={link.path}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              {link.icon}
              {link.label}
            </Link>
          );
        })}
      </div>

      <div className="navbar-right">
        <div className="user-profile">
          <div className="avatar">AD</div>
          <div className="user-info">
            <span className="user-name">Admin</span>
          </div>
        </div>
        <button className="btn-icon" aria-label="Cerrar sesión">
          <LogOut size={20} />
        </button>
      </div>
    </nav>
  );
}

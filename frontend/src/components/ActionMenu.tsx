import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';
import './ActionMenu.css';

interface ActionMenuProps {
  children: React.ReactNode;
}

export default function ActionMenu({ children }: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="action-menu-container" ref={menuRef}>
      <button 
        className="action-menu-trigger btn-action" 
        onClick={() => setIsOpen(!isOpen)}
        style={{ borderColor: 'var(--border-glass)', color: 'var(--text-muted)' }}
        title="Ver acciones"
      >
        <MoreVertical size={16} />
      </button>
      {isOpen && (
        <div className="action-menu-dropdown" onClick={() => setIsOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { MoreVertical } from 'lucide-react';
import './ActionMenu.css';

interface ActionMenuProps {
  children: React.ReactNode;
}

export default function ActionMenu({ children }: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(event.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on scroll so it doesn't float in wrong position
  useEffect(() => {
    const handleScroll = () => setIsOpen(false);
    if (isOpen) {
      document.addEventListener('scroll', handleScroll, true);
    }
    return () => document.removeEventListener('scroll', handleScroll, true);
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
        zIndex: 9999,
      });
    }
    setIsOpen(prev => !prev);
  };

  return (
    <div className="action-menu-container">
      <button
        ref={triggerRef}
        className="action-menu-trigger btn-action"
        onClick={handleToggle}
        style={{ borderColor: 'var(--border-glass)', color: 'var(--text-muted)' }}
        title="Ver acciones"
      >
        <MoreVertical size={16} />
      </button>

      {isOpen && ReactDOM.createPortal(
        <div
          ref={dropdownRef}
          className="action-menu-dropdown"
          style={dropdownStyle}
          onClick={() => setIsOpen(false)}
        >
          {children}
        </div>,
        document.body
      )}
    </div>
  );
}

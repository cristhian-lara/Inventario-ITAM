import { useEffect } from 'react';
import type { CSSProperties, ReactNode } from 'react';

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  zIndex?: number;
  disableClose?: boolean;
  overlayStyle?: CSSProperties;
  panelStyle?: CSSProperties;
  panelClassName?: string;
}

/** Overlay + panel genéricos para modales custom; centraliza el boilerplate de posicionamiento, click-fuera y tecla Escape. */
export default function Modal({
  onClose,
  children,
  zIndex = 1000,
  disableClose = false,
  overlayStyle,
  panelStyle,
  panelClassName
}: ModalProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !disableClose) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, disableClose]);

  return (
    <div
      onClick={() => !disableClose && onClose()}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex, padding: '20px',
        ...overlayStyle
      }}
    >
      <div className={panelClassName} onClick={e => e.stopPropagation()} style={panelStyle}>
        {children}
      </div>
    </div>
  );
}

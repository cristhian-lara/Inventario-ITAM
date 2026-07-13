import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import './ToastContext.css';

export type ToastType = 'success' | 'error' | 'info';

interface ToastOptions {
  message: string;
  type?: ToastType;
  /** ms antes de auto-cerrar. Default 5000. */
  duration?: number;
}

interface Toast extends ToastOptions {
  id: number;
}

interface ToastContextType {
  toast: (options: ToastOptions | string) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const DEFAULT_DURATION = 5000;

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((options: ToastOptions | string) => {
    const opts: ToastOptions = typeof options === 'string' ? { message: options } : options;
    const id = nextId.current++;
    setToasts(prev => [...prev, { id, type: 'info', duration: DEFAULT_DURATION, ...opts }]);
    setTimeout(() => dismiss(id), opts.duration ?? DEFAULT_DURATION);
  }, [dismiss]);

  const success = useCallback((message: string, duration?: number) => toast({ message, type: 'success', duration }), [toast]);
  const error = useCallback((message: string, duration?: number) => toast({ message, type: 'error', duration }), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error }}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast-item toast-${t.type} glass-panel`}>
            {t.type === 'success' && <CheckCircle2 size={20} className="toast-icon" />}
            {t.type === 'error' && <AlertCircle size={20} className="toast-icon" />}
            {t.type === 'info' && <Info size={20} className="toast-icon" />}
            <span className="toast-message">{t.message}</span>
            <button className="toast-close" aria-label="Cerrar" onClick={() => dismiss(t.id)}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

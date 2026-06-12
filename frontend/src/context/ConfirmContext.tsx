import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';
import './ConfirmContext.css';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  type?: 'danger' | 'warning' | 'info';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => void;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  const confirm = useCallback((newOptions: ConfirmOptions) => {
    setOptions(newOptions);
  }, []);

  const handleConfirm = useCallback(() => {
    if (options) {
      options.onConfirm();
      setOptions(null);
    }
  }, [options]);

  const handleCancel = useCallback(() => {
    setOptions(null);
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {options && (
        <div className="confirm-modal-overlay">
          <div className="confirm-modal glass-panel slide-up">
            <div className="confirm-modal-header">
              {options.type === 'danger' && <AlertCircle size={32} className="confirm-icon danger" />}
              {options.type === 'warning' && <HelpCircle size={32} className="confirm-icon warning" />}
              {(!options.type || options.type === 'info') && <CheckCircle2 size={32} className="confirm-icon info" />}
            </div>
            <h3 className="confirm-modal-title">{options.title}</h3>
            <p className="confirm-modal-message">{options.message}</p>
            <div className="confirm-modal-actions">
              <button className="btn-secondary" onClick={handleCancel}>
                {options.cancelText || 'Cancelar'}
              </button>
              <button 
                className={options.type === 'danger' ? 'btn-danger' : 'btn-primary'} 
                onClick={handleConfirm}
              >
                {options.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

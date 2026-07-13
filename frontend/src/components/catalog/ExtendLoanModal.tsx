interface Target {
  assignmentId: string;
  assetId: string;
  currentReturnDate?: string;
}

interface Props {
  target: Target | null;
  newReturnDate: string;
  onDateChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

export default function ExtendLoanModal({ target, newReturnDate, onDateChange, onClose, onSubmit, isPending }: Props) {
  if (!target) return null;

  return (
    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
      <div className="glass-panel" style={{ width: '400px', padding: '20px' }}>
        <h3 style={{ marginTop: 0 }}>Extender Préstamo</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Activo <strong>{target.assetId}</strong>. Fecha de devolución actual:{' '}
          <strong>{target.currentReturnDate ? new Date(target.currentReturnDate).toLocaleDateString('es-CO') : 'N/A'}</strong>.
          Al extender, se reinicia la alerta de vencimiento.
        </p>
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>Nueva Fecha de Devolución</label>
            <input
              type="date"
              required
              className="glass-input"
              min={new Date().toISOString().split('T')[0]}
              value={newReturnDate}
              onChange={(e) => onDateChange(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button type="button" className="btn-glass" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={isPending}>
              {isPending ? 'Procesando...' : 'Confirmar Extensión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

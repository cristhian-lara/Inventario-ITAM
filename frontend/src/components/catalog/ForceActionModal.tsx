interface Props {
  target: { type: 'accept' | 'return'; assetId: string } | null;
  reason: string;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

export default function ForceActionModal({ target, reason, onReasonChange, onClose, onSubmit, isPending }: Props) {
  if (!target) return null;

  return (
    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
      <div className="glass-panel" style={{ width: '400px', padding: '20px' }}>
        <h3 style={{ marginTop: 0 }}>{target.type === 'accept' ? 'Forzar Aceptación' : 'Forzar Devolución'}</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Esta acción requiere registrar el motivo por el cual el administrador está firmando el acta forzadamente.
        </p>
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>Motivo / Justificación</label>
            <textarea
              required
              className="glass-input"
              rows={3}
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Ej. El usuario no tiene acceso a internet..."
            ></textarea>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button type="button" className="btn-glass" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={isPending}>
              {isPending ? 'Procesando...' : 'Confirmar Firma'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

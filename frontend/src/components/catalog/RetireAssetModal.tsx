import { Trash2 } from 'lucide-react';

const PRESET_REASONS = ['Obsolescencia', 'Daño irreparable', 'Robo / Pérdida', 'Fin de vida útil'];

interface Props {
  assetId: string | null;
  reason: string;
  setReason: (value: string) => void;
  blanccoId: string;
  setBlanccoId: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}

export default function RetireAssetModal({ assetId, reason, setReason, blanccoId, setBlanccoId, notes, setNotes, onClose, onConfirm, isPending }: Props) {
  if (!assetId) return null;

  const isOtherReason = reason.startsWith('Otro') || !PRESET_REASONS.includes(reason) && reason !== '';

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px' }}>
      <div className="glass-panel" style={{ padding: '30px', maxWidth: '450px', width: '100%', textAlign: 'center' }}>
        <Trash2 size={48} color="#ef4444" style={{ marginBottom: '20px' }} />
        <h3 style={{ color: 'var(--text-main)', marginBottom: '15px' }}>Dar de baja activo</h3>
        <p style={{ margin: '0 0 20px 0', color: 'var(--text-muted)' }}>
          ¿Estás seguro de que deseas dar de baja el activo <b>{assetId}</b> definitivamente? Esta acción es irreversible.
        </p>
        <div className="form-group" style={{ textAlign: 'left' }}>
          <label>Motivo de la baja *</label>
          <select
            className="glass-input"
            value={PRESET_REASONS.includes(reason) ? reason : (reason ? 'Otro' : '')}
            onChange={(e) => setReason(e.target.value === 'Otro' ? 'Otro: ' : e.target.value)}
            style={{ marginBottom: '10px' }}
          >
            <option value="">Seleccione un motivo...</option>
            {PRESET_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            <option value="Otro">Otro (especifique)</option>
          </select>
          {isOtherReason && (
            <input
              type="text"
              className="glass-input"
              value={reason.replace(/^Otro: ?/, '')}
              onChange={(e) => setReason(`Otro: ${e.target.value}`)}
              placeholder="Describe el motivo..."
              style={{ marginBottom: '10px' }}
              autoFocus
            />
          )}
          <label>ID del reporte de borrado (Blancco)</label>
          <input
            type="text"
            className="glass-input"
            value={blanccoId}
            onChange={(e) => setBlanccoId(e.target.value)}
            placeholder="Ej. BL-2026-00123 (déjalo vacío si no aplica, ej. robo)"
            style={{ marginBottom: '10px' }}
          />
          <label>Notas adicionales</label>
          <textarea
            className="glass-input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ minHeight: '60px', resize: 'vertical' }}
            placeholder="Ej. Acta de robo #123, disposición final con proveedor certificado..."
          />
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '24px', justifyContent: 'center' }}>
          <button
            className="btn-glass"
            onClick={onClose}
            style={{ padding: '10px 20px' }}
          >
            Cancelar
          </button>
          <button
            className="btn-primary"
            style={{ background: '#ef4444', borderColor: '#ef4444', opacity: reason.trim() && reason !== 'Otro: ' ? 1 : 0.5, padding: '10px 20px' }}
            onClick={onConfirm}
            disabled={!reason.trim() || reason === 'Otro: ' || isPending}
          >
            {isPending ? 'Procesando...' : 'Confirmar Baja'}
          </button>
        </div>
      </div>
    </div>
  );
}

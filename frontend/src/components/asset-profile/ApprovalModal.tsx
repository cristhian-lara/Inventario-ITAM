import { CheckCircle } from 'lucide-react';

interface Props {
    note: string;
    setNote: (value: string) => void;
    onClose: () => void;
    onSubmit: () => void;
    isPending: boolean;
}

export default function ApprovalModal({ note, setNote, onClose, onSubmit, isPending }: Props) {
    return (
        <div className="ap-modal-overlay" onClick={onClose}>
            <div className="ap-modal glass-panel" onClick={e => e.stopPropagation()}>
                <button className="ap-modal-close" onClick={onClose}>✕</button>
                <h3 className="ap-modal-title">
                    <CheckCircle size={20} color="var(--ikusi-green)" />
                    Visto Bueno de Devolución
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Al aprobar, certificas la recepción del equipo y que el colaborador no tiene cuentas pendientes con el área de TI.
                    El acta de devolución se actualizará con tu visto bueno.
                </p>
                <div className="ap-form-group" style={{ marginBottom: '20px' }}>
                    <label>Observaciones (estado del equipo, novedades, etc.)</label>
                    <textarea
                        className="glass-input"
                        rows={4}
                        style={{ width: '100%', resize: 'vertical' }}
                        placeholder="Ej. Equipo recibido en buen estado, con cargador y maletín."
                        value={note}
                        onChange={e => setNote(e.target.value)}
                    />
                </div>
                <button
                    className="btn-primary"
                    style={{ width: '100%' }}
                    disabled={isPending}
                    onClick={onSubmit}
                >
                    {isPending ? 'Registrando...' : 'Aprobar Devolución'}
                </button>
            </div>
        </div>
    );
}

import { Trash2 } from 'lucide-react';

interface Props {
    fieldName: string;
    onClose: () => void;
    onConfirm: () => void;
}

export default function DeleteFieldModal({ fieldName, onClose, onConfirm }: Props) {
    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px' }}>
            <div className="glass-panel" style={{ padding: '30px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                <Trash2 size={48} color="#ef4444" style={{ marginBottom: '20px' }} />
                <h3 style={{ color: 'var(--text-main)', marginBottom: '15px' }}>Eliminar campo</h3>
                <p style={{ margin: '0 0 24px 0', color: 'var(--text-muted)' }}>
                    ¿Estás seguro de que deseas eliminar el campo <b>"{fieldName}"</b>? Esta acción removerá el campo de la configuración de la categoría.
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button
                        className="btn-glass"
                        onClick={onClose}
                        style={{ padding: '10px 20px' }}
                    >
                        Cancelar
                    </button>
                    <button
                        className="btn-primary"
                        style={{ background: '#ef4444', borderColor: '#ef4444', padding: '10px 20px' }}
                        onClick={onConfirm}
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
}

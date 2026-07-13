import { Plus } from 'lucide-react';

interface Props {
    editingDepId: number | null;
    newDepName: string;
    setNewDepName: (value: string) => void;
    newDepDesc: string;
    setNewDepDesc: (value: string) => void;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    onCancelEdit: () => void;
    isPending: boolean;
}

export default function DepartmentFormModal({ editingDepId, newDepName, setNewDepName, newDepDesc, setNewDepDesc, onClose, onSubmit, onCancelEdit, isPending }: Props) {
    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px' }}>
            <div className="glass-panel" style={{ position: 'relative', width: '100%', maxWidth: '600px', margin: 0, padding: '30px', maxHeight: '90vh', overflowY: 'auto' }}>
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '5px', fontSize: '18px' }}
                >
                    ✕
                </button>
                <h3 style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--text-main)', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px', fontSize: '22px', marginTop: 0 }}>
                    {editingDepId ? 'Editar Departamento' : 'Nuevo Departamento'}
                </h3>
                <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px dashed var(--border-glass)' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label>Nombre del Departamento</label>
                            <input required className="glass-input" value={newDepName} onChange={e => setNewDepName(e.target.value)} />
                        </div>
                        <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                            <label>Descripción</label>
                            <input className="glass-input" value={newDepDesc} onChange={e => setNewDepDesc(e.target.value)} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="submit" className="btn-primary" disabled={isPending}>
                            <Plus size={16} /> {editingDepId ? 'Guardar Cambios' : 'Crear Departamento'}
                        </button>
                        {editingDepId && (
                            <button type="button" className="btn-secondary" style={{ padding: '10px 16px', background: 'transparent', border: '1px solid var(--border-glass)', color: 'white', cursor: 'pointer' }} onClick={onCancelEdit}>
                                Cancelar
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}

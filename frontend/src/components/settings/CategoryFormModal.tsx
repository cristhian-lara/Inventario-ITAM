import { Plus, Trash2, Tag, AlertCircle } from 'lucide-react';

export interface FieldConfig {
    name: string;
    isRequired: boolean;
    type: string;
    options: string[];
    unit?: string;
    newOptionValue?: string;
}

interface Props {
    editingCatId: number | null;
    newCatName: string;
    setNewCatName: (value: string) => void;
    newCatRequiresPlaca: boolean;
    setNewCatRequiresPlaca: (value: boolean) => void;
    newCatIdPrefix: string;
    setNewCatIdPrefix: (value: string) => void;
    fields: FieldConfig[];
    setFields: (fields: FieldConfig[]) => void;
    onDeleteFieldRequest: (idx: number) => void;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    onCancelEdit: () => void;
    isPending: boolean;
}

export default function CategoryFormModal({
    editingCatId,
    newCatName,
    setNewCatName,
    newCatRequiresPlaca,
    setNewCatRequiresPlaca,
    newCatIdPrefix,
    setNewCatIdPrefix,
    fields,
    setFields,
    onDeleteFieldRequest,
    onClose,
    onSubmit,
    onCancelEdit,
    isPending
}: Props) {
    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px' }}>
            <div className="glass-panel" style={{ position: 'relative', width: '100%', maxWidth: '900px', margin: 0, padding: '30px', maxHeight: '90vh', overflowY: 'auto' }}>
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '5px', fontSize: '18px' }}
                >
                    ✕
                </button>
                <h3 style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--text-main)', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px', fontSize: '22px', marginTop: 0 }}>
                    {editingCatId ? 'Editar Categoría' : 'Nueva Categoría'}
                </h3>
                <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px dashed var(--border-glass)' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label>Nombre (Ej: Laptop, Teléfono Móvil)</label>
                            <input required className="glass-input" value={newCatName} onChange={e => setNewCatName(e.target.value)} />
                        </div>
                        <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                                type="checkbox"
                                id="requiresPlaca"
                                checked={newCatRequiresPlaca}
                                onChange={e => setNewCatRequiresPlaca(e.target.checked)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <label htmlFor="requiresPlaca" style={{ marginBottom: 0, cursor: 'pointer' }}>
                                ¿Los activos de esta categoría llevan Placa Ikusi? <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>(Desmarcar para Periféricos / ID Autoincremental)</span>
                            </label>
                        </div>
                        {!newCatRequiresPlaca && (
                            <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                                <label>Prefijo del ID autoincremental</label>
                                <input
                                    className="glass-input"
                                    value={newCatIdPrefix}
                                    maxLength={10}
                                    onChange={e => setNewCatIdPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                                    placeholder="Ej: PER"
                                />
                                <small style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                                    {newCatIdPrefix
                                        ? `Los activos nuevos se numerarán ${newCatIdPrefix}001, ${newCatIdPrefix}002...`
                                        : 'Sin prefijo, los activos se numerarán 000001, 000002...'}
                                </small>
                            </div>
                        )}
                    </div>
                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--accent-blue)', borderRadius: '8px', padding: '12px 16px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ color: 'var(--accent-blue)' }}><AlertCircle size={20} /></div>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                            <strong>Nota:</strong> Los valores por defecto del sistema (Número de Serie, Garantía, Valor de Compra y Depreciación) ahora son <strong>opcionales</strong> para todos los activos. Solo necesitas definir aquí los campos específicos obligatorios de esta categoría.
                        </p>
                    </div>
                    <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <label style={{ margin: 0, fontSize: '16px', color: 'var(--text-main)' }}>Estructura de Campos Dinámicos</label>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {fields.map((field, idx) => (
                                <div key={idx} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '0', position: 'relative', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
                                        <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Tag size={16} color="var(--ikusi-green)" />
                                            {field.name ? `Campo: ${field.name}` : 'Nuevo Campo Dinámico'}
                                        </h4>

                                        <button
                                            type="button"
                                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, padding: '4px 8px', borderRadius: '4px' }}
                                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                            title="Eliminar este campo por completo"
                                            onClick={() => onDeleteFieldRequest(idx)}
                                        >
                                            <Trash2 size={16} /> Eliminar
                                        </button>
                                    </div>

                                    <div style={{ padding: '24px' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: field.type === 'select' ? '20px' : '0' }}>
                                            <div>
                                                <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Nombre del Campo</label>
                                                <input
                                                    className="glass-input"
                                                    placeholder="Ej. procesador, resolucion"
                                                    value={field.name}
                                                    onChange={(e) => {
                                                        const newF = [...fields];
                                                        newF[idx].name = e.target.value;
                                                        setFields(newF);
                                                    }}
                                                />
                                            </div>

                                            <div>
                                                <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Obligatoriedad</label>
                                                <select
                                                    className="glass-input"
                                                    value={field.isRequired ? 'req' : 'opt'}
                                                    onChange={(e) => {
                                                        const newF = [...fields];
                                                        newF[idx].isRequired = e.target.value === 'req';
                                                        setFields(newF);
                                                    }}
                                                >
                                                    <option value="req">Obligatorio</option>
                                                    <option value="opt">Opcional</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Tipo de Dato</label>
                                                <select
                                                    className="glass-input"
                                                    value={field.type || 'text'}
                                                    onChange={(e) => {
                                                        const newF = [...fields];
                                                        newF[idx].type = e.target.value;
                                                        setFields(newF);
                                                    }}
                                                >
                                                    <option value="text">Texto Libre</option>
                                                    <option value="select">Lista de Opciones</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Unidad de Medida (Opcional)</label>
                                                <input
                                                    className="glass-input"
                                                    placeholder="Ej. GB, MHz"
                                                    value={field.unit || ''}
                                                    onChange={(e) => {
                                                        const newF = [...fields];
                                                        newF[idx].unit = e.target.value;
                                                        setFields(newF);
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {field.type === 'select' && (
                                            <div style={{ background: '#f1f5f9', padding: '20px', borderRadius: '8px', border: '1px dashed var(--border-strong)' }}>
                                                <label style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: 600, marginBottom: '12px', display: 'block' }}>
                                                    Opciones Disponibles
                                                </label>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <input
                                                        className="glass-input"
                                                        placeholder="Escribe una opción y presiona la tecla Enter..."
                                                        value={field.newOptionValue || ''}
                                                        onChange={(e) => {
                                                            const newF = [...fields];
                                                            newF[idx].newOptionValue = e.target.value;
                                                            setFields(newF);
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                if (field.newOptionValue?.trim()) {
                                                                    const newF = [...fields];
                                                                    newF[idx].options = [...(Array.isArray(newF[idx].options) ? newF[idx].options : []), newF[idx].newOptionValue!.trim()];
                                                                    newF[idx].newOptionValue = '';
                                                                    setFields(newF);
                                                                }
                                                            }
                                                        }}
                                                    />
                                                </div>

                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '16px' }}>
                                                    {Array.isArray(field.options) && field.options.length === 0 && (
                                                        <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            ⚠️ Escribe arriba y presiona Enter para agregar la primera opción.
                                                        </span>
                                                    )}
                                                    {Array.isArray(field.options) && field.options.map((opt: string, optIdx: number) => (
                                                        <span key={optIdx} className="badge badge-category" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--ikusi-green-light)', border: '1px solid var(--ikusi-green)', padding: '8px 14px', fontSize: '14px', color: 'var(--ikusi-green-hover)' }}>
                                                            {opt}
                                                            <button type="button" style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '0', fontWeight: 'bold', fontSize: '16px', display: 'flex', alignItems: 'center' }} title="Eliminar opción" onClick={() => {
                                                                const newF = [...fields];
                                                                newF[idx].options.splice(optIdx, 1);
                                                                setFields(newF);
                                                            }}>✕</button>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            className="btn-glass"
                            onClick={() => setFields([...fields, { name: '', isRequired: true, type: 'text', options: [], unit: '', newOptionValue: '' }])}
                            style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '16px', borderStyle: 'dashed', borderWidth: '2px', color: 'var(--ikusi-green)', borderColor: 'var(--ikusi-green-glow)', background: 'var(--ikusi-green-light)', fontWeight: 600 }}
                        >
                            + Agregar Nuevo Campo a la Categoría
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="submit" className="btn-primary" disabled={isPending}>
                            <Plus size={16} /> {editingCatId ? 'Guardar Cambios' : 'Crear Categoría'}
                        </button>
                        {editingCatId && (
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

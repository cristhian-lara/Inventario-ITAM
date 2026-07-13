import { CpuIcon } from 'lucide-react';

export interface UpgradeFormData {
    component: string;
    old_value: string;
    new_value: string;
    upgrade_date: string;
    performed_by: string;
    notes: string;
}

interface Props {
    form: UpgradeFormData;
    setForm: (updater: UpgradeFormData | ((prev: UpgradeFormData) => UpgradeFormData)) => void;
    componentOptions: string[];
    getCurrentSpecValue: (component: string, attrs: Record<string, any>) => string;
    specs: Record<string, any>;
    onClose: () => void;
    onSubmit: () => void;
    isPending: boolean;
    isError: boolean;
}

export default function UpgradeFormModal({ form, setForm, componentOptions, getCurrentSpecValue, specs, onClose, onSubmit, isPending, isError }: Props) {
    const currentSpecValue = getCurrentSpecValue(form.component, specs);

    return (
        <div className="ap-modal-overlay" onClick={onClose}>
            <div className="ap-modal glass-panel" onClick={e => e.stopPropagation()}>
                <button className="ap-modal-close" onClick={onClose}>✕</button>
                <h3 className="ap-modal-title">
                    <CpuIcon size={20} color="var(--ikusi-green)" />
                    Registrar Actualización de Hardware
                </h3>

                <div className="ap-form-row">
                    <div className="ap-form-group">
                        <label>Componente *</label>
                        <select
                            className="glass-input"
                            value={form.component}
                            onChange={e => {
                                const selected = e.target.value;
                                const currentVal = selected ? getCurrentSpecValue(selected, specs) : '';
                                setForm(f => ({ ...f, component: selected, old_value: currentVal }));
                            }}
                        >
                            <option value="">Seleccionar...</option>
                            {componentOptions.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                    <div className="ap-form-group">
                        <label>Fecha del Upgrade *</label>
                        <input
                            type="date"
                            className="glass-input"
                            value={form.upgrade_date}
                            onChange={e => setForm(f => ({ ...f, upgrade_date: e.target.value }))}
                        />
                    </div>
                </div>

                <div className="ap-form-row">
                    <div className="ap-form-group">
                        <label>
                            Valor Anterior
                            {form.old_value && (
                                <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--ikusi-green)', fontWeight: 600 }}>
                                    ✓ Tomado de especificaciones actuales
                                </span>
                            )}
                        </label>
                        <input
                            type="text"
                            className="glass-input"
                            placeholder="Sin especificación registrada"
                            value={form.old_value}
                            readOnly={!!currentSpecValue}
                            style={currentSpecValue ? {
                                background: 'rgba(0,166,80,0.06)',
                                borderColor: 'rgba(0,166,80,0.3)',
                                color: 'var(--text-secondary)',
                                cursor: 'not-allowed'
                            } : {}}
                            onChange={e => setForm(f => ({ ...f, old_value: e.target.value }))}
                        />
                    </div>
                    <div className="ap-form-group">
                        <label>Nuevo Valor *</label>
                        <input
                            type="text"
                            className="glass-input"
                            placeholder="ej. 16 GB DDR4"
                            value={form.new_value}
                            onChange={e => setForm(f => ({ ...f, new_value: e.target.value }))}
                        />
                    </div>
                </div>

                <div className="ap-form-group">
                    <label>Técnico Responsable</label>
                    <input
                        type="text"
                        className="glass-input"
                        placeholder="Nombre del técnico que realizó el cambio"
                        value={form.performed_by}
                        onChange={e => setForm(f => ({ ...f, performed_by: e.target.value }))}
                    />
                </div>

                <div className="ap-form-group">
                    <label>Notas adicionales</label>
                    <textarea
                        className="glass-input"
                        rows={3}
                        placeholder="Observaciones sobre el upgrade..."
                        value={form.notes}
                        onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                        style={{ resize: 'vertical' }}
                    />
                </div>

                <div className="ap-modal-footer">
                    <button className="btn-glass" onClick={onClose}>
                        Cancelar
                    </button>
                    <button
                        className="btn-primary"
                        disabled={!form.component || !form.new_value || !form.upgrade_date || isPending}
                        onClick={onSubmit}
                    >
                        {isPending ? 'Guardando...' : 'Registrar Upgrade'}
                    </button>
                </div>

                {isError && (
                    <p style={{ color: 'var(--accent-red)', marginTop: '12px', fontSize: '13px' }}>
                        Error al guardar. Intenta nuevamente.
                    </p>
                )}
            </div>
        </div>
    );
}

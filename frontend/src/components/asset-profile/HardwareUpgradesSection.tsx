import { CpuIcon, Plus, Calendar, ArrowRight, User } from 'lucide-react';
import LoadingState from '../LoadingState';

interface HardwareUpgrade {
    id: string;
    upgrade_date: string;
    component: string;
    old_value?: string;
    new_value: string;
    performed_by?: string;
    notes?: string;
}

interface Props {
    upgrades: HardwareUpgrade[] | undefined;
    loading: boolean;
    canEdit: boolean;
    onOpenUpgradeModal: () => void;
}

export default function HardwareUpgradesSection({ upgrades, loading, canEdit, onOpenUpgradeModal }: Props) {
    return (
        <div className="ap-section glass-panel">
            <div className="ap-section-header">
                <h3 className="ap-section-title">
                    <CpuIcon size={20} color="var(--ikusi-green)" />
                    Actualizaciones de Hardware
                    {upgrades && upgrades.length > 0 && (
                        <span className="count-badge">{upgrades.length}</span>
                    )}
                </h3>
                {canEdit && (
                    <button
                        className="btn-primary"
                        style={{ padding: '8px 14px', fontSize: '13px' }}
                        onClick={onOpenUpgradeModal}
                    >
                        <Plus size={15} />
                        Registrar Upgrade
                    </button>
                )}
            </div>

            {loading ? (
                <div className="ap-empty"><LoadingState message="Cargando upgrades..." inline /></div>
            ) : !upgrades || upgrades.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <p className="ap-empty">No hay actualizaciones de hardware registradas.</p>
                    {canEdit && (
                        <button
                            className="btn-glass"
                            style={{ marginTop: '12px', fontSize: '13px', padding: '8px 16px' }}
                            onClick={onOpenUpgradeModal}
                        >
                            <Plus size={14} /> Registrar el primer upgrade
                        </button>
                    )}
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table className="upgrades-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Componente</th>
                                <th>Cambio</th>
                                <th>Técnico</th>
                                <th>Notas</th>
                            </tr>
                        </thead>
                        <tbody>
                            {upgrades.map((u) => (
                                <tr key={u.id}>
                                    <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <Calendar size={13} />
                                            {new Date(u.upgrade_date).toLocaleDateString('es-CO')}
                                        </div>
                                    </td>
                                    <td>
                                        <span className="upgrade-component-badge">
                                            <CpuIcon size={11} />
                                            {u.component}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="upgrade-arrow">
                                            {u.old_value && (
                                                <>
                                                    <span className="upgrade-old-value">{u.old_value}</span>
                                                    <ArrowRight size={13} color="var(--text-muted)" />
                                                </>
                                            )}
                                            <span className="upgrade-new-value">{u.new_value}</span>
                                        </div>
                                    </td>
                                    <td>
                                        {u.performed_by ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <User size={13} />
                                                {u.performed_by}
                                            </div>
                                        ) : (
                                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>
                                        )}
                                    </td>
                                    <td style={{ maxWidth: '200px', color: 'var(--text-muted)', fontSize: '13px' }}>
                                        {u.notes || '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

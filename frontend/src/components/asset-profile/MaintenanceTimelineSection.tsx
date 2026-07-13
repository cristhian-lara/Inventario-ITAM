import { Wrench, CheckCircle, AlertCircle, Calendar, User, FileText } from 'lucide-react';
import LoadingState from '../LoadingState';
import { API_URL } from '../../config';

interface MaintenanceRecord {
    id: string;
    type: 'PREVENTIVE' | 'CORRECTIVE';
    status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    scheduledDate: string;
    executionDate?: string;
    collaboratorInTurnName?: string;
    pdfUrl?: string;
}

interface Props {
    maintenances: MaintenanceRecord[] | undefined;
    loading: boolean;
    maintTypeLabel: (t: string) => string;
    maintStatusLabel: (s: string) => string;
}

export default function MaintenanceTimelineSection({ maintenances, loading, maintTypeLabel, maintStatusLabel }: Props) {
    return (
        <div className="ap-section glass-panel">
            <div className="ap-section-header">
                <h3 className="ap-section-title">
                    <Wrench size={20} color="var(--ikusi-green)" />
                    Historial de Mantenimientos
                    {maintenances && maintenances.length > 0 && (
                        <span className="count-badge">{maintenances.length}</span>
                    )}
                </h3>
            </div>

            {loading ? (
                <div className="ap-empty"><LoadingState message="Cargando mantenimientos..." inline /></div>
            ) : !maintenances || maintenances.length === 0 ? (
                <p className="ap-empty">No hay registros de mantenimiento para este equipo.</p>
            ) : (
                <div className="maint-timeline">
                    {maintenances.map((m) => (
                        <div key={m.id} className="maint-timeline-item">
                            <div className="maint-connector" />
                            <div className={`maint-dot ${m.type.toLowerCase()} ${m.status.toLowerCase()}`} />
                            <div className="maint-card">
                                <div className="maint-card-header">
                                    <div className="maint-badges">
                                        <span className={`badge-ap badge-type-${m.type.toLowerCase()}`}>
                                            {m.type === 'PREVENTIVE' ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
                                            {maintTypeLabel(m.type)}
                                        </span>
                                        <span className={`badge-ap badge-status-${m.status.toLowerCase()}`}>
                                            {maintStatusLabel(m.status)}
                                        </span>
                                    </div>
                                    <div className="maint-dates">
                                        <Calendar size={13} />
                                        {m.executionDate
                                            ? `Ejecutado: ${new Date(m.executionDate).toLocaleDateString('es-CO')}`
                                            : `Programado: ${new Date(m.scheduledDate).toLocaleDateString('es-CO')}`
                                        }
                                    </div>
                                </div>

                                {m.collaboratorInTurnName && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                        <User size={12} />
                                        Responsable: <strong>{m.collaboratorInTurnName}</strong>
                                    </div>
                                )}

                                {m.pdfUrl && (
                                    <a
                                        href={`${API_URL}${m.pdfUrl}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="maint-pdf-link"
                                    >
                                        <FileText size={13} />
                                        Ver Acta de Mantenimiento
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

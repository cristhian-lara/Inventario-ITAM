import { Users, User, Mail, Calendar, Clock, Hash, FileText } from 'lucide-react';
import LoadingState from '../LoadingState';
import { API_URL } from '../../config';

interface AssignmentHistory {
    id: string;
    collaboratorName: string;
    collaboratorEmail: string;
    status: string;
    assignmentType?: 'PERMANENT' | 'LOAN';
    expectedReturnDate?: string | null;
    startDate: string;
    endDate?: string;
    documentPath?: string;
    adminApproval?: {
        approvedBy: string;
        approvedAt: string;
        note?: string;
    } | null;
}

interface Props {
    assignmentHistory: AssignmentHistory[] | undefined;
    loading: boolean;
    canEdit: boolean;
    assignmentStatusLabel: (s: string) => string;
    formatDateSafe: (value: string) => string;
    onApprove: (assignmentId: string) => void;
}

export default function AssignmentHistorySection({ assignmentHistory, loading, canEdit, assignmentStatusLabel, formatDateSafe, onApprove }: Props) {
    return (
        <div className="ap-section glass-panel">
            <div className="ap-section-header">
                <h3 className="ap-section-title">
                    <Users size={20} color="var(--ikusi-green)" />
                    Historial de Personas Asignadas
                    {assignmentHistory && assignmentHistory.length > 0 && (
                        <span className="count-badge">{assignmentHistory.length}</span>
                    )}
                </h3>
            </div>

            {loading ? (
                <div className="ap-empty"><LoadingState message="Cargando historial..." inline /></div>
            ) : !assignmentHistory || assignmentHistory.length === 0 ? (
                <p className="ap-empty">Este equipo no ha sido asignado a ningún colaborador.</p>
            ) : (
                <div className="assignment-history-list">
                    {assignmentHistory.map((a) => (
                        <div key={a.id} className="assignment-history-card">
                            <div className="assignment-person">
                                <div className="assignment-avatar">
                                    <User size={20} color="var(--ikusi-green)" />
                                </div>
                                <div className="assignment-person-info">
                                    <h4>{a.collaboratorName}</h4>
                                    {a.collaboratorEmail && (
                                        <p style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Mail size={12} /> {a.collaboratorEmail}
                                        </p>
                                    )}
                                    <div style={{ marginTop: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        <span className={`badge-ap ${
                                            a.status === 'ACCEPTED' ? 'badge-type-preventive'
                                            : a.status === 'RETURNED' ? 'badge-status-cancelled'
                                            : 'badge-status-scheduled'
                                        }`}>
                                            {assignmentStatusLabel(a.status)}
                                        </span>
                                        {a.assignmentType === 'LOAN' && (() => {
                                            const overdue = a.status === 'ACCEPTED' && a.expectedReturnDate && new Date(a.expectedReturnDate) < new Date();
                                            return (
                                                <span
                                                    className="badge-ap"
                                                    style={{
                                                        background: overdue ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                                        color: overdue ? '#dc2626' : '#ca8a04'
                                                    }}
                                                >
                                                    Préstamo{a.expectedReturnDate ? ` · ${overdue ? 'Vencido' : 'Vence'} ${formatDateSafe(a.expectedReturnDate)}` : ''}
                                                </span>
                                            );
                                        })()}
                                        {a.documentPath && (
                                            <a
                                                href={`${API_URL}${a.documentPath}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="maint-pdf-link"
                                                style={{ marginTop: 0 }}
                                            >
                                                <FileText size={12} /> Ver Acta
                                            </a>
                                        )}
                                        {a.status === 'RETURNED' && a.adminApproval && (
                                            <span
                                                className="badge-ap badge-type-preventive"
                                                title={`Aprobado por ${a.adminApproval.approvedBy}${a.adminApproval.note ? ` — ${a.adminApproval.note}` : ''}`}
                                            >
                                                ✔ Visto bueno TI
                                            </span>
                                        )}
                                        {canEdit && a.status === 'RETURNED' && !a.adminApproval && (
                                            <button
                                                className="btn-action"
                                                style={{ borderColor: '#f59e0b', color: '#f59e0b', fontSize: '11px', padding: '2px 10px' }}
                                                title="Aprobar la devolución y certificar que el colaborador no tiene cuentas pendientes con TI"
                                                onClick={() => onApprove(a.id)}
                                            >
                                                Dar Visto Bueno
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="assignment-dates">
                                <div className="assignment-date-row">
                                    <Calendar size={13} color="var(--ikusi-green)" />
                                    <span>Desde: <strong>{formatDateSafe(a.startDate)}</strong></span>
                                </div>
                                {a.endDate ? (
                                    <div className="assignment-date-row assignment-status-returned">
                                        <Clock size={13} />
                                        <span>Hasta: {formatDateSafe(a.endDate)}</span>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--ikusi-green)', fontWeight: 600 }}>
                                        <Hash size={11} /> Asignación vigente
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

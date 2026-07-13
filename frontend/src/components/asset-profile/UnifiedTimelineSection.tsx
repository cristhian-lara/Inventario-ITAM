import type { ReactNode } from 'react';
import { History, Wrench, ArrowRightLeft, Cpu } from 'lucide-react';
import LoadingState from '../LoadingState';

interface MaintenanceRecord {
    id: string;
    type: 'PREVENTIVE' | 'CORRECTIVE';
    status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    scheduledDate: string;
    executionDate?: string;
}

interface HardwareUpgrade {
    id: string;
    upgrade_date: string;
    component: string;
    old_value?: string;
    new_value: string;
}

interface AssignmentHistory {
    id: string;
    collaboratorName: string;
    status: string;
    startDate: string;
    endDate?: string;
}

interface Props {
    maintenances: MaintenanceRecord[] | undefined;
    upgrades: HardwareUpgrade[] | undefined;
    assignmentHistory: AssignmentHistory[] | undefined;
    loading: boolean;
    maintTypeLabel: (t: string) => string;
    maintStatusLabel: (s: string) => string;
    assignmentStatusLabel: (s: string) => string;
}

interface TimelineEvent {
    date: Date;
    icon: ReactNode;
    colorClass: string;
    title: string;
    subtitle?: string;
}

export default function UnifiedTimelineSection({ maintenances, upgrades, assignmentHistory, loading, maintTypeLabel, maintStatusLabel, assignmentStatusLabel }: Props) {
    const events: TimelineEvent[] = [];

    (maintenances || []).forEach(m => {
        const relevantDate = m.status === 'COMPLETED' && m.executionDate ? m.executionDate : m.scheduledDate;
        events.push({
            date: new Date(relevantDate),
            icon: <Wrench size={14} />,
            colorClass: 'timeline-icon-maintenance',
            title: `Mantenimiento ${maintTypeLabel(m.type)} — ${maintStatusLabel(m.status)}`,
            subtitle: m.status === 'COMPLETED' ? 'Ejecutado' : 'Programado'
        });
    });

    (upgrades || []).forEach(u => {
        events.push({
            date: new Date(u.upgrade_date),
            icon: <Cpu size={14} />,
            colorClass: 'timeline-icon-upgrade',
            title: `Actualización de hardware: ${u.component}`,
            subtitle: u.old_value ? `${u.old_value} → ${u.new_value}` : u.new_value
        });
    });

    (assignmentHistory || []).forEach(a => {
        events.push({
            date: new Date(a.startDate),
            icon: <ArrowRightLeft size={14} />,
            colorClass: 'timeline-icon-assignment',
            title: `Asignado a ${a.collaboratorName}`,
            subtitle: assignmentStatusLabel(a.status)
        });
        if (a.endDate) {
            events.push({
                date: new Date(a.endDate),
                icon: <ArrowRightLeft size={14} />,
                colorClass: 'timeline-icon-assignment-return',
                title: `Devuelto por ${a.collaboratorName}`
            });
        }
    });

    events.sort((a, b) => b.date.getTime() - a.date.getTime());

    return (
        <div className="ap-section glass-panel">
            <div className="ap-section-header">
                <h3 className="ap-section-title">
                    <History size={20} color="var(--ikusi-green)" />
                    Línea de Tiempo de Auditoría
                    {events.length > 0 && <span className="count-badge">{events.length}</span>}
                </h3>
            </div>

            {loading ? (
                <div className="ap-empty"><LoadingState message="Cargando línea de tiempo..." inline /></div>
            ) : events.length === 0 ? (
                <p className="ap-empty">No hay eventos registrados para este equipo.</p>
            ) : (
                <div className="unified-timeline">
                    {events.map((e, i) => (
                        <div key={i} className="unified-timeline-item">
                            <div className={`unified-timeline-dot ${e.colorClass}`}>{e.icon}</div>
                            <div className="unified-timeline-content">
                                <div className="unified-timeline-date">{e.date.toLocaleDateString('es-CO')}</div>
                                <div className="unified-timeline-title">{e.title}</div>
                                {e.subtitle && <div className="unified-timeline-subtitle">{e.subtitle}</div>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Bell, AlertTriangle, Clock, FileSignature } from 'lucide-react';
import { API_URL } from '../config';

interface NotificationItem {
    id: string;
    type: 'LOAN_DUE' | 'MAINTENANCE_DUE' | 'SIGNATURE_PENDING';
    severity: 'danger' | 'warning';
    title: string;
    subtitle: string;
    link: string;
}

interface NotificationSummary {
    counts: { total: number; loansDue: number; maintenancesDue: number; pendingSignatures: number };
    items: NotificationItem[];
}

const TYPE_ICON: Record<NotificationItem['type'], ReactNode> = {
    LOAN_DUE: <Clock size={16} />,
    MAINTENANCE_DUE: <AlertTriangle size={16} />,
    SIGNATURE_PENDING: <FileSignature size={16} />
};

export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const { data } = useQuery<NotificationSummary>({
        queryKey: ['notifications-summary'],
        queryFn: async () => {
            const res = await axios.get(`${API_URL}/api/notifications/summary`);
            return res.data;
        },
        refetchInterval: 60000,
        staleTime: 30000
    });

    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    const total = data?.counts.total || 0;

    return (
        <div className="notification-bell" ref={ref}>
            <button
                type="button"
                className="notification-bell-trigger"
                onClick={() => setOpen(v => !v)}
                aria-haspopup="true"
                aria-expanded={open}
                aria-label={`Notificaciones${total > 0 ? ` (${total} pendientes)` : ''}`}
            >
                <Bell size={20} />
                {total > 0 && <span className="notification-badge">{total > 9 ? '9+' : total}</span>}
            </button>

            {open && (
                <div className="notification-dropdown glass-panel">
                    <div className="notification-dropdown-header">
                        Notificaciones {total > 0 && <span className="notification-dropdown-count">{total}</span>}
                    </div>
                    {(!data || data.items.length === 0) ? (
                        <p className="notification-empty">No hay pendientes por ahora.</p>
                    ) : (
                        <div className="notification-list">
                            {data.items.map(item => (
                                <button
                                    key={item.id}
                                    className={`notification-item severity-${item.severity}`}
                                    onClick={() => { setOpen(false); navigate(item.link); }}
                                >
                                    <span className="notification-item-icon">{TYPE_ICON[item.type]}</span>
                                    <span className="notification-item-text">
                                        <span className="notification-item-title">{item.title}</span>
                                        <span className="notification-item-subtitle">{item.subtitle}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

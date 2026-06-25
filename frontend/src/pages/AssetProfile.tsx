import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
    ArrowLeft,
    Monitor,
    Wrench,
    CpuIcon,
    Users,
    Calendar,
    Clock,
    CheckCircle,
    AlertCircle,
    FileText,
    User,
    Mail,
    Tag,
    Hash,
    ArrowRight,
    Plus,
    ChevronRight,
    Activity
} from 'lucide-react';
import './AssetProfile.css';
import { API_URL } from '../config';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Asset {
    id: string;
    categoryId: number;
    serial?: string;
    status: string;
    dynamicAttributes?: Record<string, any>;
    purchaseDate?: string;
    warrantyMonths?: number;
    depreciationYears?: number;
}

interface Category {
    id: number;
    name: string;
    schemaDefinition?: any;
}

interface MaintenanceRecord {
    id: string;
    assetId: string;
    type: 'PREVENTIVE' | 'CORRECTIVE';
    status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    scheduledDate: string;
    executionDate?: string;
    reason?: string;
    notes?: string;
    collaboratorInTurnName?: string;
    pdfUrl?: string;
}

interface HardwareUpgrade {
    id: string;
    asset_id: string;
    upgrade_date: string;
    component: string;
    old_value?: string;
    new_value: string;
    performed_by?: string;
    notes?: string;
    created_at: string;
}

interface AssignmentHistory {
    id: string;
    assetId: string;
    collaboratorId: string;
    collaboratorName: string;
    collaboratorEmail: string;
    status: string;
    startDate: string;
    endDate?: string;
    documentPath?: string;
}

// ─── Helper Functions ────────────────────────────────────────────────────────

const statusLabel = (s: string) => {
    const map: Record<string, string> = {
        AVAILABLE: 'Disponible',
        IN_USE: 'En Uso',
        IN_MAINTENANCE: 'En Mantenimiento',
        RETIRED: 'Retirado',
        LOST: 'Perdido',
    };
    return map[s] || s;
};

const statusClass = (s: string) => {
    const map: Record<string, string> = {
        AVAILABLE: 'badge-available',
        IN_USE: 'badge-in_use',
        IN_MAINTENANCE: 'badge-in_maintenance',
        RETIRED: 'badge-retired',
        LOST: 'badge-lost',
    };
    return map[s] || '';
};

const maintTypeLabel = (t: string) => t === 'PREVENTIVE' ? 'Preventivo' : 'Correctivo';
const maintStatusLabel = (s: string) => {
    const map: Record<string, string> = {
        SCHEDULED: 'Programado',
        IN_PROGRESS: 'En Progreso',
        COMPLETED: 'Completado',
        CANCELLED: 'Cancelado',
    };
    return map[s] || s;
};

const assignmentStatusLabel = (s: string) => {
    const map: Record<string, string> = {
        ACCEPTED: 'Activo',
        RETURNED: 'Devuelto',
        PENDING_ACCEPTANCE: 'Pend. de Firma',
        PENDING_RETURN: 'Pend. de Devolución',
    };
    return map[s] || s;
};

const COMPONENT_OPTIONS = [
    'RAM',
    'Disco Duro',
    'Procesador',
    'Pantalla',
    'Batería',
    'Tarjeta de Red',
    'Tarjeta Gráfica',
    'Teclado',
    'Fuente de Poder',
    'Otro'
];

// Mapa de componente → posibles claves en dynamicAttributes (case-insensitive fallback)
const COMPONENT_TO_ATTR_KEYS: Record<string, string[]> = {
    'RAM':              ['MEMORIA RAM', 'Memoria RAM', 'RAM', 'Memoria', 'memoria', 'ram'],
    'Disco Duro':       ['Disco Duro', 'DISCO DURO', 'Disco', 'disco', 'Storage', 'Almacenamiento', 'SSD', 'HDD'],
    'Procesador':       ['Procesador', 'PROCESADOR', 'CPU', 'cpu', 'Processor'],
    'Pantalla':         ['Pantalla', 'PANTALLA', 'Monitor', 'Display', 'Resolución'],
    'Batería':          ['Batería', 'BATERIA', 'Battery', 'Bateria'],
    'Tarjeta de Red':   ['Tarjeta de Red', 'MAC', 'MAC Address', 'Red', 'Network'],
    'Tarjeta Gráfica':  ['Tarjeta Gráfica', 'GPU', 'gpu', 'Graphics'],
    'Teclado':          ['Teclado', 'TECLADO', 'Keyboard'],
    'Fuente de Poder':  ['Fuente de Poder', 'Fuente', 'PSU', 'Power'],
};

/** Busca el valor actual de un componente en los dynamicAttributes del activo */
const getCurrentSpecValue = (component: string, attrs: Record<string, any>): string => {
    const keys = COMPONENT_TO_ATTR_KEYS[component] || [];
    for (const key of keys) {
        if (attrs[key] !== undefined && attrs[key] !== null && attrs[key] !== '') {
            return String(attrs[key]);
        }
    }
    // Fallback: búsqueda case-insensitive
    const lowerComp = component.toLowerCase();
    for (const [k, v] of Object.entries(attrs)) {
        if (k.toLowerCase().includes(lowerComp) && v !== undefined && v !== null && v !== '') {
            return String(v);
        }
    }
    return '';
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AssetProfile() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [showDepreciationModal, setShowDepreciationModal] = useState(false);
    const [upgradeForm, setUpgradeForm] = useState({
        component: '',
        old_value: '',
        new_value: '',
        upgrade_date: new Date().toISOString().split('T')[0],
        performed_by: '',
        notes: ''
    });

    // ── Queries ──────────────────────────────────────────────────────────────

    const { data: asset, isLoading: loadingAsset } = useQuery<Asset>({
        queryKey: ['asset', id],
        queryFn: async () => {
            const res = await axios.get(`${API_URL}/api/catalog/assets`);
            const found = res.data.find((a: Asset) => a.id === id);
            if (!found) throw new Error('Activo no encontrado');
            return found;
        }
    });

    const { data: categories } = useQuery<Category[]>({
        queryKey: ['categories'],
        queryFn: async () => {
            const res = await axios.get(`${API_URL}/api/catalog/categories`);
            return res.data;
        }
    });

    const { data: maintenances, isLoading: loadingMaint } = useQuery<MaintenanceRecord[]>({
        queryKey: ['asset-maintenances', id],
        queryFn: async () => {
            const res = await axios.get(`${API_URL}/api/maintenances/asset/${id}`);
            return res.data;
        },
        enabled: !!id
    });

    const { data: upgrades, isLoading: loadingUpgrades } = useQuery<HardwareUpgrade[]>({
        queryKey: ['asset-upgrades', id],
        queryFn: async () => {
            const res = await axios.get(`${API_URL}/api/catalog/assets/${id}/upgrades`);
            return res.data;
        },
        enabled: !!id
    });

    const { data: assignmentHistory, isLoading: loadingHistory } = useQuery<AssignmentHistory[]>({
        queryKey: ['asset-assignment-history', id],
        queryFn: async () => {
            const res = await axios.get(`${API_URL}/api/assignments/asset/${id}/history`);
            return res.data;
        },
        enabled: !!id
    });

    // ── Mutations ────────────────────────────────────────────────────────────

    const createUpgrade = useMutation({
        mutationFn: async (data: typeof upgradeForm) => {
            await axios.post(`${API_URL}/api/catalog/assets/${id}/upgrades`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['asset-upgrades', id] });
            queryClient.invalidateQueries({ queryKey: ['asset', id] });
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            setShowUpgradeModal(false);
            setUpgradeForm({
                component: '',
                old_value: '',
                new_value: '',
                upgrade_date: new Date().toISOString().split('T')[0],
                performed_by: '',
                notes: ''
            });
        }
    });

    // ── Derived ──────────────────────────────────────────────────────────────

    const category = categories?.find(c => c.id === asset?.categoryId);
    const specs = asset?.dynamicAttributes || {};
    const redundantKeys = ['PRECIO', 'COMPRA', 'WARRANTY', 'GARANT', 'DEPRECIACI'];
    const specEntries = Object.entries(specs).filter(([k, v]) => {
        if (v === null || v === undefined || v === '') return false;
        const upperK = k.toUpperCase();
        return !redundantKeys.some(rk => upperK.includes(rk));
    });

    // ── Loading ──────────────────────────────────────────────────────────────

    if (loadingAsset) {
        return (
            <div className="ap-loading">
                <div className="ap-spinner" />
                <p>Cargando Hoja de Vida del Equipo...</p>
            </div>
        );
    }

    if (!asset) {
        return (
            <div className="ap-loading">
                <AlertCircle size={40} color="var(--accent-red)" />
                <p>No se encontró el activo con ID: <strong>{id}</strong></p>
                <button className="btn-back" onClick={() => navigate(-1)}>
                    <ArrowLeft size={18} /> Volver al Catálogo
                </button>
            </div>
        );
    }

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="asset-profile-container">

            {/* ── Header ── */}
            <div className="asset-profile-header">
                <div className="asset-profile-header-left">
                    <button className="btn-back" onClick={() => navigate(-1)}>
                        <ArrowLeft size={20} /> Volver
                    </button>
                    <div style={{ height: '24px', width: '1px', background: 'var(--border-subtle)' }} />
                    <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                        Hoja de Vida del Equipo
                    </span>
                    <ChevronRight size={16} color="var(--text-muted)" />
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-main)' }}>
                        {asset.id}
                    </span>
                </div>
            </div>

            {/* ── Main Grid ── */}
            <div className="asset-profile-grid">

                {/* ─────────────── LEFT: Asset Card ─────────────── */}
                <div className="asset-side-card glass-panel">
                    <div className="asset-icon-wrapper">
                        <Monitor size={48} color="var(--ikusi-green)" />
                    </div>

                    <h2 className="asset-profile-id">{asset.id}</h2>

                    {asset.serial && (
                        <div className="asset-profile-serial">S/N: {asset.serial}</div>
                    )}

                    <span className={`badge ${statusClass(asset.status)}`} style={{ marginBottom: '4px' }}>
                        {statusLabel(asset.status)}
                    </span>

                    <div className="asset-side-details">
                        <div className="asset-detail-item">
                            <Tag size={16} color="var(--ikusi-green)" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div className="asset-detail-block">
                                <span className="detail-label">Categoría</span>
                                <span className="detail-value">{category?.name || `Cat. ${asset.categoryId}`}</span>
                            </div>
                        </div>

                        {asset.purchaseDate && (
                            <div className="asset-detail-item">
                                <Calendar size={16} color="var(--ikusi-green)" style={{ flexShrink: 0, marginTop: '2px' }} />
                                <div className="asset-detail-block">
                                    <span className="detail-label">Fecha de Compra</span>
                                    <span className="detail-value">{(() => {
                                        const [y, m, d] = asset.purchaseDate!.toString().split('T')[0].split('-');
                                        return `${parseInt(d, 10)}/${parseInt(m, 10)}/${y}`;
                                    })()}</span>
                                </div>
                            </div>
                        )}

                        {asset.warrantyMonths && (
                            <div className="asset-detail-item">
                                <CheckCircle size={16} color="var(--ikusi-green)" style={{ flexShrink: 0, marginTop: '2px' }} />
                                <div className="asset-detail-block">
                                    <span className="detail-label">Garantía</span>
                                    <span className="detail-value">{asset.warrantyMonths} meses</span>
                                </div>
                            </div>
                        )}

                        {asset.purchasePrice && (
                            <div className="asset-detail-item">
                                <Tag size={16} color="var(--ikusi-green)" style={{ flexShrink: 0, marginTop: '2px' }} />
                                <div className="asset-detail-block">
                                    <span className="detail-label">Valor de Compra</span>
                                    <span className="detail-value">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(asset.purchasePrice)}</span>
                                </div>
                            </div>
                        )}

                        {asset.depreciationYears && (
                            <div className="asset-detail-item">
                                <Activity size={16} color="var(--ikusi-green)" style={{ flexShrink: 0, marginTop: '2px' }} />
                                <div className="asset-detail-block">
                                    <span className="detail-label">Depreciación</span>
                                    <span className="detail-value">{asset.depreciationYears} años</span>
                                </div>
                            </div>
                        )}

                        {/* Stats de auditoría */}
                        <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center' }}>
                            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 4px' }}>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ikusi-green)' }}>
                                    {maintenances?.length ?? '—'}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '2px' }}>
                                    Mantenimientos
                                </div>
                            </div>
                            <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '10px 4px' }}>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: '#7c3aed' }}>
                                    {upgrades?.length ?? '—'}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '2px' }}>
                                    Upgrades
                                </div>
                            </div>
                            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px 4px' }}>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: '#1d4ed8' }}>
                                    {assignmentHistory?.length ?? '—'}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '2px' }}>
                                    Asignados
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─────────────── RIGHT: Tabs Content ─────────────── */}
                <div className="asset-profile-content">

                    {/* ── 1. Especificaciones Actuales ── */}
                    {specEntries.length > 0 && (
                        <div className="ap-section glass-panel">
                            <div className="ap-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 className="ap-section-title">
                                    <CpuIcon size={20} color="var(--ikusi-green)" />
                                    Especificaciones Actuales
                                </h3>
                                <button 
                                    className="btn-glass" 
                                    style={{ fontSize: '13px', padding: '6px 12px' }}
                                    onClick={() => setShowDepreciationModal(true)}
                                >
                                    <Activity size={14} /> Calcular Depreciación
                                </button>
                            </div>
                            <div className="specs-grid">
                                {specEntries.map(([key, value]) => (
                                    <div key={key} className="spec-chip">
                                        <span className="spec-chip-label">{key}</span>
                                        <span className="spec-chip-value">{String(value)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── 2. Historial de Mantenimientos ── */}
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

                        {loadingMaint ? (
                            <div className="ap-empty">Cargando mantenimientos...</div>
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

                                            {/* Notes removed to keep timeline clean */}

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

                    {/* ── 3. Actualizaciones de Hardware ── */}
                    <div className="ap-section glass-panel">
                        <div className="ap-section-header">
                            <h3 className="ap-section-title">
                                <CpuIcon size={20} color="var(--ikusi-green)" />
                                Actualizaciones de Hardware
                                {upgrades && upgrades.length > 0 && (
                                    <span className="count-badge">{upgrades.length}</span>
                                )}
                            </h3>
                            <button
                                className="btn-primary"
                                style={{ padding: '8px 14px', fontSize: '13px' }}
                                onClick={() => setShowUpgradeModal(true)}
                            >
                                <Plus size={15} />
                                Registrar Upgrade
                            </button>
                        </div>

                        {loadingUpgrades ? (
                            <div className="ap-empty">Cargando upgrades...</div>
                        ) : !upgrades || upgrades.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                <p className="ap-empty">No hay actualizaciones de hardware registradas.</p>
                                <button
                                    className="btn-glass"
                                    style={{ marginTop: '12px', fontSize: '13px', padding: '8px 16px' }}
                                    onClick={() => setShowUpgradeModal(true)}
                                >
                                    <Plus size={14} /> Registrar el primer upgrade
                                </button>
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

                    {/* ── 4. Historial de Asignaciones ── */}
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

                        {loadingHistory ? (
                            <div className="ap-empty">Cargando historial...</div>
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
                                                </div>
                                            </div>
                                        </div>

                                        <div className="assignment-dates">
                                            <div className="assignment-date-row">
                                                <Calendar size={13} color="var(--ikusi-green)" />
                                                <span>Desde: <strong>{new Date(a.startDate).toLocaleDateString('es-CO')}</strong></span>
                                            </div>
                                            {a.endDate ? (
                                                <div className="assignment-date-row assignment-status-returned">
                                                    <Clock size={13} />
                                                    <span>Hasta: {new Date(a.endDate).toLocaleDateString('es-CO')}</span>
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

                </div>
            </div>

            {/* ─── Modal: Registrar Upgrade de Hardware ─── */}
            {showUpgradeModal && (
                <div className="ap-modal-overlay" onClick={() => setShowUpgradeModal(false)}>
                    <div className="ap-modal glass-panel" onClick={e => e.stopPropagation()}>
                        <button className="ap-modal-close" onClick={() => setShowUpgradeModal(false)}>✕</button>
                        <h3 className="ap-modal-title">
                            <CpuIcon size={20} color="var(--ikusi-green)" />
                            Registrar Actualización de Hardware
                        </h3>

                        <div className="ap-form-row">
                            <div className="ap-form-group">
                                <label>Componente *</label>
                                <select
                                    className="glass-input"
                                    value={upgradeForm.component}
                                    onChange={e => {
                                        const selected = e.target.value;
                                        const currentVal = selected ? getCurrentSpecValue(selected, specs) : '';
                                        setUpgradeForm(f => ({ ...f, component: selected, old_value: currentVal }));
                                    }}
                                >
                                    <option value="">Seleccionar...</option>
                                    {COMPONENT_OPTIONS.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="ap-form-group">
                                <label>Fecha del Upgrade *</label>
                                <input
                                    type="date"
                                    className="glass-input"
                                    value={upgradeForm.upgrade_date}
                                    onChange={e => setUpgradeForm(f => ({ ...f, upgrade_date: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="ap-form-row">
                            <div className="ap-form-group">
                                <label>
                                    Valor Anterior
                                    {upgradeForm.old_value && (
                                        <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--ikusi-green)', fontWeight: 600 }}>
                                            ✓ Tomado de especificaciones actuales
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="text"
                                    className="glass-input"
                                    placeholder="Sin especificación registrada"
                                    value={upgradeForm.old_value}
                                    readOnly={!!getCurrentSpecValue(upgradeForm.component, specs)}
                                    style={getCurrentSpecValue(upgradeForm.component, specs) ? {
                                        background: 'rgba(0,166,80,0.06)',
                                        borderColor: 'rgba(0,166,80,0.3)',
                                        color: 'var(--text-secondary)',
                                        cursor: 'not-allowed'
                                    } : {}}
                                    onChange={e => setUpgradeForm(f => ({ ...f, old_value: e.target.value }))}
                                />
                            </div>
                            <div className="ap-form-group">
                                <label>Nuevo Valor *</label>
                                <input
                                    type="text"
                                    className="glass-input"
                                    placeholder="ej. 16 GB DDR4"
                                    value={upgradeForm.new_value}
                                    onChange={e => setUpgradeForm(f => ({ ...f, new_value: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="ap-form-group">
                            <label>Técnico Responsable</label>
                            <input
                                type="text"
                                className="glass-input"
                                placeholder="Nombre del técnico que realizó el cambio"
                                value={upgradeForm.performed_by}
                                onChange={e => setUpgradeForm(f => ({ ...f, performed_by: e.target.value }))}
                            />
                        </div>

                        <div className="ap-form-group">
                            <label>Notas adicionales</label>
                            <textarea
                                className="glass-input"
                                rows={3}
                                placeholder="Observaciones sobre el upgrade..."
                                value={upgradeForm.notes}
                                onChange={e => setUpgradeForm(f => ({ ...f, notes: e.target.value }))}
                                style={{ resize: 'vertical' }}
                            />
                        </div>

                        <div className="ap-modal-footer">
                            <button className="btn-glass" onClick={() => setShowUpgradeModal(false)}>
                                Cancelar
                            </button>
                            <button
                                className="btn-primary"
                                disabled={!upgradeForm.component || !upgradeForm.new_value || !upgradeForm.upgrade_date || createUpgrade.isPending}
                                onClick={() => createUpgrade.mutate(upgradeForm)}
                            >
                                {createUpgrade.isPending ? 'Guardando...' : 'Registrar Upgrade'}
                            </button>
                        </div>

                        {createUpgrade.isError && (
                            <p style={{ color: 'var(--accent-red)', marginTop: '12px', fontSize: '13px' }}>
                                Error al guardar. Intenta nuevamente.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* ── Depreciation Modal ── */}
            {showDepreciationModal && (() => {
                let precio = asset?.purchasePrice || 0;
                if (precio === 0) {
                    let pKey = Object.keys(specs).find(k => k.toUpperCase().includes('PRECIO'));
                    if (pKey && specs[pKey]) {
                        precio = parseFloat(String(specs[pKey]).replace(/[^0-9.-]+/g, ''));
                    }
                }
                
                let anos = asset?.depreciationYears || 0;
                if (anos === 0) {
                    let aKey = Object.keys(specs).find(k => k.toUpperCase().includes('DEPRECIACI'));
                    if (aKey && specs[aKey]) {
                        anos = parseFloat(String(specs[aKey]).replace(/[^0-9.-]+/g, ''));
                    }
                }
                
                let fechaCompra = asset?.purchaseDate;
                if (!fechaCompra) {
                    let fKey = Object.keys(specs).find(k => k.toUpperCase().includes('FECHA DE COMPRA'));
                    if (fKey && specs[fKey]) {
                        fechaCompra = specs[fKey];
                    }
                }

                let content = null;
                if (!precio || !anos || !fechaCompra) {
                    content = (
                        <div style={{ textAlign: 'center', padding: '20px' }}>
                            <AlertCircle size={40} color="var(--accent-red)" style={{ marginBottom: '10px' }} />
                            <p style={{ color: 'var(--text-secondary)' }}>Faltan datos en el activo para calcular la depreciación.</p>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Se requiere: Precio de Compra, Fecha de Compra y Años de Depreciación.</p>
                        </div>
                    );
                } else {
                    const dateCompra = new Date(`${fechaCompra.toString().split('T')[0]}T12:00:00`);
                    const diffTime = new Date().getTime() - dateCompra.getTime();
                    const elapsedYears = diffTime > 0 ? diffTime / (1000 * 60 * 60 * 24 * 365.25) : 0;
                    
                    const depAnual = precio / anos;
                    const depAcumulada = Math.min(precio, depAnual * elapsedYears);
                    const valorActual = Math.max(0, precio - depAcumulada);
                    
                    const formatCurrency = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(val);

                    content = (
                        <div style={{ padding: '10px 0' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Precio de Compra</div>
                                    <div style={{ fontSize: '16px', fontWeight: 600 }}>{formatCurrency(precio)}</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tiempo Transcurrido</div>
                                    <div style={{ fontSize: '16px', fontWeight: 600 }}>{elapsedYears.toFixed(1)} años</div>
                                </div>
                            </div>
                            
                            <div style={{ marginBottom: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #e2e8f0' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Años de vida útil:</span>
                                    <span style={{ fontWeight: 600 }}>{anos} años</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #e2e8f0' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Depreciación anual (línea recta):</span>
                                    <span style={{ fontWeight: 600, color: 'var(--accent-red)' }}>-{formatCurrency(depAnual)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #e2e8f0' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Depreciación acumulada:</span>
                                    <span style={{ fontWeight: 600, color: 'var(--accent-red)' }}>-{formatCurrency(depAcumulada)}</span>
                                </div>
                            </div>

                            <div style={{ background: 'var(--ikusi-green)', color: 'white', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '14px', fontWeight: 600 }}>Valor Actual Estimado</span>
                                <span style={{ fontSize: '20px', fontWeight: 700 }}>{formatCurrency(valorActual)}</span>
                            </div>
                        </div>
                    );
                }

                return (
                    <div className="ap-modal-overlay">
                        <div className="ap-modal glass-panel" style={{ maxWidth: '450px' }}>
                            <div className="ap-modal-header">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Activity size={20} color="var(--ikusi-green)" />
                                    Cálculo de Depreciación
                                </h3>
                                <button className="ap-modal-close" onClick={() => setShowDepreciationModal(false)}>×</button>
                            </div>
                            <div className="ap-modal-body">
                                {content}
                            </div>
                            <div className="ap-modal-footer">
                                <button className="btn-primary" onClick={() => setShowDepreciationModal(false)} style={{ width: '100%' }}>
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}

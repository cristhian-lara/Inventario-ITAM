import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useConfirm } from '../context/ConfirmContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { ArrowLeft, CpuIcon, AlertCircle, ChevronRight, Activity } from 'lucide-react';
import './AssetProfile.css';
import { API_URL } from '../config';
import { usePermission } from '../context/AuthContext';
import AssetSideCard from '../components/asset-profile/AssetSideCard';
import MaintenanceTimelineSection from '../components/asset-profile/MaintenanceTimelineSection';
import HardwareUpgradesSection from '../components/asset-profile/HardwareUpgradesSection';
import AssignmentHistorySection from '../components/asset-profile/AssignmentHistorySection';
import ApprovalModal from '../components/asset-profile/ApprovalModal';
import UpgradeFormModal from '../components/asset-profile/UpgradeFormModal';
import DepreciationModal from '../components/asset-profile/DepreciationModal';

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
    purchasePrice?: number;
    vendorName?: string;
    internalBuyer?: string;
    disposal?: {
        reason: string;
        disposalDate: string;
        authorizedBy: string;
        blanccoReportId?: string;
        notes?: string;
    };
}

// Formatea fechas evitando el corrimiento de un día: si el valor es tipo
// 'YYYY-MM-DD' (sin hora), new Date() lo interpreta como medianoche UTC,
// que en Bogotá (UTC-5) cae en el día anterior.
const formatDateSafe = (value: string): string => {
    const datePart = value.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart) && !value.includes('T')) {
        const [y, m, d] = datePart.split('-');
        return `${d}/${m}/${y}`;
    }
    return new Date(value).toLocaleDateString('es-CO');
};

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
    assignmentType?: 'PERMANENT' | 'LOAN';
    expectedReturnDate?: string | null;
    lastAlertSentAt?: string | null;
    startDate: string;
    endDate?: string;
    documentPath?: string;
    adminApproval?: {
        approvedBy: string;
        approvedAt: string;
        note?: string;
    } | null;
}

// ─── Helper Functions ────────────────────────────────────────────────────────

const statusLabel = (s: string) => {
    const map: Record<string, string> = {
        AVAILABLE: 'Disponible',
        IN_USE: 'En Uso',
        IN_MAINTENANCE: 'En Mantenimiento',
        PENDING_INSPECTION: 'Pendiente Visto Bueno',
        RETIRED: 'Baja',
        LOST: 'Perdido',
    };
    return map[s] || s;
};

const statusClass = (s: string) => {
    const map: Record<string, string> = {
        AVAILABLE: 'badge-available',
        IN_USE: 'badge-in_use',
        IN_MAINTENANCE: 'badge-in_maintenance',
        PENDING_INSPECTION: 'badge-pending_inspection',
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
    // Permisos RBAC del módulo Equipos
    const assetPerms = usePermission('assets');
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { confirm } = useConfirm();

    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [showDepreciationModal, setShowDepreciationModal] = useState(false);
    // Visto bueno de devolución: id de la asignación a aprobar + nota del administrador
    const [approvalTarget, setApprovalTarget] = useState<string | null>(null);
    const [approvalNote, setApprovalNote] = useState('');
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

    const approveReturnMutation = useMutation({
        mutationFn: async ({ assignmentId, note }: { assignmentId: string; note: string }) => {
            const response = await axios.post(`${API_URL}/api/assignments/${assignmentId}/approve-return`, { note });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['asset-assignment-history', id] });
            queryClient.invalidateQueries({ queryKey: ['asset', id] });
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            setApprovalTarget(null);
            setApprovalNote('');
            confirm({ title: 'Visto Bueno Registrado', message: 'La devolución fue aprobada: el activo quedó Disponible y el acta se actualizó con el visto bueno de TI.', type: 'success', confirmText: 'Entendido', hideCancel: true, onConfirm: () => {} });
        },
        onError: (err: any) => {
            confirm({ title: 'Error', message: err.response?.data?.error || err.message, type: 'danger', confirmText: 'Entendido', hideCancel: true, onConfirm: () => {} });
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
                <AssetSideCard
                    asset={asset}
                    category={category}
                    specs={specs}
                    statusLabel={statusLabel}
                    statusClass={statusClass}
                    formatDateSafe={formatDateSafe}
                    maintenancesCount={maintenances?.length}
                    upgradesCount={upgrades?.length}
                    assignmentHistoryCount={assignmentHistory?.length}
                />

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

                    <MaintenanceTimelineSection
                        maintenances={maintenances}
                        loading={loadingMaint}
                        maintTypeLabel={maintTypeLabel}
                        maintStatusLabel={maintStatusLabel}
                    />

                    <HardwareUpgradesSection
                        upgrades={upgrades}
                        loading={loadingUpgrades}
                        canEdit={assetPerms.edit}
                        onOpenUpgradeModal={() => setShowUpgradeModal(true)}
                    />

                    <AssignmentHistorySection
                        assignmentHistory={assignmentHistory}
                        loading={loadingHistory}
                        canEdit={assetPerms.edit}
                        assignmentStatusLabel={assignmentStatusLabel}
                        formatDateSafe={formatDateSafe}
                        onApprove={(assignmentId) => { setApprovalTarget(assignmentId); setApprovalNote(''); }}
                    />

                </div>
            </div>

            {approvalTarget && (
                <ApprovalModal
                    note={approvalNote}
                    setNote={setApprovalNote}
                    onClose={() => setApprovalTarget(null)}
                    onSubmit={() => approveReturnMutation.mutate({ assignmentId: approvalTarget, note: approvalNote })}
                    isPending={approveReturnMutation.isPending}
                />
            )}

            {showUpgradeModal && (
                <UpgradeFormModal
                    form={upgradeForm}
                    setForm={setUpgradeForm}
                    componentOptions={COMPONENT_OPTIONS}
                    getCurrentSpecValue={getCurrentSpecValue}
                    specs={specs}
                    onClose={() => setShowUpgradeModal(false)}
                    onSubmit={() => createUpgrade.mutate(upgradeForm)}
                    isPending={createUpgrade.isPending}
                    isError={createUpgrade.isError}
                />
            )}

            {showDepreciationModal && (
                <DepreciationModal
                    asset={asset}
                    specs={specs}
                    onClose={() => setShowDepreciationModal(false)}
                />
            )}
        </div>
    );
}

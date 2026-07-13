import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Wrench, CheckCircle, AlertTriangle, Calendar, Plus, Clock, X, Mail, Edit3, Search, Server, Bell } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { Link } from 'react-router-dom';
import ActionMenu from '../components/ActionMenu';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import { usePermission } from '../context/AuthContext';
import { showWebexFailureModal } from '../utils/notificationNotice';
import { authHeaders } from '../utils/authHeaders';
import './Maintenances.css';
import { API_URL } from '../config';

interface MaintenanceRecord {
  id: string;
  assetId: string;
  type: 'PREVENTIVE' | 'CORRECTIVE';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  scheduledDate: string;
  executionDate?: string;
  reason?: string;
  startNote?: string;
  startedAt?: string;
  notes?: string;
  collaboratorInTurnId?: string;
  collaboratorInTurnName?: string;
  signedAt?: string;
  signatureToken?: string;
  pdfUrl?: string;
}

const TYPE_LABELS: Record<string, string> = {
  PREVENTIVE: 'Preventivo',
  CORRECTIVE: 'Correctivo',
};
const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Programado',
  IN_PROGRESS: 'En Progreso',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
};

// Para completados, la fecha que importa para ubicarlos en el tiempo es la de ejecución real
// (puede ser muy distinta de la programada cuando se carga historial retroactivo), no la programada.
const getRelevantDate = (m: MaintenanceRecord): string | undefined =>
  (m.status === 'COMPLETED' && m.executionDate) ? m.executionDate : m.scheduledDate;

const Maintenances: React.FC = () => {
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'general' | 'auditoria' | 'balance' | 'preventive'>('general');
  const [coverageFilter, setCoverageFilter] = useState<'all' | 'completed' | 'scheduled' | 'pending'>('all');
  const { confirm } = useConfirm();
  const toast = useToast();
  // Permisos RBAC del módulo Mantenimientos: crear = programar; editar = ejecutar acciones de estado
  const maintPerms = usePermission('maintenances');
  const canCreate = maintPerms.create;
  const isAdmin = maintPerms.edit;

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'start' | 'complete' | 'view' | 'forceSign'>('create');
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    assetId: '',
    type: 'PREVENTIVE',
    scheduledDate: new Date().toISOString().split('T')[0],
    reason: '',
    startNote: '',
    notes: '',
    executionDate: new Date().toISOString().split('T')[0],
    realStartDate: '',
    realEndDate: ''
  });

  const { data: maintenances, isLoading } = useQuery<MaintenanceRecord[]>({
    queryKey: ['maintenances'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/maintenances`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Error cargando mantenimientos');
      return res.json();
    }
  });

  const availableYears = React.useMemo(() => {
    if (!maintenances) return [];
    const years = new Set(maintenances.map(m => new Date(getRelevantDate(m) || m.scheduledDate).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [maintenances]);

  const { data: assets } = useQuery<any[]>({
    queryKey: ['assets_list'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/catalog/assets`, { headers: authHeaders() });
      if (!res.ok) return [];
      return res.json();
    }
  });

  const { data: categories } = useQuery<any[]>({ queryKey: ['categories'], queryFn: async () => { const res = await fetch(`${API_URL}/api/catalog/categories`, { headers: authHeaders() }); if (!res.ok) return []; return res.json(); } });

  const { data: assignments } = useQuery<any[]>({
    queryKey: ['assignments'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/assignments`, { headers: authHeaders() });
      if (!res.ok) return [];
      return res.json();
    }
  });

  const { data: collaborators } = useQuery<any[]>({
    queryKey: ['collaborators'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/collaborators`, { headers: authHeaders() });
      if (!res.ok) return [];
      return res.json();
    }
  });

  const getCollaboratorForAsset = (assetId: string) => {
    const assignment = assignments?.find(a => a.assetId === assetId && ['ACCEPTED', 'PENDING_ACCEPTANCE', 'PENDING_RETURN'].includes(a.status));
    if (assignment) {
      const coll = collaborators?.find(c => c.id === assignment.collaboratorId);
      if (coll) return coll.name;
    }
    return 'Sin asignar';
  };

  const [assetSearchTerm, setAssetSearchTerm] = useState('');
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`${API_URL}/api/maintenances`, {
        method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(data)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || 'Error al programar mantenimiento');
      }
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['maintenances'] }); setShowModal(false); },
    onError: (error: Error) => { setErrorMsg(error.message); }
  });

  const startMutation = useMutation({
    mutationFn: async (data: { id: string, startNote: string }) => {
      const res = await fetch(`${API_URL}/api/maintenances/${data.id}/start`, {
        method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ startNote: data.startNote })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || 'Error al iniciar');
      }
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['maintenances'] }); setShowModal(false); },
    onError: (error: Error) => { setErrorMsg(error.message); }
  });

  const completeMutation = useMutation({
    mutationFn: async (data: { id: string, notes: string, realStartDate?: string, realEndDate?: string }) => {
      const res = await fetch(`${API_URL}/api/maintenances/${data.id}/complete`, {
        method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ notes: data.notes, realStartDate: data.realStartDate || undefined, realEndDate: data.realEndDate || undefined })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || 'Error al completar');
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      setShowModal(false);
      if (data?.autoSigned) {
        toast.success('El activo no tenía colaborador asignado: el acta de mantenimiento se generó y firmó automáticamente (firma forzada por el sistema).', 5000);
      } else {
        // notificationSent === null → no había colaborador en turno que notificar
        showWebexFailureModal(confirm, data);
      }
    },
    onError: (error: Error) => { setErrorMsg(error.message); }
  });

  const requestSignatureMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_URL}/api/maintenances/${id}/request-signature`, {
        method: 'POST', headers: authHeaders()
      });
      if (!res.ok) {
        const error = await res.json().catch(()=>({}));
        throw new Error(error.error || 'Error al solicitar firma');
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      if (!showWebexFailureModal(confirm, data)) {
        toast.success(data?.message || 'Firma solicitada correctamente. Se envió la notificación por Webex al colaborador.', 4000);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message, 4000);
    }
  });

  const notifyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_URL}/api/maintenances/${id}/notify`, {
        method: 'POST', headers: authHeaders()
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al enviar el recordatorio');
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      if (!showWebexFailureModal(confirm, data)) {
        toast.success(data?.message || 'Recordatorio de mantenimiento enviado por Webex.', 4000);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message, 4000);
    }
  });

  const forceSignMutation = useMutation({
    mutationFn: async (data: { id: string, reason: string }) => {
      const res = await fetch(`${API_URL}/api/maintenances/${data.id}/force-sign`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ reason: data.reason })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || 'Error al forzar firma');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      setShowModal(false);
      toast.success('Mantenimiento firmado forzadamente con éxito', 3000);
    },
    onError: (error: Error) => { setErrorMsg(error.message); }
  });

  if (isLoading) return <div style={{ padding: '40px', color: 'var(--text-main)' }}>Cargando módulo de mantenimientos...</div>;

  const now = new Date();
  const getTargetMidnight = (d: string | Date) => {
    const dateStr = d instanceof Date ? d.toISOString() : String(d);
    const [year, month, day] = dateStr.split('T')[0].split('-');
    return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
  };
  const nowNorm = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const timeFilteredMaintenances = maintenances?.filter(m => {
    if (filterYear !== 'all' || filterMonth !== 'all') {
      const relevantDate = getRelevantDate(m);
      if (!relevantDate) return false;
      const date = new Date(relevantDate);
      if (filterYear !== 'all' && date.getFullYear().toString() !== filterYear) return false;
      if (filterMonth !== 'all' && (date.getMonth() + 1).toString() !== filterMonth) return false;
    }
    return true;
  });

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalCount = timeFilteredMaintenances?.length || 0;
  const totalScheduled = timeFilteredMaintenances?.filter(m => m.status === 'SCHEDULED').length || 0;
  const totalInProgress = timeFilteredMaintenances?.filter(m => m.status === 'IN_PROGRESS').length || 0;
  const totalCompleted = timeFilteredMaintenances?.filter(m => m?.status === 'COMPLETED').length || 0;
  const overdue = timeFilteredMaintenances?.filter(m => m.status === 'SCHEDULED' && getTargetMidnight(m.scheduledDate) < nowNorm).length || 0;
  const preventiveCount = timeFilteredMaintenances?.filter(m => m?.type === 'PREVENTIVE').length || 0;
  const correctiveCount = timeFilteredMaintenances?.filter(m => m.type === 'CORRECTIVE').length || 0;
  const correctiveRatio = timeFilteredMaintenances && timeFilteredMaintenances.length > 0
    ? Math.round((correctiveCount / timeFilteredMaintenances.length) * 100) : 0;
  const preventiveRatio = timeFilteredMaintenances && timeFilteredMaintenances.length > 0
    ? Math.round((preventiveCount / timeFilteredMaintenances.length) * 100) : 0;

  // ── Charts data ────────────────────────────────────────────────────────────
  const typeData = [
    { name: 'Preventivo', value: preventiveCount },
    { name: 'Correctivo', value: correctiveCount }
  ];
  const COLORS_TYPE = ['#14b8a6', '#a855f7'];

  const statusData = [
    { status: 'Programado', count: totalScheduled },
    { status: 'En Progreso', count: totalInProgress },
    { status: 'Completado', count: totalCompleted }
  ];

  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (5 - i));
    const yr = d.getFullYear();
    const mo = d.getMonth();
    return {
      month: d.toLocaleString('es-CO', { month: 'short' }),
      Preventivo: maintenances?.filter(m => {
        const relevantDate = getRelevantDate(m);
        if (!relevantDate) return false;
        const md = new Date(relevantDate);
        return m?.type === 'PREVENTIVE' && md.getFullYear() === yr && md.getMonth() === mo;
      }).length || 0,
      Correctivo: maintenances?.filter(m => {
        const relevantDate = getRelevantDate(m);
        if (!relevantDate) return false;
        const md = new Date(relevantDate);
        return m.type === 'CORRECTIVE' && md.getFullYear() === yr && md.getMonth() === mo;
      }).length || 0,
    };
  });

  // Global coverage metrics
  const filteredAssets = assets?.filter(a => {
    if (a.status === 'RETIRED') return false;
    return true;
  }) || [];

  const totalAssetsCount = filteredAssets.length;
  const assetsCompleted = new Set<string>();
  const assetsScheduled = new Set<string>();
  const assetsPending = new Set<string>();

  filteredAssets.forEach(asset => {
    const assetMaintenances = maintenances?.filter(m => m.assetId === asset.id) || [];
    const hasCompleted = assetMaintenances.some(m => m?.status === 'COMPLETED');
    const hasScheduled = assetMaintenances.some(m => m.status === 'SCHEDULED' || m.status === 'IN_PROGRESS');
    
    if (hasCompleted) {
      assetsCompleted.add(asset.id);
    } else if (hasScheduled) {
      assetsScheduled.add(asset.id);
    } else {
      assetsPending.add(asset.id);
    }
  });

  const assetsWithCompletedCount = assetsCompleted.size;
  const scheduledWithoutCompletedCount = assetsScheduled.size;
  const pendingSchedulingCount = assetsPending.size;

  // ── Filters ────────────────────────────────────────────────────────────────
  const handleCardClick = (statusFilter: string) => {
    setFilterStatus(filterStatus === statusFilter ? 'all' : statusFilter);
  };

  let displayData: any[] = [];
  if (coverageFilter === 'pending') {
    filteredAssets.forEach(a => {
      if (assetsPending.has(a.id)) {
        displayData.push({
          isDummy: true,
          id: `dummy-${a.id}`,
          assetId: a.id,
          type: 'NONE',
          status: 'PENDING_SCHEDULING',
          scheduledDate: '',
          collaboratorInTurnName: getCollaboratorForAsset(a.id)
        });
      }
    });
  } else {
    let baseMaintenances = maintenances || [];
    if (coverageFilter === 'completed') {
      baseMaintenances = baseMaintenances.filter(m => assetsCompleted.has(m.assetId) && m?.status === 'COMPLETED');
    } else if (coverageFilter === 'scheduled') {
      baseMaintenances = baseMaintenances.filter(m => assetsScheduled.has(m.assetId) && (m?.status === 'SCHEDULED' || m?.status === 'IN_PROGRESS'));
    }
    displayData = baseMaintenances;
  }

  const filteredData = displayData.filter(m => {
    // 1. Term search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const asset = assets?.find(a => a.id === m?.assetId);
      const matchesAsset = (m?.assetId || '').toLowerCase().includes(term);
      const matchesCollab = (m?.collaboratorInTurnName || getCollaboratorForAsset(m?.assetId || '')).toLowerCase().includes(term);
      const matchesHostname = (asset?.dynamicAttributes?.Hostname || '').toLowerCase().includes(term);
      if (!matchesAsset && !matchesCollab && !matchesHostname) return false;
    }

    if (m.isDummy) return true;

    // 2. View modes
    if (viewMode === 'auditoria') {
      if (!(m?.status === 'SCHEDULED' && m?.scheduledDate && new Date(m.scheduledDate) < new Date())) return false;
    } else if (viewMode === 'balance') {
      if (m?.type !== 'CORRECTIVE') return false;
    } else if (viewMode === 'preventive') {
      if (m?.type !== 'PREVENTIVE') return false;
    }

    // 3. Types and Statuses
    if (filterType !== 'all' && m?.type !== filterType) return false;
    if (filterStatus !== 'all' && m?.status !== filterStatus) return false;

    if (filterYear !== 'all' || filterMonth !== 'all') {
      const relevantDate = getRelevantDate(m);
      if (!relevantDate) return false;
      const date = new Date(relevantDate);
      if (filterYear !== 'all' && date.getFullYear().toString() !== filterYear) return false;
      if (filterMonth !== 'all' && (date.getMonth() + 1).toString() !== filterMonth) return false;
    }

    return true;
  }).sort((a, b) => {
    // Agrupar por equipo (assetId) para visualizar juntos sus históricos
    if (a.assetId < b.assetId) return -1;
    if (a.assetId > b.assetId) return 1;
    
    // Luego ordenar por fecha más reciente (descendente)
    const dateA = a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0;
    const dateB = b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0;
    return dateB - dateA;
  });

  // ── CSV Export ─────────────────────────────────────────────────────────────
  const exportToCSV = () => {
    if (!filteredData || filteredData.length === 0) return;
    const headers = ['ID Mantenimiento', 'Placa Ikusi', 'Hostname', 'Tipo', 'Estado', 'Fecha Programada', 'Fecha Ejecución', 'Dias Retraso', 'Usuario en Turno', 'Motivo', 'Notas Resolución'];
    const rows = filteredData.map(m => {
      let delayDays = 0;
      if (m?.status === 'COMPLETED' && m?.executionDate && m?.scheduledDate) {
        delayDays = Math.max(0, Math.floor((new Date(m.executionDate).getTime() - new Date(m.scheduledDate).getTime()) / (1000 * 3600 * 24)));
      } else if (m.status === 'SCHEDULED' && new Date(m.scheduledDate) < new Date()) {
        delayDays = Math.max(0, Math.floor((new Date().getTime() - new Date(m.scheduledDate).getTime()) / (1000 * 3600 * 24)));
      }
      const asset = assets?.find(a => a.id === m.assetId);
      const hostname = asset?.dynamicAttributes?.Hostname || asset?.dynamicAttributes?.hostname || 'N/A';
      return [m.id, m.assetId, hostname, m?.type === 'PREVENTIVE' ? 'Preventivo' : 'Correctivo', m.status, m.scheduledDate.split('T')[0], m.executionDate ? m.executionDate.split('T')[0] : 'N/A', delayDays.toString(), m?.collaboratorInTurnName || 'N/A', `"${(m.reason || '').replace(/"/g, '""')}"`, `"${(m.notes || '').replace(/"/g, '""')}"`];
    });
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reporte_mantenimientos_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let title = '', message = '', submitAction: () => void;
    if (modalMode === 'create') {
      title = 'Programar Mantenimiento'; message = '¿Estás seguro de programar este mantenimiento?';
      submitAction = () => createMutation.mutate({ assetId: formData.assetId, type: formData.type, scheduledDate: formData.scheduledDate, reason: formData.reason });
    } else if (modalMode === 'start' && selectedRecord) {
      title = 'Iniciar Mantenimiento'; message = '¿Estás seguro de registrar el inicio de este mantenimiento?';
      submitAction = () => startMutation.mutate({ id: selectedRecord.id, startNote: formData.startNote || '' });
    } else if (modalMode === 'complete' && selectedRecord) {
      title = 'Completar Mantenimiento'; message = '¿Estás seguro de dar por completado este mantenimiento?';
      submitAction = () => completeMutation.mutate({ id: selectedRecord.id, notes: formData.notes, realStartDate: formData.realStartDate, realEndDate: formData.realEndDate });
    } else if (modalMode === 'forceSign' && selectedRecord) {
      title = 'Forzar Firma de Mantenimiento'; message = '¿Estás seguro de forzar la firma de este mantenimiento?';
      submitAction = () => forceSignMutation.mutate({ id: selectedRecord.id, reason: formData.reason });
    } else return;
    confirm({ title, message, type: 'info', onConfirm: submitAction });
  };



  const handleCoverageClick = (type: 'completed' | 'scheduled' | 'pending') => {
    setCoverageFilter(coverageFilter === type ? 'all' : type);
  };

  const openModal = (mode: 'create' | 'start' | 'complete' | 'view' | 'forceSign', record?: MaintenanceRecord, presetAsset?: { assetId: string; displayName: string }) => {
    setModalMode(mode); setSelectedRecord(record || null);
    setErrorMsg('');
    if (mode === 'create') {
      setFormData({ assetId: presetAsset?.assetId || '', type: 'PREVENTIVE', scheduledDate: new Date().toISOString().split('T')[0], reason: '', startNote: '', notes: '', executionDate: new Date().toISOString().split('T')[0], realStartDate: '', realEndDate: '' });
      setAssetSearchTerm(presetAsset?.displayName || '');
    } else if (mode === 'forceSign') {
      setFormData({ ...formData, reason: '', startNote: '' });
    } else if (record) {
      setFormData({ ...formData, reason: record.reason || '', startNote: record.startNote || '', notes: record.notes || '', realStartDate: '', realEndDate: '' });
    }
    setShowModal(true);
  };

  return (
    <div className="maintenances-page slide-in">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="dash-header">
        <div>
          <h1 className="title-glow">Dashboard de Mantenimientos</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '14px' }}>Gestión y auditoría del ciclo de vida de los equipos</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-glass" onClick={exportToCSV}>Exportar CSV</button>
          {canCreate && <button className="btn-primary" onClick={() => openModal('create')}><Plus size={18} /> Programar</button>}
        </div>
      </header>

      {/* ── Global Coverage KPIs ────────────────────────────────────────────── */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ color: 'var(--text-main)', marginBottom: '15px', fontSize: '18px', fontWeight: 600 }}>Cobertura Global del Inventario</h3>
        <div className="maint-kpi-row">
          <div className="maint-kpi-card" style={{ flex: '1 1 200px', cursor: 'default' }}>
            <div className="kpi-icon" style={{ background: 'rgba(71,85,105,0.12)', color: '#475569' }}><Server size={22} /></div>
            <div className="kpi-body">
              <span className="kpi-label">Equipos en Inventario</span>
              <span className="kpi-value" style={{ color: '#475569' }}>{totalAssetsCount}</span>
              <span className="kpi-sub">Total de activos</span>
            </div>
          </div>

          <div className="maint-kpi-card kpi-green" style={{ flex: '1 1 200px', cursor: 'pointer', outline: coverageFilter === 'completed' ? '2px solid #22c55e' : 'none' }} onClick={() => handleCoverageClick('completed')}>
            <div className="kpi-icon" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}><CheckCircle size={22} /></div>
            <div className="kpi-body">
              <span className="kpi-label">Con Mantenimiento</span>
              <span className="kpi-value" style={{ color: '#22c55e' }}>{assetsWithCompletedCount}</span>
              <span className="kpi-sub">Realizado ({(assetsWithCompletedCount / (totalAssetsCount || 1) * 100).toFixed(1)}%)</span>
            </div>
          </div>

          <div className="maint-kpi-card kpi-blue" style={{ flex: '1 1 200px', cursor: 'pointer', outline: coverageFilter === 'scheduled' ? '2px solid #3b82f6' : 'none' }} onClick={() => handleCoverageClick('scheduled')}>
            <div className="kpi-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}><Calendar size={22} /></div>
            <div className="kpi-body">
              <span className="kpi-label">Ya Programados</span>
              <span className="kpi-value" style={{ color: '#3b82f6' }}>{scheduledWithoutCompletedCount}</span>
              </div>
          </div>

          <div className="maint-kpi-card kpi-red" style={{ flex: '1 1 200px', cursor: 'pointer', outline: coverageFilter === 'pending' ? '2px solid #ef4444' : 'none' }} onClick={() => handleCoverageClick('pending')}>
            <div className="kpi-icon" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}><AlertTriangle size={22} /></div>
            <div className="kpi-body">
              <span className="kpi-label">Pendientes de Programar</span>
              <span className="kpi-value" style={{ color: '#ef4444' }}>{pendingSchedulingCount}</span>
              <span className="kpi-sub" style={{ fontWeight: 600 }}>Requieren atención</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Date-Filtered KPI Cards ─────────────────────────────────────────── */}
      <div className="maint-kpi-row" style={{ marginBottom: '20px' }}>
        <div className="maint-kpi-card" style={{ cursor: 'default' }}>
          <div className="kpi-icon" style={{ background: 'rgba(71,85,105,0.12)', color: '#475569' }}><Calendar size={22} /></div>
          <div className="kpi-body">
            <span className="kpi-label">Total Mantenimientos</span>
            <span className="kpi-value" style={{ color: '#475569' }}>{totalCount}</span>
            </div>
        </div>

        <div className="maint-kpi-card kpi-blue" style={{ cursor: 'pointer', outline: filterStatus === 'SCHEDULED' ? '2px solid #3b82f6' : 'none' }} onClick={() => handleCardClick('SCHEDULED')}>
          <div className="kpi-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}><Calendar size={22} /></div>
          <div className="kpi-body">
            <span className="kpi-label">Programados</span>
            <span className="kpi-value" style={{ color: '#3b82f6' }}>{totalScheduled}</span>
            </div>
        </div>

        <div className="maint-kpi-card kpi-amber" style={{ cursor: 'pointer', outline: filterStatus === 'IN_PROGRESS' ? '2px solid #f59e0b' : 'none' }} onClick={() => handleCardClick('IN_PROGRESS')}>
          <div className="kpi-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}><Settings size={22} /></div>
          <div className="kpi-body">
            <span className="kpi-label">En Progreso</span>
            <span className="kpi-value" style={{ color: '#f59e0b' }}>{totalInProgress}</span>
          </div>
        </div>

        <div className="maint-kpi-card kpi-red" style={{ cursor: 'pointer', outline: viewMode === 'auditoria' ? '2px solid #ef4444' : 'none' }} onClick={() => setViewMode(viewMode === 'auditoria' ? 'general' : 'auditoria')}>
          <div className="kpi-icon" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}><AlertTriangle size={22} /></div>
          <div className="kpi-body">
            <span className="kpi-label">Vencidos</span>
            <span className="kpi-value" style={{ color: '#ef4444' }}>{overdue}</span>
            </div>
        </div>

        <div className="maint-kpi-card kpi-green" style={{ cursor: 'pointer', outline: filterStatus === 'COMPLETED' ? '2px solid #22c55e' : 'none' }} onClick={() => handleCardClick('COMPLETED')}>
          <div className="kpi-icon" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}><CheckCircle size={22} /></div>
          <div className="kpi-body">
            <span className="kpi-label">Completados</span>
            <span className="kpi-value" style={{ color: '#22c55e' }}>{totalCompleted}</span>
          </div>
        </div>

        <div className="maint-kpi-card kpi-teal" style={{ cursor: 'pointer', outline: viewMode === 'preventive' ? '2px solid #14b8a6' : 'none' }} onClick={() => setViewMode(viewMode === 'preventive' ? 'general' : 'preventive')}>
          <div className="kpi-icon" style={{ background: 'rgba(20,184,166,0.12)', color: '#14b8a6' }}><Wrench size={22} /></div>
          <div className="kpi-body">
            <span className="kpi-label">Preventivos</span>
            <span className="kpi-value" style={{ color: '#14b8a6' }}>{preventiveCount}</span>
            <span className="kpi-sub">({preventiveRatio}% del total)</span>
          </div>
        </div>

        <div className="maint-kpi-card kpi-purple" style={{ cursor: 'pointer', outline: viewMode === 'balance' ? '2px solid #a855f7' : 'none' }} onClick={() => setViewMode(viewMode === 'balance' ? 'general' : 'balance')}>
          <div className="kpi-icon" style={{ background: 'rgba(168,85,247,0.12)', color: '#a855f7' }}><Wrench size={22} /></div>
          <div className="kpi-body">
            <span className="kpi-label">Correctivos</span>
            <span className="kpi-value" style={{ color: '#a855f7' }}>{correctiveCount}</span>
            <span className="kpi-sub">({correctiveRatio}% del total)</span>
          </div>
        </div>
      </div>

      {/* ── Split Layout Container ────────────────────────────────────────────── */}
      <div className="maint-split-layout">
        
        {/* Left Column: Table & Filters */}
        <div className="table-main-area">
          <div className="dash-card" style={{ height: '100%' }}>
            {/* Filter bar */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ position: 'relative', flex: '1 1 300px' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="glass-input" 
                  placeholder="Buscar por placa, hostname o colaborador..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ width: '100%', paddingLeft: '40px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={16} /> Período:
                </span>
                <select className="glass-input" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ width: '150px' }}>
                  <option value="all">Todos (meses)</option>
                  <option value="1">Enero</option>
                  <option value="2">Febrero</option>
                  <option value="3">Marzo</option>
                  <option value="4">Abril</option>
                  <option value="5">Mayo</option>
                  <option value="6">Junio</option>
                  <option value="7">Julio</option>
                  <option value="8">Agosto</option>
                  <option value="9">Septiembre</option>
                  <option value="10">Octubre</option>
                  <option value="11">Noviembre</option>
                  <option value="12">Diciembre</option>
                </select>
                <select className="glass-input" value={filterYear} onChange={e => setFilterYear(e.target.value)} style={{ width: '130px' }}>
                  <option value="all">Todos (años)</option>
                  {availableYears.map(y => <option key={y} value={y.toString()}>{y}</option>)}
                                </select>
                {(filterMonth !== 'all' || filterYear !== 'all' || searchTerm !== '' || filterStatus !== 'all' || viewMode !== 'general' || coverageFilter !== 'all') && (
                  <button 
                    className="btn-glass" 
                    style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', gap: '6px', height: '38px', padding: '0 12px' }} 
                    onClick={() => {
                      setFilterMonth('all');
                      setFilterYear('all');
                      setSearchTerm('');
                      setFilterStatus('all');
                      setViewMode('general');
                      setCoverageFilter('all');
                      setFilterType('all');
                    }}
                    title="Limpiar todos los filtros y búsqueda"
                  >
                    <X size={16} /> Limpiar filtros
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="table-responsive">
              <table className="glass-table">
                <thead>
                  <tr>
                    <th>Equipo (Hostname)</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>Fecha Prog.</th>
                    <th>Días de Retraso</th>
                    <th>Usuario en Turno</th>
                    <th>Firma</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData?.map(m => {
                    const isLate = m?.status === 'SCHEDULED' && m?.scheduledDate && getTargetMidnight(m.scheduledDate) < nowNorm;
                    const delayDays = (() => {
                      if (m?.status === 'COMPLETED' && m?.executionDate && m?.scheduledDate) {
                        return Math.max(0, Math.floor((getTargetMidnight(m.executionDate) - getTargetMidnight(m.scheduledDate)) / (1000 * 3600 * 24)));
                      } else if (m?.status === 'SCHEDULED' && m?.scheduledDate && getTargetMidnight(m.scheduledDate) < nowNorm) {
                        return Math.floor((nowNorm - getTargetMidnight(m.scheduledDate)) / (1000 * 3600 * 24));
                      }
                      return null;
                    })();

                    return (
                      <tr key={m?.id || Math.random()}>
                        <td style={{ fontWeight: 600 }}>
                          <span 
                            style={{ cursor: 'pointer', textDecoration: 'underline', color: 'var(--text-main)' }} 
                            onClick={() => {
                              const hostname = assets?.find(a => a.id === m?.assetId)?.dynamicAttributes?.Hostname || m?.assetId;
                              setSearchTerm(hostname || '');
                            }}
                            title="Filtrar mantenimientos por este equipo"
                          >
                            {assets?.find(a => a.id === m?.assetId)?.dynamicAttributes?.Hostname || m?.assetId}
                          </span>
                        </td>
                        <td>
                          {m?.isDummy ? (
                            <span className="spec-tag" style={{ background: 'rgba(71,85,105,0.12)', color: '#475569' }}>
                              Sin asignar
                            </span>
                          ) : (
                            <span className="spec-tag" style={{ background: m?.type === 'PREVENTIVE' ? 'rgba(59,130,246,0.12)' : 'rgba(239,68,68,0.12)', color: m?.type === 'PREVENTIVE' ? '#3b82f6' : '#ef4444' }}>
                              {m?.type === 'PREVENTIVE' ? 'Preventivo' : 'Correctivo'}
                            </span>
                          )}
                        </td>
                        <td>
                          {m?.isDummy ? (
                            <span className="badge badge-status" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                              Sin Programar
                            </span>
                          ) : (
                            <span className={`badge badge-status badge-${(m?.status || 'UNKNOWN').toLowerCase()}`}>
                              {m?.status ? (STATUS_LABELS[m.status] || m.status) : 'Desconocido'}
                            </span>
                          )}
                          {!m?.isDummy && isLate && <span style={{ color: '#ef4444', fontSize: '12px', marginLeft: '6px' }}>⚠ Vencido</span>}
                        </td>
                        <td>{m?.isDummy ? <span style={{ color: 'var(--text-muted)' }}>—</span> : (m?.scheduledDate ? new Date(m.scheduledDate).toLocaleDateString('es-CO', { timeZone: 'UTC' }) : 'N/A')}</td>
                        <td>
                          {m?.isDummy ? (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          ) : delayDays === null ? (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          ) : delayDays === 0 ? (
                            <span style={{ color: '#10b981', fontWeight: 600 }}>A tiempo</span>
                          ) : (
                            <span style={{ color: m?.status === 'COMPLETED' ? '#f59e0b' : '#ef4444', fontWeight: 600 }}>{delayDays} días</span>
                          )}
                        </td>
                        <td>{m?.isDummy ? getCollaboratorForAsset(m?.assetId || '') : (m?.collaboratorInTurnName || <span style={{ color: 'var(--text-muted)' }}>N/A</span>)}</td>
                        <td>
                          {m?.isDummy ? (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          ) : m?.status !== 'COMPLETED' ? (
                            <span style={{ color: 'var(--text-muted)' }}>N/A</span>
                          ) : (m?.signedAt || m?.pdfUrl) ? (
                            <span style={{ color: '#10b981', fontWeight: 600 }}>Firmada</span>
                          ) : m?.signatureToken ? (
                            <span style={{ color: '#f59e0b', fontWeight: 600 }}>Pendiente</span>
                          ) : (
                            <span style={{ color: '#ef4444', fontWeight: 600 }}>Sin enviar</span>
                          )}
                        </td>
                        <td>
                          {m?.isDummy ? (
                            canCreate && (
                              <ActionMenu>
                                <button className="btn-action" style={{ borderColor: '#3b82f6', color: '#3b82f6' }} title="Programar Mantenimiento" onClick={() => {
                                  const asset = assets?.find(a => a.id === m?.assetId);
                                  const displayName = asset ? `${asset.id} - ${asset.dynamicAttributes?.HOSTNAME || asset.dynamicAttributes?.Hostname || asset.dynamicAttributes?.hostname || 'Sin Hostname'}` : m.assetId;
                                  openModal('create', undefined, { assetId: m.assetId, displayName });
                                }}>
                                  <Plus size={16} /> Programar
                                </button>
                              </ActionMenu>
                            )
                          ) : (
                            <ActionMenu>
                              <button className="btn-action" style={{ borderColor: '#8b5cf6', color: '#8b5cf6' }} title="Ver Historial" onClick={() => openModal('view', m)}>
                                <Clock size={16} />
                              </button>
                              {isAdmin && m.status === 'SCHEDULED' && (
                                <button className="btn-action" style={{ borderColor: '#eab308', color: '#eab308' }} title="Iniciar Mantenimiento" onClick={() => openModal('start', m)}>
                                  <Wrench size={16} />
                                </button>
                              )}
                              {isAdmin && m.status === 'SCHEDULED' && (
                                <button
                                  className="btn-action"
                                  style={{ borderColor: '#06b6d4', color: '#06b6d4', opacity: notifyMutation.isPending ? 0.5 : 1 }}
                                  title="Enviar recordatorio por Webex al colaborador"
                                  disabled={notifyMutation.isPending}
                                  onClick={() => {
                                    confirm({
                                      title: 'Enviar Recordatorio',
                                      message: `¿Enviar un recordatorio por Webex al colaborador sobre el mantenimiento programado del equipo ${m.assetId}?`,
                                      type: 'info',
                                      onConfirm: () => notifyMutation.mutate(m.id)
                                    });
                                  }}
                                >
                                  <Bell size={16} />
                                </button>
                              )}
                              {isAdmin && m.status === 'IN_PROGRESS' && (
                                <button className="btn-action" style={{ borderColor: '#22c55e', color: '#22c55e' }} title="Completar Mantenimiento" onClick={() => openModal('complete', m)}>
                                  <CheckCircle size={16} />
                                </button>
                              )}
                              {isAdmin && m?.status === 'COMPLETED' && !m?.signedAt && !m?.pdfUrl && (
                                <button 
                                  className="btn-action" 
                                  style={{ borderColor: '#ec4899', color: '#ec4899', opacity: forceSignMutation.isPending ? 0.5 : 1 }} 
                                  title="Firmar forzadamente" 
                                  onClick={() => openModal('forceSign', m)}
                                  disabled={forceSignMutation.isPending}
                                >
                                  <Edit3 size={16} />
                                </button>
                              )}
                              {isAdmin && m?.status === 'COMPLETED' && (
                                <button
                                  className="btn-action"
                                  style={{
                                    borderColor: (m?.signedAt || m?.pdfUrl) ? '#94a3b8' : '#3b82f6',
                                    color: (m?.signedAt || m?.pdfUrl) ? '#94a3b8' : '#3b82f6',
                                    opacity: (requestSignatureMutation.isPending || m?.signedAt || m?.pdfUrl) ? 0.5 : 1,
                                    cursor: (m?.signedAt || m?.pdfUrl) ? 'not-allowed' : 'pointer'
                                  }}
                                  title={(m?.signedAt || m?.pdfUrl) ? "Mantenimiento ya firmado" : "Solicitar firma de mantenimiento"} 
                                  onClick={() => {
                                    if (m?.signedAt || m?.pdfUrl) return;
                                    confirm({
                                      title: 'Solicitar Firma',
                                      message: '¿Estás seguro de enviar el correo solicitando la firma de este mantenimiento?',
                                      type: 'info',
                                      onConfirm: () => requestSignatureMutation.mutate(m.id)
                                    });
                                  }}
                                  disabled={requestSignatureMutation.isPending || !!(m?.signedAt || m?.pdfUrl)}
                                >
                                  <Mail size={16} />
                                </button>
                              )}
                            </ActionMenu>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {(!filteredData || filteredData.length === 0) && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        No hay registros que coincidan con los filtros aplicados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Charts Sidebar */}
        <div className="charts-sidebar">
          {/* Donut */}
          <div className="dash-card">
            <h3 className="dash-card-title">Preventivo vs Correctivo</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={typeData} cx="50%" cy="45%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" nameKey="name">
                  {typeData.map((_, i) => <Cell key={i} fill={COLORS_TYPE[i]} />)}
                </Pie>
                <Tooltip formatter={(v: any, n: string) => [v, n]} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bar */}
          <div className="dash-card">
            <h3 className="dash-card-title">Por Estado</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={statusData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <XAxis dataKey="status" stroke="var(--text-muted)" fontSize={12} />
                <YAxis allowDecimals={false} stroke="var(--text-muted)" fontSize={12} />
                <Tooltip cursor={{ fill: 'rgba(59,130,246,0.05)' }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Line — Tendencia Mensual */}
          <div className="dash-card">
            <h3 className="dash-card-title">Tendencia (últimos 6 m)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
                <YAxis allowDecimals={false} stroke="var(--text-muted)" fontSize={12} />
                <Tooltip />
                <Legend iconType="circle" iconSize={10} />
                <Line type="monotone" dataKey="Preventivo" stroke="#14b8a6" strokeWidth={2} dot={{ fill: '#14b8a6', r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Correctivo" stroke="#a855f7" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* ── Modal ───────────────────────────────────────────────────────────── */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ padding: '30px', maxWidth: '500px', width: '100%' }}>
            <h3 style={{ marginBottom: '20px', color: 'white' }}>
              {modalMode === 'create' ? 'Programar Mantenimiento' : modalMode === 'start' ? 'Iniciar Mantenimiento' : modalMode === 'view' ? 'Historial de Mantenimiento' : modalMode === 'forceSign' ? 'Firmar Forzadamente' : 'Completar Mantenimiento'}
            </h3>
            {errorMsg && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                {errorMsg}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              {modalMode === 'create' && (
                <>
                  <div className="form-group" style={{ position: 'relative' }}>
                    <label>ID del Activo, Hostname o Colaborador asignado</label>
                    <input
                      required
                      type="text"
                      className="glass-input"
                      placeholder="Buscar por placa, hostname o colaborador..."
                      value={assetSearchTerm}
                      onChange={(e) => {
                        setAssetSearchTerm(e.target.value);
                        setShowAssetDropdown(true);
                        if (!e.target.value) {
                          setFormData({ ...formData, assetId: '' });
                        }
                      }}
                      onFocus={() => setShowAssetDropdown(true)}
                      onBlur={() => setTimeout(() => setShowAssetDropdown(false), 200)}
                    />
                    {showAssetDropdown && (
                      <ul style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        width: '100%',
                        background: 'rgba(20, 20, 25, 0.95)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        listStyle: 'none',
                        padding: '5px 0',
                        margin: '5px 0 0 0',
                        zIndex: 10,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                      }}>
                        {assets
                          ?.filter(a => {
                            if (!assetSearchTerm) return true;
                            const term = assetSearchTerm.toLowerCase();
                            const placa = (a.id || '').toLowerCase();
                            const hostname = (a.dynamicAttributes?.HOSTNAME || a.dynamicAttributes?.Hostname || a.dynamicAttributes?.hostname || '').toLowerCase();
                            const collab = getCollaboratorForAsset(a.id).toLowerCase();
                            return placa.includes(term) || hostname.includes(term) || collab.includes(term);
                          })
                          .slice(0, 5)
                          .map(a => (
                            <li
                              key={a.id}
                              style={{
                                padding: '10px 15px',
                                cursor: 'pointer',
                                color: 'white',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                fontSize: '14px',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              onMouseDown={(e) => {
                                const displayName = `${a.id} - ${a.dynamicAttributes?.HOSTNAME || a.dynamicAttributes?.Hostname || a.dynamicAttributes?.hostname || 'Sin Hostname'}`;
                                setAssetSearchTerm(displayName);
                                setFormData({ ...formData, assetId: a.id });
                                setShowAssetDropdown(false);
                              }}
                            >
                              <div style={{ fontWeight: 500 }}>
                                {a.id} <span style={{ opacity: 0.7, fontSize: '12px' }}>{a.dynamicAttributes?.HOSTNAME || a.dynamicAttributes?.Hostname || a.dynamicAttributes?.hostname || ''}</span>
                              </div>
                              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                                Asignado a: {getCollaboratorForAsset(a.id)}
                              </div>
                            </li>
                          ))}
                        {assets?.filter(a => {
                          if (!assetSearchTerm) return true;
                          const term = assetSearchTerm.toLowerCase();
                          const placa = (a.id || '').toLowerCase();
                          const hostname = (a.dynamicAttributes?.HOSTNAME || a.dynamicAttributes?.Hostname || a.dynamicAttributes?.hostname || '').toLowerCase();
                          const collab = getCollaboratorForAsset(a.id).toLowerCase();
                          return placa.includes(term) || hostname.includes(term) || collab.includes(term);
                        }).length === 0 && (
                          <li style={{ padding: '10px 15px', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                            No se encontraron activos
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Tipo</label>
                    <select className="glass-input" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })}>
                      <option value="PREVENTIVE">Preventivo</option>
                      <option value="CORRECTIVE">Correctivo</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Fecha Programada</label>
                    <input required type="date" className="glass-input" value={formData.scheduledDate} onChange={e => setFormData({ ...formData, scheduledDate: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Motivo Inicial (Opcional)</label>
                    <input type="text" className="glass-input" value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} />
                  </div>
                </>
              )}
              {modalMode === 'start' && (
                <>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '15px' }}>Iniciando mantenimiento para el activo <b>{selectedRecord?.assetId}</b>.</p>
                  <div className="form-group">
                    <label>Diagnóstico Inicial / Notas de Inicio</label>
                    <input required type="text" className="glass-input" value={formData.startNote} onChange={e => setFormData({ ...formData, startNote: e.target.value })} placeholder="Ej. Limpieza interna, Cambio de pasta térmica..." />
                  </div>
                </>
              )}
              {modalMode === 'complete' && (
                <>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '15px' }}>
                    Al completar, <b>se programará automáticamente el siguiente servicio preventivo</b> para dentro de un año.
                  </p>
                  <div className="form-group">
                    <label>Notas de Resolución</label>
                    <textarea required className="glass-input" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Ej. Se limpió ventilador y se actualizó BIOS..." style={{ minHeight: '100px', resize: 'vertical' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Fecha real de inicio (Opcional)</label>
                      <input type="date" className="glass-input" value={formData.realStartDate} onChange={e => setFormData({ ...formData, realStartDate: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Fecha real de finalización (Opcional)</label>
                      <input type="date" className="glass-input" value={formData.realEndDate} onChange={e => setFormData({ ...formData, realEndDate: e.target.value })} />
                    </div>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '-8px' }}>
                    Usa estos campos solo para cargar mantenimientos históricos (ej. desde Excel). Si los dejas vacíos, se usará la fecha y hora actual.
                  </p>
                </>
              )}
              {modalMode === 'forceSign' && (
                <>
                  <div className="form-group">
                    <label>Motivo de firma forzada</label>
                    <textarea required className="glass-input" value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} placeholder="Ej. El usuario no tiene acceso al sistema..." style={{ minHeight: '80px', resize: 'vertical' }} />
                  </div>
                </>
              )}
              {modalMode === 'view' && selectedRecord && (
                <div className="history-timeline">
                  <div className="history-item">
                    <div className="history-dot" style={{ background: '#3b82f6' }}></div>
                    <div className="history-content">
                      <h4><Calendar size={16} color="#3b82f6" /> Programación</h4>
                      <p><strong>Fecha:</strong> {new Date(selectedRecord.scheduledDate).toLocaleDateString('es-CO', { timeZone: 'UTC' })}</p>
                      {selectedRecord.reason && <p><strong>Motivo de Programación:</strong> {selectedRecord.reason}</p>}
                    </div>
                  </div>
                  
                  {(selectedRecord.status === 'IN_PROGRESS' || selectedRecord.status === 'COMPLETED') && (
                    <div className="history-item">
                      <div className="history-dot" style={{ background: '#f59e0b' }}></div>
                      <div className="history-content">
                        <h4><Wrench size={16} color="#f59e0b" /> En Progreso</h4>
                        {selectedRecord.startedAt ? (
                          <p><strong>Fecha de inicio:</strong> {new Date(selectedRecord.startedAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</p>
                        ) : (
                          <p style={{ fontStyle: 'italic', opacity: 0.7 }}>Fecha de inicio no registrada (mantenimiento anterior a esta función).</p>
                        )}
                        <p>El mantenimiento ha sido iniciado por el técnico.</p>
                        {selectedRecord.startNote && <p><strong>Diagnóstico Inicial:</strong> {selectedRecord.startNote}</p>}
                      </div>
                    </div>
                  )}

                  {selectedRecord.status === 'COMPLETED' && (
                    <div className="history-item">
                      <div className="history-dot" style={{ background: '#10b981' }}></div>
                      <div className="history-content">
                        <h4><CheckCircle size={16} color="#10b981" /> Completado</h4>
                        {selectedRecord.executionDate && <p><strong>Fecha Ejecución:</strong> {new Date(selectedRecord.executionDate).toLocaleDateString('es-CO', { timeZone: 'UTC' })}</p>}
                        {selectedRecord.notes && <p><strong>Notas de Resolución:</strong> {selectedRecord.notes}</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-glass" onClick={() => setShowModal(false)}>{modalMode === 'view' ? 'Cerrar' : 'Cancelar'}</button>
                {modalMode !== 'view' && (
                  <button type="submit" className="btn-primary" disabled={createMutation.isPending || startMutation.isPending || completeMutation.isPending || forceSignMutation.isPending}>
                    {createMutation.isPending || startMutation.isPending || completeMutation.isPending || forceSignMutation.isPending ? 'Guardando...' : 'Confirmar'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Maintenances;

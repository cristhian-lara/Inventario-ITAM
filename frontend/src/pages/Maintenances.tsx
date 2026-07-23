import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Search, Calendar, Upload, CheckCircle2 } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import { usePermission } from '../context/AuthContext';
import { showWebexFailureModal } from '../utils/notificationNotice';
import { authHeaders } from '../utils/authHeaders';
import './Maintenances.css';
import { API_URL } from '../config';
import { exportToCSV } from '../utils/exportCsv';
import LoadingState from '../components/LoadingState';
import MaintenanceKpiCards from '../components/maintenances/MaintenanceKpiCards';
import MaintenanceChartsSidebar from '../components/maintenances/MaintenanceChartsSidebar';
import MaintenanceTableRow from '../components/maintenances/MaintenanceTableRow';
import MaintenanceModal from '../components/maintenances/MaintenanceModal';

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

  // Importación masiva de mantenimientos históricos
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<{
    successful: number; failed: number; completed: number; scheduled: number;
    reprogrammed: number; skipped: number; errors: string[]; warnings: string[];
  } | null>(null);

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch(`${API_URL}/api/maintenances/import`, {
        method: 'POST',
        headers: authHeaders(),
        body
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al importar');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setImportResult(data);
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
    },
    onError: (err: any) => { toast.error(err.message, 8000); }
  });

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importMutation.mutate(file);
    e.target.value = ''; // permite reimportar el mismo archivo
  };

  // Generar acta bajo demanda (con notas editables) para mantenimientos migrados
  const ACT_DEFAULTS = {
    reason: 'Mantenimiento preventivo programado — registro histórico migrado.',
    startNote: 'Sin diagnóstico de inicio registrado (carga histórica).',
    notes: 'Mantenimiento preventivo ejecutado. Registro cargado por migración; sin notas de detalle en el origen.'
  };
  const [actModalRecord, setActModalRecord] = useState<any | null>(null);
  const [actNotes, setActNotes] = useState({ reason: '', startNote: '', notes: '' });

  const openActModal = (record: any) => {
    setActNotes({
      reason: record?.reason || ACT_DEFAULTS.reason,
      startNote: record?.startNote || ACT_DEFAULTS.startNote,
      notes: record?.notes || ACT_DEFAULTS.notes
    });
    setActModalRecord(record);
  };

  const generateActMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: { reason: string; startNote: string; notes: string } }) => {
      const res = await fetch(`${API_URL}/api/maintenances/${id}/generate-act`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(notes)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al generar el acta');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success('Acta generada.');
      setActModalRecord(null);
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      if (data.pdfUrl) window.open(`${API_URL}${data.pdfUrl}`, '_blank');
    },
    onError: (err: any) => { toast.error(err.message, 8000); }
  });

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

  const { data: categories } = useQuery<any[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/catalog/categories`, { headers: authHeaders() });
      if (!res.ok) return [];
      return res.json();
    }
  });

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

  if (isLoading) return <LoadingState message="Cargando módulo de mantenimientos..." />;

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

  // Global coverage metrics. Los mantenimientos solo aplican a Computadores, así
  // que la cobertura (total, con mantenimiento, agendados, pendientes) se calcula
  // únicamente sobre esa categoría: incluir monitores o periféricos inflaría el
  // denominador con activos que nunca se van a mantener.
  const computadoresCategoryId = categories?.find(c => c.name === 'Computadores')?.id;
  const filteredAssets = assets?.filter(a => {
    if (a.status === 'RETIRED') return false;
    if (computadoresCategoryId === undefined) return false;
    return a.categoryId === computadoresCategoryId;
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
  const exportCSV = () => {
    const headers = ['ID Mantenimiento', 'Placa Ikusi', 'Hostname', 'Tipo', 'Estado', 'Fecha Programada', 'Fecha Ejecución', 'Dias Retraso', 'Usuario en Turno', 'Motivo', 'Notas Resolución'];
    exportToCSV('reporte_mantenimientos', headers, filteredData || [], (m) => {
      let delayDays = 0;
      if (m?.status === 'COMPLETED' && m?.executionDate && m?.scheduledDate) {
        delayDays = Math.max(0, Math.floor((new Date(m.executionDate).getTime() - new Date(m.scheduledDate).getTime()) / (1000 * 3600 * 24)));
      } else if (m.status === 'SCHEDULED' && new Date(m.scheduledDate) < new Date()) {
        delayDays = Math.max(0, Math.floor((new Date().getTime() - new Date(m.scheduledDate).getTime()) / (1000 * 3600 * 24)));
      }
      const asset = assets?.find(a => a.id === m.assetId);
      const hostname = asset?.dynamicAttributes?.Hostname || asset?.dynamicAttributes?.hostname || 'N/A';
      return [m.id, m.assetId, hostname, m?.type === 'PREVENTIVE' ? 'Preventivo' : 'Correctivo', m.status, m.scheduledDate.split('T')[0], m.executionDate ? m.executionDate.split('T')[0] : 'N/A', delayDays, m?.collaboratorInTurnName || 'N/A', m.reason || '', m.notes || ''];
    });
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
          <button className="btn-glass" onClick={exportCSV}>Exportar CSV</button>
          {canCreate && (
            <>
              <input
                ref={importInputRef}
                type="file"
                accept=".xlsx,.csv"
                style={{ display: 'none' }}
                onChange={handleImportFile}
              />
              <button
                className="btn-glass"
                onClick={() => importInputRef.current?.click()}
                disabled={importMutation.isPending}
              >
                <Upload size={16} /> {importMutation.isPending ? 'Importando…' : 'Importar (.xlsx, .csv)'}
              </button>
            </>
          )}
          {canCreate && <button className="btn-primary" onClick={() => openModal('create')}><Plus size={18} /> Programar</button>}
        </div>
      </header>

      {importResult && (
        <div className="glass-panel" style={{ marginBottom: '20px', borderLeft: '4px solid #3b82f6', background: 'rgba(59, 130, 246, 0.05)', padding: '20px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ marginTop: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={20} color="#3b82f6" />
                Resultados de Importación
              </h3>
              <div style={{ display: 'flex', gap: '20px', marginTop: '10px', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--text-muted)' }}><strong style={{ color: '#22c55e' }}>Creados:</strong> {importResult.successful}</span>
                <span style={{ color: 'var(--text-muted)' }}><strong>Completados:</strong> {importResult.completed}</span>
                <span style={{ color: 'var(--text-muted)' }}><strong>Programados:</strong> {importResult.scheduled}</span>
                <span style={{ color: 'var(--text-muted)' }}><strong>Reprogramados +1 año:</strong> {importResult.reprogrammed}</span>
                <span style={{ color: 'var(--text-muted)' }}><strong>Omitidos:</strong> {importResult.skipped}</span>
                <span style={{ color: 'var(--text-muted)' }}><strong style={{ color: '#ef4444' }}>Fallidos:</strong> {importResult.failed}</span>
              </div>

              {importResult.errors && importResult.errors.length > 0 && (
                <div style={{ marginTop: '15px', padding: '15px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <h4 style={{ color: '#ef4444', margin: '0 0 10px 0', fontSize: '14px' }}>Detalles de errores:</h4>
                  <div style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '13px', color: 'var(--text-muted)' }}>
                    {importResult.errors.map((err, i) => <div key={i} style={{ marginBottom: '4px' }}>• {err}</div>)}
                  </div>
                </div>
              )}

              {importResult.warnings && importResult.warnings.length > 0 && (
                <div style={{ marginTop: '15px', padding: '15px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                  <h4 style={{ color: '#ca8a04', margin: '0 0 10px 0', fontSize: '14px' }}>Avisos:</h4>
                  <div style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '13px', color: 'var(--text-muted)' }}>
                    {importResult.warnings.map((warn, i) => <div key={i} style={{ marginBottom: '4px' }}>• {warn}</div>)}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setImportResult(null)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '5px' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      <MaintenanceKpiCards
        totalAssetsCount={totalAssetsCount}
        assetsWithCompletedCount={assetsWithCompletedCount}
        scheduledWithoutCompletedCount={scheduledWithoutCompletedCount}
        pendingSchedulingCount={pendingSchedulingCount}
        coverageFilter={coverageFilter}
        onCoverageClick={handleCoverageClick}
        totalCount={totalCount}
        totalScheduled={totalScheduled}
        totalInProgress={totalInProgress}
        overdue={overdue}
        totalCompleted={totalCompleted}
        preventiveCount={preventiveCount}
        preventiveRatio={preventiveRatio}
        correctiveCount={correctiveCount}
        correctiveRatio={correctiveRatio}
        filterStatus={filterStatus}
        viewMode={viewMode}
        onCardClick={handleCardClick}
        onToggleViewMode={(mode) => setViewMode(viewMode === mode ? 'general' : mode)}
      />

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
                      <MaintenanceTableRow
                        key={m?.id || Math.random()}
                        m={m}
                        assets={assets}
                        isAdmin={isAdmin}
                        canCreate={canCreate}
                        isLate={!!isLate}
                        delayDays={delayDays}
                        getCollaboratorForAsset={getCollaboratorForAsset}
                        onFilterByHostname={setSearchTerm}
                        onOpenModal={openModal}
                        onNotify={(id, assetId) => {
                          confirm({
                            title: 'Enviar Recordatorio',
                            message: `¿Enviar un recordatorio por Webex al colaborador sobre el mantenimiento programado del equipo ${assetId}?`,
                            type: 'info',
                            onConfirm: () => notifyMutation.mutate(id)
                          });
                        }}
                        onRequestSignature={(id) => {
                          confirm({
                            title: 'Solicitar Firma',
                            message: '¿Estás seguro de enviar el correo solicitando la firma de este mantenimiento?',
                            type: 'info',
                            onConfirm: () => requestSignatureMutation.mutate(id)
                          });
                        }}
                        onGenerateAct={openActModal}
                        onViewAct={(pdfUrl) => window.open(`${API_URL}${pdfUrl}`, '_blank')}
                        notifyPending={notifyMutation.isPending}
                        requestSignaturePending={requestSignatureMutation.isPending}
                        forceSignPending={forceSignMutation.isPending}
                      />
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

        <MaintenanceChartsSidebar typeData={typeData} statusData={statusData} monthlyData={monthlyData} />

      </div>

      {showModal && (
        <MaintenanceModal
          mode={modalMode}
          selectedRecord={selectedRecord}
          errorMsg={errorMsg}
          formData={formData}
          setFormData={setFormData}
          assetSearchTerm={assetSearchTerm}
          setAssetSearchTerm={setAssetSearchTerm}
          showAssetDropdown={showAssetDropdown}
          setShowAssetDropdown={setShowAssetDropdown}
          // Solo Computadores: son los únicos activos a los que se les hace
          // mantenimiento. La tabla sí sigue resolviendo contra `assets` completo
          // para no romper el histórico de otras categorías.
          assets={filteredAssets}
          getCollaboratorForAsset={getCollaboratorForAsset}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          isPending={createMutation.isPending || startMutation.isPending || completeMutation.isPending || forceSignMutation.isPending}
        />
      )}

      {actModalRecord && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
          onClick={() => setActModalRecord(null)}
        >
          <div
            className="glass-panel"
            style={{ background: 'var(--bg-card, #fff)', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ margin: 0, color: 'var(--text-main)' }}>Generar Acta de Mantenimiento</h3>
              <button onClick={() => setActModalRecord(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: 0 }}>
              Revisa o edita las notas antes de emitir el PDF. Vienen pre-llenadas por ser un registro histórico; puedes ajustarlas si tienes el detalle real.
            </p>

            <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: 'var(--text-main)', marginTop: '14px', marginBottom: '4px' }}>Motivo de Programación</label>
            <textarea
              value={actNotes.reason}
              onChange={(e) => setActNotes({ ...actNotes, reason: e.target.value })}
              rows={2}
              style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color, #ccc)', resize: 'vertical' }}
            />

            <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: 'var(--text-main)', marginTop: '14px', marginBottom: '4px' }}>Diagnóstico de Inicio</label>
            <textarea
              value={actNotes.startNote}
              onChange={(e) => setActNotes({ ...actNotes, startNote: e.target.value })}
              rows={2}
              style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color, #ccc)', resize: 'vertical' }}
            />

            <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: 'var(--text-main)', marginTop: '14px', marginBottom: '4px' }}>Trabajo Realizado / Notas Finales</label>
            <textarea
              value={actNotes.notes}
              onChange={(e) => setActNotes({ ...actNotes, notes: e.target.value })}
              rows={3}
              style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color, #ccc)', resize: 'vertical' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button className="btn-glass" onClick={() => setActModalRecord(null)}>Cancelar</button>
              <button
                className="btn-primary"
                disabled={generateActMutation.isPending}
                onClick={() => generateActMutation.mutate({ id: actModalRecord.id, notes: actNotes })}
              >
                {generateActMutation.isPending ? 'Generando…' : 'Generar Acta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Maintenances;

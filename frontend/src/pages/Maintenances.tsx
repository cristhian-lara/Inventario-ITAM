import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Wrench, CheckCircle, AlertTriangle, Calendar, Plus, Clock, X, Mail, Edit3 } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { useConfirm } from '../context/ConfirmContext';
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

const Maintenances: React.FC = () => {
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [viewMode, setViewMode] = useState<'general' | 'auditoria' | 'balance'>('general');
  const { confirm } = useConfirm();

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'start' | 'complete' | 'view' | 'forceSign'>('create');
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    assetId: '',
    type: 'PREVENTIVE',
    scheduledDate: new Date().toISOString().split('T')[0],
    reason: '',
    notes: '',
    executionDate: new Date().toISOString().split('T')[0]
  });

  const { data: maintenances, isLoading } = useQuery<MaintenanceRecord[]>({
    queryKey: ['maintenances'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/maintenances`);
      if (!res.ok) throw new Error('Error cargando mantenimientos');
      return res.json();
    }
  });

  const availableYears = React.useMemo(() => {
    if (!maintenances) return [];
    const years = new Set(maintenances.map(m => new Date(m.scheduledDate).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [maintenances]);

  const { data: assets } = useQuery<any[]>({
    queryKey: ['assets_list'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/catalog/assets`);
      if (!res.ok) return [];
      return res.json();
    }
  });

  const { data: assignments } = useQuery<any[]>({
    queryKey: ['assignments'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/assignments`);
      if (!res.ok) return [];
      return res.json();
    }
  });

  const { data: collaborators } = useQuery<any[]>({
    queryKey: ['collaborators'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/collaborators`);
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
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
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
    mutationFn: async (data: { id: string, reason: string }) => {
      const res = await fetch(`${API_URL}/api/maintenances/${data.id}/start`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: data.reason })
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
    mutationFn: async (data: { id: string, notes: string }) => {
      const res = await fetch(`${API_URL}/api/maintenances/${data.id}/complete`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: data.notes })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || 'Error al completar');
      }
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['maintenances'] }); setShowModal(false); },
    onError: (error: Error) => { setErrorMsg(error.message); }
  });

  const requestSignatureMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_URL}/api/maintenances/${id}/request-signature`, {
        method: 'POST'
      });
      if (!res.ok) {
        const error = await res.json().catch(()=>({}));
        throw new Error(error.error || 'Error al solicitar firma');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      setSuccessMsg('Firma solicitada correctamente');
      setTimeout(() => setSuccessMsg(''), 3000);
    },
    onError: (error: Error) => { alert(error.message); }
  });

  const forceSignMutation = useMutation({
    mutationFn: async (data: { id: string, reason: string }) => {
      const res = await fetch(`${API_URL}/api/maintenances/${data.id}/force-sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      setSuccessMsg('Mantenimiento firmado forzadamente con éxito');
      setTimeout(() => setSuccessMsg(''), 3000);
    },
    onError: (error: Error) => { setErrorMsg(error.message); }
  });

  if (isLoading) return <div style={{ padding: '40px', color: 'var(--text-main)' }}>Cargando módulo de mantenimientos...</div>;

  const now = new Date();

  const timeFilteredMaintenances = maintenances?.filter(m => {
    if (filterYear !== 'all' || filterMonth !== 'all') {
      const date = new Date(m.scheduledDate);
      if (filterYear !== 'all' && date.getFullYear().toString() !== filterYear) return false;
      if (filterMonth !== 'all' && (date.getMonth() + 1).toString() !== filterMonth) return false;
    }
    return true;
  });

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalCount = timeFilteredMaintenances?.length || 0;
  const totalScheduled = timeFilteredMaintenances?.filter(m => m.status === 'SCHEDULED').length || 0;
  const totalInProgress = timeFilteredMaintenances?.filter(m => m.status === 'IN_PROGRESS').length || 0;
  const totalCompleted = timeFilteredMaintenances?.filter(m => m.status === 'COMPLETED').length || 0;
  const overdue = timeFilteredMaintenances?.filter(m => m.status === 'SCHEDULED' && new Date(m.scheduledDate) < now).length || 0;
  const preventiveCount = timeFilteredMaintenances?.filter(m => m.type === 'PREVENTIVE').length || 0;
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
        const md = new Date(m.scheduledDate);
        return m.type === 'PREVENTIVE' && md.getFullYear() === yr && md.getMonth() === mo;
      }).length || 0,
      Correctivo: maintenances?.filter(m => {
        const md = new Date(m.scheduledDate);
        return m.type === 'CORRECTIVE' && md.getFullYear() === yr && md.getMonth() === mo;
      }).length || 0,
    };
  });

  // ── Filters ────────────────────────────────────────────────────────────────
  const handleCardClick = (statusFilter: string) => {
    setFilterStatus(filterStatus === statusFilter ? 'all' : statusFilter);
  };

  const filteredData = maintenances?.filter(m => {
    if (viewMode === 'auditoria') {
      if (!(m.status === 'SCHEDULED' && new Date(m.scheduledDate) < now)) return false;
    } else if (viewMode === 'balance') {
      if (m.type !== 'CORRECTIVE') return false;
    } else if (viewMode === 'preventive') {
      if (m.type !== 'PREVENTIVE') return false;
    }
    if (filterType !== 'all' && m.type !== filterType) return false;
    if (filterStatus !== 'all' && m.status !== filterStatus) return false;
    
    if (filterYear !== 'all' || filterMonth !== 'all') {
      const date = new Date(m.scheduledDate);
      if (filterYear !== 'all' && date.getFullYear().toString() !== filterYear) return false;
      if (filterMonth !== 'all' && (date.getMonth() + 1).toString() !== filterMonth) return false;
    }
    
    return true;
  });

  // ── CSV Export ─────────────────────────────────────────────────────────────
  const exportToCSV = () => {
    if (!filteredData || filteredData.length === 0) return;
    const headers = ['ID Mantenimiento', 'Placa Ikusi', 'Tipo', 'Estado', 'Fecha Programada', 'Fecha Ejecución', 'Dias Retraso', 'Usuario en Turno', 'Motivo', 'Notas Resolución'];
    const rows = filteredData.map(m => {
      let delayDays = 0;
      if (m.status === 'COMPLETED' && m.executionDate) {
        delayDays = Math.max(0, Math.floor((new Date(m.executionDate).getTime() - new Date(m.scheduledDate).getTime()) / (1000 * 3600 * 24)));
      } else if (m.status === 'SCHEDULED' && new Date(m.scheduledDate) < new Date()) {
        delayDays = Math.max(0, Math.floor((new Date().getTime() - new Date(m.scheduledDate).getTime()) / (1000 * 3600 * 24)));
      }
      return [m.id, m.assetId, m.type === 'PREVENTIVE' ? 'Preventivo' : 'Correctivo', m.status, m.scheduledDate.split('T')[0], m.executionDate ? m.executionDate.split('T')[0] : 'N/A', delayDays.toString(), m.collaboratorInTurnName || 'N/A', `"${(m.reason || '').replace(/"/g, '""')}"`, `"${(m.notes || '').replace(/"/g, '""')}"`];
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `reporte_mantenimientos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let title = '', message = '', submitAction: () => void;
    if (modalMode === 'create') {
      title = 'Programar Mantenimiento'; message = '¿Estás seguro de programar este mantenimiento?';
      submitAction = () => createMutation.mutate({ assetId: formData.assetId, type: formData.type, scheduledDate: formData.scheduledDate, reason: formData.reason });
    } else if (modalMode === 'start' && selectedRecord) {
      title = 'Iniciar Mantenimiento'; message = '¿Estás seguro de registrar el inicio de este mantenimiento?';
      submitAction = () => startMutation.mutate({ id: selectedRecord.id, reason: formData.reason });
    } else if (modalMode === 'complete' && selectedRecord) {
      title = 'Completar Mantenimiento'; message = '¿Estás seguro de dar por completado este mantenimiento?';
      submitAction = () => completeMutation.mutate({ id: selectedRecord.id, notes: formData.notes });
    } else if (modalMode === 'forceSign' && selectedRecord) {
      title = 'Forzar Firma de Mantenimiento'; message = '¿Estás seguro de forzar la firma de este mantenimiento?';
      submitAction = () => forceSignMutation.mutate({ id: selectedRecord.id, reason: formData.reason });
    } else return;
    confirm({ title, message, type: 'info', onConfirm: submitAction });
  };

  const openModal = (mode: 'create' | 'start' | 'complete' | 'view' | 'forceSign', record?: MaintenanceRecord) => {
    setModalMode(mode); setSelectedRecord(record || null);
    setErrorMsg('');
    if (mode === 'create') {
      setFormData({ assetId: '', type: 'PREVENTIVE', scheduledDate: new Date().toISOString().split('T')[0], reason: '', notes: '', executionDate: new Date().toISOString().split('T')[0] });
    } else if (mode === 'forceSign') {
      setFormData({ ...formData, reason: '' });
    } else if (record) {
      setFormData({ ...formData, reason: record.reason || '', notes: record.notes || '' });
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
          <button className="btn-primary" onClick={() => openModal('create')}><Plus size={18} /> Programar</button>
        </div>
      </header>

      {successMsg && (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '15px 20px', borderRadius: '8px', color: '#10b981', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle size={20} />
          {successMsg}
        </div>
      )}

      {/* ── KPI Cards ───────────────────────────────────────────────────────── */}
      <div className="maint-kpi-row">
        <div className="maint-kpi-card" style={{ cursor: 'default' }}>
          <div className="kpi-icon" style={{ background: 'rgba(71,85,105,0.12)', color: '#475569' }}><Calendar size={22} /></div>
          <div className="kpi-body">
            <span className="kpi-label">Total Mantenimientos</span>
            <span className="kpi-value" style={{ color: '#475569' }}>{totalCount}</span>
            <span className="kpi-sub">según fecha</span>
          </div>
        </div>

        <div className="maint-kpi-card kpi-blue" style={{ cursor: 'pointer', outline: filterStatus === 'SCHEDULED' ? '2px solid #3b82f6' : 'none' }} onClick={() => handleCardClick('SCHEDULED')}>
          <div className="kpi-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}><Calendar size={22} /></div>
          <div className="kpi-body">
            <span className="kpi-label">Programados</span>
            <span className="kpi-value" style={{ color: '#3b82f6' }}>{totalScheduled}</span>
            <span className="kpi-sub">clic para filtrar</span>
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
            <span className="kpi-sub">sin atender</span>
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
            <span className="kpi-label">Preventivos %</span>
            <span className="kpi-value" style={{ color: '#14b8a6' }}>{preventiveRatio}%</span>
            <span className="kpi-sub">del total</span>
          </div>
        </div>

        <div className="maint-kpi-card kpi-purple" style={{ cursor: 'pointer', outline: viewMode === 'balance' ? '2px solid #a855f7' : 'none' }} onClick={() => setViewMode(viewMode === 'balance' ? 'general' : 'balance')}>
          <div className="kpi-icon" style={{ background: 'rgba(168,85,247,0.12)', color: '#a855f7' }}><Wrench size={22} /></div>
          <div className="kpi-body">
            <span className="kpi-label">Correctivos %</span>
            <span className="kpi-value" style={{ color: '#a855f7' }}>{correctiveRatio}%</span>
            <span className="kpi-sub">del total</span>
          </div>
        </div>
      </div>

      {/* ── Charts Row ──────────────────────────────────────────────────────── */}
      <div className="dash-row" style={{ marginBottom: '20px' }}>

        {/* Donut */}
        <div className="dash-card" style={{ flex: '1 1 220px' }}>
          <h3 className="dash-card-title">Preventivo vs Correctivo</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={typeData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {typeData.map((_, i) => <Cell key={i} fill={COLORS_TYPE[i]} />)}
              </Pie>
              <Tooltip formatter={(v: any, n: string) => [v, n]} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar */}
        <div className="dash-card" style={{ flex: '1 1 260px' }}>
          <h3 className="dash-card-title">Mantenimientos por Estado</h3>
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
        <div className="dash-card" style={{ flex: '1 1 300px' }}>
          <h3 className="dash-card-title">Tendencia Mensual (últimos 6 meses)</h3>
          <ResponsiveContainer width="100%" height={220}>
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

      {/* ── Filters + Table ──────────────────────────────────────────────────── */}
      <div className="dash-card">

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="glass-input" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: '170px' }}>
            <option value="all">Todos los Tipos</option>
            <option value="PREVENTIVE">Preventivo</option>
            <option value="CORRECTIVE">Correctivo</option>
          </select>
          <select className="glass-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: '170px' }}>
            <option value="all">Todos los Estados</option>
            <option value="SCHEDULED">Programado</option>
            <option value="IN_PROGRESS">En Progreso</option>
            <option value="COMPLETED">Completado</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
          <select className="glass-input" value={viewMode} onChange={e => setViewMode(e.target.value as any)} style={{ width: '230px', borderColor: '#3b82f6' }}>
            <option value="general">📄 Vista General</option>
            <option value="auditoria">🚨 Auditoría de Vencidos</option>
            <option value="balance">⚙️ Análisis de Correctivos</option>
          </select>
          <select className="glass-input" value={filterYear} onChange={e => setFilterYear(e.target.value)} style={{ width: '130px' }}>
            <option value="all">Todos (Años)</option>
            {availableYears.map(y => <option key={y} value={y.toString()}>{y}</option>)}
          </select>
          <select className="glass-input" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ width: '150px' }}>
            <option value="all">Todos (Meses)</option>
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

          {/* Active filter pills */}
          {(filterType !== 'all' || filterStatus !== 'all' || viewMode !== 'general' || filterYear !== 'all' || filterMonth !== 'all') && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginLeft: 'auto' }}>
              {filterType !== 'all' && (
                <span className="filter-pill">
                  {TYPE_LABELS[filterType]}
                  <button onClick={() => setFilterType('all')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 4px', color: 'inherit' }}><X size={12} /></button>
                </span>
              )}
              {filterStatus !== 'all' && (
                <span className="filter-pill">
                  {STATUS_LABELS[filterStatus]}
                  <button onClick={() => setFilterStatus('all')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 4px', color: 'inherit' }}><X size={12} /></button>
                </span>
              )}
              {filterYear !== 'all' && (
                <span className="filter-pill">
                  Año: {filterYear}
                  <button onClick={() => setFilterYear('all')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 4px', color: 'inherit' }}><X size={12} /></button>
                </span>
              )}
              {filterMonth !== 'all' && (
                <span className="filter-pill">
                  Mes: {new Date(2000, parseInt(filterMonth) - 1).toLocaleString('es-CO', { month: 'long' })}
                  <button onClick={() => setFilterMonth('all')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 4px', color: 'inherit' }}><X size={12} /></button>
                </span>
              )}
              {viewMode !== 'general' && (
                <span className="filter-pill filter-pill-blue">
                  {viewMode === 'auditoria'
                    ? '🚨 Auditoría Vencidos'
                    : viewMode === 'preventive'
                    ? '🔧 Análisis Preventivos'
                    : '⚙️ Análisis Correctivos'}
                  <button onClick={() => setViewMode('general')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 4px', color: 'inherit' }}><X size={12} /></button>
                </span>
              )}
              <button 
                onClick={() => {
                  setFilterType('all');
                  setFilterStatus('all');
                  setFilterYear('all');
                  setFilterMonth('all');
                  setViewMode('general');
                }}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--accent-red)', 
                  fontSize: '12px', 
                  cursor: 'pointer', 
                  textDecoration: 'underline', 
                  marginLeft: '8px',
                  fontWeight: 600
                }}
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="table-responsive">
          <table className="glass-table">
            <thead>
              <tr>
                <th>Activo (Placa)</th>
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
                const isLate = m.status === 'SCHEDULED' && new Date(m.scheduledDate) < now;
                const delayDays = (() => {
                  if (m.status === 'COMPLETED' && m.executionDate) {
                    return Math.max(0, Math.floor((new Date(m.executionDate).getTime() - new Date(m.scheduledDate).getTime()) / (1000 * 3600 * 24)));
                  } else if (m.status === 'SCHEDULED' && new Date(m.scheduledDate) < now) {
                    return Math.floor((now.getTime() - new Date(m.scheduledDate).getTime()) / (1000 * 3600 * 24));
                  }
                  return null;
                })();

                return (
                  <tr key={m.id}>
                    <td className="fw-600">{m.assetId}</td>
                    <td>
                      <span className="spec-tag" style={{ background: m.type === 'PREVENTIVE' ? 'rgba(59,130,246,0.12)' : 'rgba(239,68,68,0.12)', color: m.type === 'PREVENTIVE' ? '#3b82f6' : '#ef4444' }}>
                        {m.type === 'PREVENTIVE' ? 'Preventivo' : 'Correctivo'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-status badge-${m.status.toLowerCase()}`}>
                        {STATUS_LABELS[m.status] || m.status}
                      </span>
                      {isLate && <span style={{ color: '#ef4444', fontSize: '12px', marginLeft: '6px' }}>⚠ Vencido</span>}
                    </td>
                    <td>{new Date(m.scheduledDate).toLocaleDateString('es-CO')}</td>
                    <td>
                      {delayDays === null ? (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      ) : delayDays === 0 ? (
                        <span style={{ color: '#10b981', fontWeight: 600 }}>A tiempo</span>
                      ) : (
                        <span style={{ color: m.status === 'COMPLETED' ? '#f59e0b' : '#ef4444', fontWeight: 600 }}>{delayDays} días</span>
                      )}
                    </td>
                    <td>{m.collaboratorInTurnName || <span style={{ color: 'var(--text-muted)' }}>N/A</span>}</td>
                    <td>
                      {m.status !== 'COMPLETED' ? (
                        <span style={{ color: 'var(--text-muted)' }}>N/A</span>
                      ) : (m.signedAt || m.pdfUrl) ? (
                        <span style={{ color: '#10b981', fontWeight: 600 }}>Firmada</span>
                      ) : m.signatureToken ? (
                        <span style={{ color: '#f59e0b', fontWeight: 600 }}>Pendiente</span>
                      ) : (
                        <span style={{ color: '#ef4444', fontWeight: 600 }}>Sin enviar</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn-action" style={{ borderColor: '#8b5cf6', color: '#8b5cf6' }} title="Ver Historial" onClick={() => openModal('view', m)}>
                          <Clock size={16} />
                        </button>
                        {m.status === 'SCHEDULED' && (
                          <button className="btn-action" style={{ borderColor: '#eab308', color: '#eab308' }} title="Iniciar Mantenimiento" onClick={() => openModal('start', m)}>
                            <Wrench size={16} />
                          </button>
                        )}
                        {m.status === 'IN_PROGRESS' && (
                          <button className="btn-action" style={{ borderColor: '#22c55e', color: '#22c55e' }} title="Completar Mantenimiento" onClick={() => openModal('complete', m)}>
                            <CheckCircle size={16} />
                          </button>
                        )}
                        {m.status === 'COMPLETED' && !m.signedAt && !m.pdfUrl && (
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
                        {m.status === 'COMPLETED' && (
                          <button 
                            className="btn-action" 
                            style={{ borderColor: '#3b82f6', color: '#3b82f6', opacity: requestSignatureMutation.isPending ? 0.5 : 1 }} 
                            title="Solicitar firma de mantenimiento" 
                            onClick={() => {
                              confirm({
                                title: 'Solicitar Firma',
                                message: '¿Estás seguro de enviar el correo solicitando la firma de este mantenimiento?',
                                type: 'info',
                                onConfirm: () => requestSignatureMutation.mutate(m.id)
                              });
                            }}
                            disabled={requestSignatureMutation.isPending}
                          >
                            <Mail size={16} />
                          </button>
                        )}
                      </div>
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
                    <label>Motivo / Problema Detectado</label>
                    <input required type="text" className="glass-input" value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} placeholder="Ej. Limpieza interna, Cambio de pasta térmica..." />
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
                      <p><strong>Fecha:</strong> {new Date(selectedRecord.scheduledDate).toLocaleDateString('es-CO')}</p>
                      {selectedRecord.reason && <p><strong>Motivo / Problema:</strong> {selectedRecord.reason}</p>}
                    </div>
                  </div>
                  
                  {(selectedRecord.status === 'IN_PROGRESS' || selectedRecord.status === 'COMPLETED') && (
                    <div className="history-item">
                      <div className="history-dot" style={{ background: '#f59e0b' }}></div>
                      <div className="history-content">
                        <h4><Wrench size={16} color="#f59e0b" /> En Progreso</h4>
                        <p>El mantenimiento ha sido iniciado por el técnico.</p>
                      </div>
                    </div>
                  )}

                  {selectedRecord.status === 'COMPLETED' && (
                    <div className="history-item">
                      <div className="history-dot" style={{ background: '#10b981' }}></div>
                      <div className="history-content">
                        <h4><CheckCircle size={16} color="#10b981" /> Completado</h4>
                        {selectedRecord.executionDate && <p><strong>Fecha Ejecución:</strong> {new Date(selectedRecord.executionDate).toLocaleDateString('es-CO')}</p>}
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

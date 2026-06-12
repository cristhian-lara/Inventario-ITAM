import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Wrench, CheckCircle, AlertTriangle, Calendar, Plus, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useConfirm } from '../context/ConfirmContext';
import './Maintenances.css';

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
}

const Maintenances: React.FC = () => {
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'general' | 'auditoria' | 'balance'>('general');
  const { confirm } = useConfirm();
  
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'start' | 'complete'>('create');
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
  
  // Formulario temporal
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
      const res = await fetch('http://localhost:3000/api/maintenances');
      if (!res.ok) throw new Error('Error cargando mantenimientos');
      return res.json();
    }
  });

  // Fetch assets for autocomplete
  const { data: assets } = useQuery<any[]>({
    queryKey: ['assets_list'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3000/api/catalog/assets');
      if (!res.ok) return [];
      return res.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('http://localhost:3000/api/maintenances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Error al programar mantenimiento');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      setShowModal(false);
    }
  });

  const startMutation = useMutation({
    mutationFn: async (data: { id: string, reason: string }) => {
      const res = await fetch(`http://localhost:3000/api/maintenances/${data.id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: data.reason })
      });
      if (!res.ok) throw new Error('Error al iniciar');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      setShowModal(false);
    },
    onError: (error: Error) => {
      alert(error.message);
    }
  });

  const completeMutation = useMutation({
    mutationFn: async (data: { id: string, notes: string }) => {
      const res = await fetch(`http://localhost:3000/api/maintenances/${data.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: data.notes })
      });
      if (!res.ok) throw new Error('Error al completar');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      setShowModal(false);
    },
    onError: (error: Error) => {
      alert(error.message);
    }
  });

  if (isLoading) return <div style={{ padding: '20px', color: 'white' }}>Cargando módulo de mantenimientos...</div>;

  // KPIs
  const totalScheduled = maintenances?.filter(m => m.status === 'SCHEDULED').length || 0;
  const totalInProgress = maintenances?.filter(m => m.status === 'IN_PROGRESS').length || 0;
  const now = new Date();
  const overdue = maintenances?.filter(m => m.status === 'SCHEDULED' && new Date(m.scheduledDate) < now).length || 0;
  
  const preventiveCount = maintenances?.filter(m => m.type === 'PREVENTIVE').length || 0;
  const correctiveCount = maintenances?.filter(m => m.type === 'CORRECTIVE').length || 0;
  
  const preventiveRatio = maintenances && maintenances.length > 0 
    ? Math.round((preventiveCount / maintenances.length) * 100) 
    : 0;
  const correctiveRatio = maintenances && maintenances.length > 0 
    ? Math.round((correctiveCount / maintenances.length) * 100) 
    : 0;

  const typeData = [
    { name: 'Preventivo', value: preventiveCount },
    { name: 'Correctivo', value: correctiveCount }
  ];

  const statusData = [
    { status: 'Programado', count: totalScheduled },
    { status: 'En Progreso', count: totalInProgress },
    { status: 'Completado', count: maintenances?.filter(m => m.status === 'COMPLETED').length || 0 }
  ];

  const COLORS_TYPE = ['#22c55e', '#a855f7'];

  const handleCardClick = (statusFilter: string) => {
    if (filterStatus === statusFilter) {
      setFilterStatus('all');
    } else {
      setFilterStatus(statusFilter);
    }
  };

  // Vistas predeterminadas
  const filteredData = maintenances?.filter(m => {
    // 1. Vistas predeterminadas
    if (viewMode === 'auditoria') {
      // Auditoría: solo mostrar vencidos
      const isLate = m.status === 'SCHEDULED' && new Date(m.scheduledDate) < now;
      if (!isLate) return false;
    } else if (viewMode === 'balance') {
      // Balance: mostrar todos para ver el historial, podrías resaltar, pero dejaremos pasar todos 
      // o solo mostrar correctivos si queremos analizar fallos.
      // Mostraremos solo correctivos para el balance de fallos.
      if (m.type !== 'CORRECTIVE') return false;
    }

    // 2. Filtros normales
    if (filterType !== 'all' && m.type !== filterType) return false;
    if (filterStatus !== 'all' && m.status !== filterStatus) return false;
    return true;
  });

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

      return [
        m.id,
        m.assetId,
        m.type === 'PREVENTIVE' ? 'Preventivo' : 'Correctivo',
        m.status,
        m.scheduledDate.split('T')[0],
        m.executionDate ? m.executionDate.split('T')[0] : 'N/A',
        delayDays.toString(),
        m.collaboratorInTurnName || 'N/A',
        `"${(m.reason || '').replace(/"/g, '""')}"`,
        `"${(m.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reporte_mantenimientos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let title = '';
    let message = '';
    let submitAction: () => void;

    if (modalMode === 'create') {
      title = 'Programar Mantenimiento';
      message = '¿Estás seguro de programar este mantenimiento?';
      submitAction = () => createMutation.mutate({
        assetId: formData.assetId,
        type: formData.type,
        scheduledDate: formData.scheduledDate,
        reason: formData.reason
      });
    } else if (modalMode === 'start' && selectedRecord) {
      title = 'Iniciar Mantenimiento';
      message = '¿Estás seguro de registrar el inicio de este mantenimiento?';
      submitAction = () => startMutation.mutate({ id: selectedRecord.id, reason: formData.reason });
    } else if (modalMode === 'complete' && selectedRecord) {
      title = 'Completar Mantenimiento';
      message = '¿Estás seguro de dar por completado este mantenimiento?';
      submitAction = () => completeMutation.mutate({ id: selectedRecord.id, notes: formData.notes });
    } else {
      return;
    }

    confirm({
      title,
      message,
      type: 'info',
      onConfirm: submitAction
    });
  };

  const openModal = (mode: 'create' | 'start' | 'complete', record?: MaintenanceRecord) => {
    setModalMode(mode);
    setSelectedRecord(record || null);
    if (mode === 'create') {
      setFormData({ assetId: '', type: 'PREVENTIVE', scheduledDate: new Date().toISOString().split('T')[0], reason: '', notes: '', executionDate: new Date().toISOString().split('T')[0] });
    } else if (record) {
      setFormData({ ...formData, reason: record.reason || '', notes: record.notes || '' });
    }
    setShowModal(true);
  };

  return (
    <div className="maintenances-page slide-in">
      <header className="page-header">
        <div>
          <h1 className="title-glow">Gestión de Mantenimientos</h1>
          <p style={{ color: 'var(--text-muted)' }}>Programa, ejecuta y audita el historial de mantenimientos de tus equipos.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-glass" onClick={exportToCSV}>
             Exportar CSV
          </button>
          <button className="btn-primary" onClick={() => openModal('create')}>
            <Plus size={18} /> Programar
          </button>
        </div>
      </header>

      {/* DASHBOARD LOCAL */}
      <div className="bento-grid" style={{ marginBottom: '30px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="bento-card" style={{ cursor: 'pointer', border: filterStatus === 'SCHEDULED' ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)' }} onClick={() => handleCardClick('SCHEDULED')}>
          <div className="bento-header">
            <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <Calendar size={24} />
            </div>
          </div>
          <div className="bento-body">
            <h3>Programados</h3>
            <p className="stat-value" style={{ color: '#3b82f6' }}>{totalScheduled}</p>
          </div>
        </div>

        <div className="bento-card" style={{ cursor: 'pointer', border: filterStatus === 'IN_PROGRESS' ? '2px solid #ca8a04' : '1px solid rgba(255,255,255,0.1)' }} onClick={() => handleCardClick('IN_PROGRESS')}>
          <div className="bento-header">
            <div className="stat-icon" style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#ca8a04' }}>
              <Settings size={24} />
            </div>
          </div>
          <div className="bento-body">
            <h3>En Progreso</h3>
            <p className="stat-value" style={{ color: '#ca8a04' }}>{totalInProgress}</p>
          </div>
        </div>

        <div className="bento-card" style={{ cursor: 'pointer', border: viewMode === 'auditoria' ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.1)' }} onClick={() => setViewMode(viewMode === 'auditoria' ? 'general' : 'auditoria')}>
          <div className="bento-header">
            <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <AlertTriangle size={24} />
            </div>
          </div>
          <div className="bento-body">
            <h3>Vencidos</h3>
            <p className="stat-value" style={{ color: '#ef4444' }}>{overdue}</p>
          </div>
        </div>

        <div className="bento-card">
          <div className="bento-header">
            <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
              <CheckCircle size={24} />
            </div>
          </div>
          <div className="bento-body">
            <h3>Preventivo</h3>
            <p className="stat-value" style={{ color: '#22c55e' }}>{preventiveRatio}%</p>
          </div>
        </div>

        <div className="bento-card">
          <div className="bento-header">
            <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
              <Wrench size={24} />
            </div>
          </div>
          <div className="bento-body">
            <h3>Correctivo</h3>
            <p className="stat-value" style={{ color: '#a855f7' }}>{correctiveRatio}%</p>
          </div>
        </div>
      </div>

      {/* CHARTS ROW */}
      <section className="bento-grid" style={{ marginBottom: '30px' }}>
        <div className="glass-panel" style={{ padding: '20px', minHeight: '350px' }}>
          <h3 style={{ marginBottom: '20px', color: 'var(--text-main)' }}>Preventivo vs Correctivo</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={typeData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {typeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS_TYPE[index % COLORS_TYPE.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number, name: string) => [value, name]} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-panel" style={{ padding: '20px', minHeight: '350px' }}>
          <h3 style={{ marginBottom: '20px', color: 'var(--text-main)' }}>Mantenimientos por Estado</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusData}>
              <XAxis dataKey="status" stroke="var(--text-muted)" />
              <YAxis allowDecimals={false} stroke="var(--text-muted)" />
              <Tooltip cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* LISTA Y FILTROS */}
      <div className="glass-panel">
        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '15px' }}>
            <select className="glass-input" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: '180px' }}>
              <option value="all">Todos los Tipos</option>
              <option value="PREVENTIVE">Preventivo</option>
              <option value="CORRECTIVE">Correctivo</option>
            </select>
            <select className="glass-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: '180px' }}>
              <option value="all">Todos los Estados</option>
              <option value="SCHEDULED">Programado</option>
              <option value="IN_PROGRESS">En Progreso</option>
              <option value="COMPLETED">Completado</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </div>
          <div>
            <select className="glass-input" value={viewMode} onChange={e => setViewMode(e.target.value as any)} style={{ width: '250px', borderColor: '#3b82f6', color: 'var(--text-color)' }}>
              <option value="general">📄 Vista General</option>
              <option value="auditoria">🚨 Reporte: Auditoría de Vencidos</option>
              <option value="balance">⚙️ Reporte: Análisis de Correctivos</option>
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="glass-table">
            <thead>
              <tr>
                <th>Activo (Placa)</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th>Fecha Prog.</th>
                <th>Usuario en Turno</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredData?.map(m => {
                const isLate = m.status === 'SCHEDULED' && new Date(m.scheduledDate) < now;
                return (
                  <tr key={m.id}>
                    <td className="fw-600">{m.assetId}</td>
                    <td>
                      <span className="spec-tag" style={{ background: m.type === 'PREVENTIVE' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: m.type === 'PREVENTIVE' ? '#3b82f6' : '#ef4444' }}>
                        {m.type === 'PREVENTIVE' ? 'Preventivo' : 'Correctivo'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-status badge-${m.status.toLowerCase()}`}>
                        {m.status === 'SCHEDULED' ? 'Programado' : m.status === 'IN_PROGRESS' ? 'En Progreso' : m.status === 'COMPLETED' ? 'Completado' : 'Cancelado'}
                      </span>
                      {isLate && <span style={{ color: '#ef4444', fontSize: '12px', marginLeft: '5px' }}>⚠ Vencido</span>}
                    </td>
                    <td>{new Date(m.scheduledDate).toLocaleDateString()}</td>
                    <td>{m.collaboratorInTurnName || <span style={{ color: 'var(--text-muted)' }}>N/A</span>}</td>
                    <td>
                      <div className="actions-cell">
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
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ padding: '30px', maxWidth: '500px', width: '100%' }}>
            <h3 style={{ marginBottom: '20px', color: 'white' }}>
              {modalMode === 'create' ? 'Programar Mantenimiento' : modalMode === 'start' ? 'Iniciar Mantenimiento' : 'Completar Mantenimiento'}
            </h3>
            
            <form onSubmit={handleSubmit}>
              {modalMode === 'create' && (
                <>
                  <div className="form-group">
                    <label>ID del Activo (Placa Ikusi)</label>
                    <input required type="text" list="assets-list" className="glass-input" value={formData.assetId} onChange={e => setFormData({...formData, assetId: e.target.value})} placeholder="Escribe para buscar..." />
                    <datalist id="assets-list">
                      {assets?.map(a => (
                        <option key={a.id} value={a.id}>{a.dynamicAttributes?.Nombre || 'Activo'} - {a.id}</option>
                      ))}
                    </datalist>
                  </div>
                  <div className="form-group">
                    <label>Tipo</label>
                    <select className="glass-input" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                      <option value="PREVENTIVE">Preventivo</option>
                      <option value="CORRECTIVE">Correctivo</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Fecha Programada</label>
                    <input required type="date" className="glass-input" value={formData.scheduledDate} onChange={e => setFormData({...formData, scheduledDate: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Motivo Inicial (Opcional)</label>
                    <input type="text" className="glass-input" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} />
                  </div>
                </>
              )}

              {modalMode === 'start' && (
                <>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '15px' }}>Iniciando mantenimiento para el activo <b>{selectedRecord?.assetId}</b>.</p>
                  <div className="form-group">
                    <label>Motivo / Problema Detectado</label>
                    <input required type="text" className="glass-input" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} placeholder="Ej. Limpieza interna, Cambio de pasta térmica..." />
                  </div>
                </>
              )}

              {modalMode === 'complete' && (
                <>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '15px' }}>
                    Al completar este mantenimiento, <b>se programará automáticamente el siguiente servicio preventivo</b> para dentro de un año a partir de hoy.
                  </p>
                  <div className="form-group">
                    <label>Notas de Resolución</label>
                    <textarea required className="glass-input" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Ej. Se limpió ventilador y se actualizó BIOS..." style={{ minHeight: '100px', resize: 'vertical' }} />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-glass" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={createMutation.isPending || startMutation.isPending || completeMutation.isPending}>
                  {createMutation.isPending || startMutation.isPending || completeMutation.isPending ? 'Guardando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Maintenances;

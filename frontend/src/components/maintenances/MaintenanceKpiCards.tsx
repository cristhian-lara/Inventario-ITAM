import { Server, CheckCircle, Calendar, AlertTriangle, Settings, Wrench } from 'lucide-react';

interface Props {
  totalAssetsCount: number;
  assetsWithCompletedCount: number;
  scheduledWithoutCompletedCount: number;
  pendingSchedulingCount: number;
  coverageFilter: 'all' | 'completed' | 'scheduled' | 'pending';
  onCoverageClick: (type: 'completed' | 'scheduled' | 'pending') => void;

  totalCount: number;
  totalScheduled: number;
  totalInProgress: number;
  overdue: number;
  totalCompleted: number;
  preventiveCount: number;
  preventiveRatio: number;
  correctiveCount: number;
  correctiveRatio: number;
  filterStatus: string;
  viewMode: 'general' | 'auditoria' | 'balance' | 'preventive';
  onCardClick: (status: string) => void;
  onToggleViewMode: (mode: 'auditoria' | 'preventive' | 'balance') => void;
}

export default function MaintenanceKpiCards({
  totalAssetsCount,
  assetsWithCompletedCount,
  scheduledWithoutCompletedCount,
  pendingSchedulingCount,
  coverageFilter,
  onCoverageClick,
  totalCount,
  totalScheduled,
  totalInProgress,
  overdue,
  totalCompleted,
  preventiveCount,
  preventiveRatio,
  correctiveCount,
  correctiveRatio,
  filterStatus,
  viewMode,
  onCardClick,
  onToggleViewMode
}: Props) {
  return (
    <>
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

          <button type="button" className="maint-kpi-card kpi-green" style={{ flex: '1 1 200px', cursor: 'pointer', outline: coverageFilter === 'completed' ? '2px solid #22c55e' : 'none' }} aria-pressed={coverageFilter === 'completed'} onClick={() => onCoverageClick('completed')}>
            <div className="kpi-icon" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}><CheckCircle size={22} /></div>
            <div className="kpi-body">
              <span className="kpi-label">Con Mantenimiento</span>
              <span className="kpi-value" style={{ color: '#22c55e' }}>{assetsWithCompletedCount}</span>
              <span className="kpi-sub">Realizado ({(assetsWithCompletedCount / (totalAssetsCount || 1) * 100).toFixed(1)}%)</span>
            </div>
          </button>

          <button type="button" className="maint-kpi-card kpi-blue" style={{ flex: '1 1 200px', cursor: 'pointer', outline: coverageFilter === 'scheduled' ? '2px solid #3b82f6' : 'none' }} aria-pressed={coverageFilter === 'scheduled'} onClick={() => onCoverageClick('scheduled')}>
            <div className="kpi-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}><Calendar size={22} /></div>
            <div className="kpi-body">
              <span className="kpi-label">Ya Programados</span>
              <span className="kpi-value" style={{ color: '#3b82f6' }}>{scheduledWithoutCompletedCount}</span>
              </div>
          </button>

          <button type="button" className="maint-kpi-card kpi-red" style={{ flex: '1 1 200px', cursor: 'pointer', outline: coverageFilter === 'pending' ? '2px solid #ef4444' : 'none' }} aria-pressed={coverageFilter === 'pending'} onClick={() => onCoverageClick('pending')}>
            <div className="kpi-icon" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}><AlertTriangle size={22} /></div>
            <div className="kpi-body">
              <span className="kpi-label">Pendientes de Programar</span>
              <span className="kpi-value" style={{ color: '#ef4444' }}>{pendingSchedulingCount}</span>
              <span className="kpi-sub" style={{ fontWeight: 600 }}>Requieren atención</span>
            </div>
          </button>
        </div>
      </div>

      <div className="maint-kpi-row" style={{ marginBottom: '20px' }}>
        <div className="maint-kpi-card" style={{ cursor: 'default' }}>
          <div className="kpi-icon" style={{ background: 'rgba(71,85,105,0.12)', color: '#475569' }}><Calendar size={22} /></div>
          <div className="kpi-body">
            <span className="kpi-label">Total Mantenimientos</span>
            <span className="kpi-value" style={{ color: '#475569' }}>{totalCount}</span>
            </div>
        </div>

        <button type="button" className="maint-kpi-card kpi-blue" style={{ cursor: 'pointer', outline: filterStatus === 'SCHEDULED' ? '2px solid #3b82f6' : 'none' }} aria-pressed={filterStatus === 'SCHEDULED'} onClick={() => onCardClick('SCHEDULED')}>
          <div className="kpi-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}><Calendar size={22} /></div>
          <div className="kpi-body">
            <span className="kpi-label">Programados</span>
            <span className="kpi-value" style={{ color: '#3b82f6' }}>{totalScheduled}</span>
            </div>
        </button>

        <button type="button" className="maint-kpi-card kpi-amber" style={{ cursor: 'pointer', outline: filterStatus === 'IN_PROGRESS' ? '2px solid #f59e0b' : 'none' }} aria-pressed={filterStatus === 'IN_PROGRESS'} onClick={() => onCardClick('IN_PROGRESS')}>
          <div className="kpi-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}><Settings size={22} /></div>
          <div className="kpi-body">
            <span className="kpi-label">En Progreso</span>
            <span className="kpi-value" style={{ color: '#f59e0b' }}>{totalInProgress}</span>
          </div>
        </button>

        <button type="button" className="maint-kpi-card kpi-red" style={{ cursor: 'pointer', outline: viewMode === 'auditoria' ? '2px solid #ef4444' : 'none' }} aria-pressed={viewMode === 'auditoria'} onClick={() => onToggleViewMode('auditoria')}>
          <div className="kpi-icon" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}><AlertTriangle size={22} /></div>
          <div className="kpi-body">
            <span className="kpi-label">Vencidos</span>
            <span className="kpi-value" style={{ color: '#ef4444' }}>{overdue}</span>
            </div>
        </button>

        <button type="button" className="maint-kpi-card kpi-green" style={{ cursor: 'pointer', outline: filterStatus === 'COMPLETED' ? '2px solid #22c55e' : 'none' }} aria-pressed={filterStatus === 'COMPLETED'} onClick={() => onCardClick('COMPLETED')}>
          <div className="kpi-icon" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}><CheckCircle size={22} /></div>
          <div className="kpi-body">
            <span className="kpi-label">Completados</span>
            <span className="kpi-value" style={{ color: '#22c55e' }}>{totalCompleted}</span>
          </div>
        </button>

        <button type="button" className="maint-kpi-card kpi-teal" style={{ cursor: 'pointer', outline: viewMode === 'preventive' ? '2px solid #14b8a6' : 'none' }} aria-pressed={viewMode === 'preventive'} onClick={() => onToggleViewMode('preventive')}>
          <div className="kpi-icon" style={{ background: 'rgba(20,184,166,0.12)', color: '#14b8a6' }}><Wrench size={22} /></div>
          <div className="kpi-body">
            <span className="kpi-label">Preventivos</span>
            <span className="kpi-value" style={{ color: '#14b8a6' }}>{preventiveCount}</span>
            <span className="kpi-sub">({preventiveRatio}% del total)</span>
          </div>
        </button>

        <button type="button" className="maint-kpi-card kpi-purple" style={{ cursor: 'pointer', outline: viewMode === 'balance' ? '2px solid #a855f7' : 'none' }} aria-pressed={viewMode === 'balance'} onClick={() => onToggleViewMode('balance')}>
          <div className="kpi-icon" style={{ background: 'rgba(168,85,247,0.12)', color: '#a855f7' }}><Wrench size={22} /></div>
          <div className="kpi-body">
            <span className="kpi-label">Correctivos</span>
            <span className="kpi-value" style={{ color: '#a855f7' }}>{correctiveCount}</span>
            <span className="kpi-sub">({correctiveRatio}% del total)</span>
          </div>
        </button>
      </div>
    </>
  );
}

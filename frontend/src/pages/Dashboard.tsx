import { Activity, ShieldCheck, MonitorSmartphone, ArrowRight, Clock, Package, FileDown, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import './Dashboard.css';
import { API_URL } from '../config';

interface DashboardMetrics {
  totalAssets: number;
  activeAssignments: number;
  expiringWarranties: number;
  obsoleteAssets: number;
  utilizationRate: number;
  recentActivity: Array<{
    id: string;
    collaboratorId: string;
    description: string;
    date: string;
    type: string;
  }>;
  assetsByStatus?: Array<{ status: string; count: number }>;
  assetsByCategory?: Array<{ categoryName: string; count: number }>;
}

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: '#10b981',
  IN_USE: '#3b82f6',
  PENDING_ACCEPTANCE: '#f59e0b',
  RETIRED: '#94a3b8',
  MAINTENANCE: '#a855f7',
};

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Disponible',
  IN_USE: 'En Uso',
  PENDING_ACCEPTANCE: 'Pend. Firma',
  RETIRED: 'Retirado',
  MAINTENANCE: 'Mantenimiento',
};

export default function Dashboard() {
  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ['dashboard_metrics'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/dashboard`);
      return response.data;
    }
  });

  const { data: assignments } = useQuery<any[]>({
    queryKey: ['assignments'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/assignments`);
      return response.data;
    }
  });

  const { data: assets } = useQuery<any[]>({
    queryKey: ['assets'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/catalog/assets`);
      return response.data;
    }
  });

  const { data: collaborators } = useQuery<any[]>({
    queryKey: ['collaborators'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/collaborators`);
      return response.data;
    }
  });

  if (isLoading) return (
    <div className="dashboard-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <p className="title-glow">Cargando métricas...</p>
    </div>
  );

  // ── Computed KPIs ──────────────────────────────────────────────────────────
  const pendingFirma = assignments?.filter(a => a.status === 'PENDING_ACCEPTANCE').length || 0;

  const availableAssets = assets?.filter(a => {
    const hasPending = assignments?.some(asgn => asgn.assetId === a.id && asgn.status === 'PENDING_ACCEPTANCE');
    return a.status === 'AVAILABLE' && !hasPending;
  }).length || 0;

  // ── Warranty expiry table (next 5) ─────────────────────────────────────────
  const today = new Date();
  const warrantyAssets = (assets || [])
    .filter(a => a.purchaseDate && a.warrantyMonths)
    .map(a => {
      const expiryDate = new Date(a.purchaseDate);
      expiryDate.setMonth(expiryDate.getMonth() + Number(a.warrantyMonths));
      const daysLeft = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return { ...a, expiryDate, daysLeft };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5);

  // ── Top 5 collaborators by accepted equipment count ───────────────────────
  const collabStats = (collaborators || [])
    .map(c => {
      const count = (assignments || []).filter(a => a.collaboratorId === c.id && a.status === 'ACCEPTED').length;
      return { name: c.name || c.email || c.id, count };
    })
    .filter(c => c.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const maxCollabCount = collabStats[0]?.count || 1;

  // ── Pie data (include pending) ─────────────────────────────────────────────
  const pieData = [
    ...(metrics?.assetsByStatus || []).map(s => ({
      name: STATUS_LABELS[s.status] || s.status,
      count: s.count,
      fill: STATUS_COLORS[s.status] || '#94a3b8',
    })),
    ...(pendingFirma > 0
      ? [{ name: 'Pend. Firma', count: pendingFirma, fill: '#f59e0b' }]
      : []),
  ];

  const exportCSV = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/catalog/assets`);
      const data = res.data;
      const rows = ['ID,Status,Categoria,FechaCompra,GarantiaMeses,DepreciacionAnos'];
      for (const row of data) {
        rows.push([row.id, row.status, row.categoryId, row.purchaseDate || '', row.warrantyMonths || '', row.depreciationYears || ''].join(','));
      }
      const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Inventario_Ikusi_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch { alert('Error exportando reporte'); }
  };

  return (
    <div className="dashboard-container">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="dash-header">
        <div>
          <h1 className="title-glow" style={{ fontSize: '28px', marginBottom: '4px' }}>
            Dashboard General
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
            Resumen ejecutivo del parque tecnológico · Ikusi
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={exportCSV} className="btn-glass" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <FileDown size={16} /> Exportar CSV
          </button>
          <Link to="/assets?filter=risk" className="btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={16} /> Auditoría de Riesgos
          </Link>
        </div>
      </header>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <section className="kpi-row">

        <Link to="/assets" className="kpi-card kpi-green" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="kpi-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
            <MonitorSmartphone size={22} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Activos Totales</span>
            <span className="kpi-value">{metrics?.totalAssets || 0}</span>
            <span className="kpi-sub">equipos registrados</span>
          </div>
        </Link>

        <Link to="/assets?status=IN_USE" className="kpi-card kpi-blue" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="kpi-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
            <Activity size={22} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Asignados (En Uso)</span>
            <span className="kpi-value" style={{ color: '#3b82f6' }}>{metrics?.activeAssignments || 0}</span>
            <span className="kpi-sub">con firma aceptada</span>
          </div>
        </Link>

        <Link to="/assets?status=PENDING_ACCEPTANCE" className="kpi-card kpi-amber" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="kpi-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
            <Clock size={22} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Pendientes de Firma</span>
            <span className="kpi-value" style={{ color: '#f59e0b' }}>{pendingFirma}</span>
            <span className="kpi-sub">esperando aceptación</span>
          </div>
        </Link>

        <Link to="/assets?filter=risk" className="kpi-card kpi-red" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="kpi-icon" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
            <ShieldCheck size={22} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">En Riesgo</span>
            <span className="kpi-value" style={{ color: '#ef4444' }}>{metrics?.obsoleteAssets || 0}</span>
            <span className="kpi-sub">garantía o deprec. vencida</span>
          </div>
        </Link>

        <Link to="/assets?status=AVAILABLE" className="kpi-card kpi-ikusi" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="kpi-icon" style={{ background: 'rgba(0,166,80,0.12)', color: '#00A650' }}>
            <Package size={22} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Disponibles</span>
            <span className="kpi-value" style={{ color: '#00A650' }}>{availableAssets}</span>
            <span className="kpi-sub">listos para asignar</span>
          </div>
        </Link>

      </section>

      {/* ── Charts Row ─────────────────────────────────────────────────────── */}
      <section className="dash-row">

        {/* Donut */}
        <div className="dash-card" style={{ flex: '1 1 260px' }}>
          <h3 className="dash-card-title">Estado del Inventario</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="count" nameKey="name">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip formatter={(v: any, n: string) => [v, n]} />
              <Legend iconType="circle" iconSize={10} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart */}
        <div className="dash-card" style={{ flex: '1 1 300px' }}>
          <h3 className="dash-card-title">Activos por Categoría</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={metrics?.assetsByCategory || []} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <XAxis dataKey="categoryName" stroke="var(--text-muted)" fontSize={12} />
              <YAxis allowDecimals={false} stroke="var(--text-muted)" fontSize={12} />
              <Tooltip cursor={{ fill: 'rgba(0,166,80,0.05)' }} />
              <Bar dataKey="count" fill="#00A650" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Activity feed */}
        <div className="dash-card dash-activity" style={{ flex: '1 1 240px' }}>
          <h3 className="dash-card-title">Actividad Reciente</h3>
          <div className="activity-list">
            {!metrics?.recentActivity?.length ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Sin movimientos recientes</p>
            ) : (
              metrics.recentActivity.slice(0, 6).map(act => (
                <div className="activity-item" key={act.id}>
                  <div className="activity-dot" style={{ background: act.type?.includes('RETURN') ? '#ef4444' : '#00A650' }} />
                  <div>
                    <p style={{ fontSize: '13px', margin: 0, lineHeight: 1.4 }}>
                      <Link to={`/collaborators/${act.collaboratorId}`} style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                        {act.description.split(' ')[0]}
                      </Link>{' '}{act.description.split(' ').slice(1).join(' ')}
                    </p>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(act.date).toLocaleDateString('es-CO')} {new Date(act.date).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          <Link to="/assets" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontSize: '13px', fontWeight: 500, marginTop: 'auto', paddingTop: '12px', display: 'block' }}>
            Ver catálogo →
          </Link>
        </div>

      </section>

      {/* ── Info Panels Row ─────────────────────────────────────────────────── */}
      <section className="dash-row">

        {/* Warranty table */}
        <div className="dash-card" style={{ flex: '2 1 400px' }}>
          <h3 className="dash-card-title">Próximos Vencimientos de Garantía</h3>
          {warrantyAssets.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No hay activos con garantía registrada.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  {['Placa', 'Categoría', 'Fecha Venc.', 'Días restantes', 'Estado'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid var(--border-subtle)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {warrantyAssets.map(a => {
                  const expired = a.daysLeft < 0;
                  const soon = a.daysLeft < 30 && a.daysLeft >= 0;
                  const color = expired ? '#ef4444' : soon ? '#f59e0b' : '#10b981';
                  const label = expired ? 'VENCIDA' : soon ? 'POR VENCER' : 'VIGENTE';
                  return (
                    <tr key={a.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px', fontWeight: 600 }}>{a.id}</td>
                      <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{a.categoryId}</td>
                      <td style={{ padding: '10px' }}>{a.expiryDate.toLocaleDateString('es-CO')}</td>
                      <td style={{ padding: '10px', fontWeight: 600, color }}>
                        {expired ? `Venció hace ${Math.abs(a.daysLeft)} días` : `${a.daysLeft} días`}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: `${color}18`, color, fontWeight: 700 }}>{label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Top collaborators */}
        <div className="dash-card" style={{ flex: '1 1 260px' }}>
          <h3 className="dash-card-title">
            <Users size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
            Top Colaboradores por Equipos
          </h3>
          {collabStats.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Sin asignaciones activas.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '8px' }}>
              {collabStats.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : '#cd7f32', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                    {i + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-main)' }}>{c.name}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.count} equipo{c.count !== 1 ? 's' : ''}</span>
                    </div>
                    <div style={{ height: '6px', borderRadius: '3px', background: 'var(--border-subtle, #e2e8f0)' }}>
                      <div style={{ height: '6px', borderRadius: '3px', background: '#00A650', width: `${(c.count / maxCollabCount) * 100}%`, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </section>

    </div>
  );
}

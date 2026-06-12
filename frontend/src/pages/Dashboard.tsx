import { Activity, ShieldCheck, MonitorSmartphone, ArrowRight, UserPlus, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a855f7'];

export default function Dashboard() {
  const { data: metrics, isLoading, error } = useQuery<DashboardMetrics>({
    queryKey: ['dashboard_metrics'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/dashboard`);
      return response.data;
    }
  });

  if (isLoading) return <div className="dashboard-container"><p className="title-glow">Cargando métricas...</p></div>;
  if (error) return <div className="dashboard-container"><p style={{color: 'red'}}>Error al cargar dashboard: {(error as Error).message}</p></div>;

  return (
    <div className="dashboard-container">
      
      {/* Hero Card */}
      <section className="hero-card">
        <div className="hero-content">
          <h1 className="title-glow" style={{ fontSize: '36px', marginBottom: '16px' }}>
            Inventario General
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '18px', lineHeight: '1.6', maxWidth: '600px', marginBottom: '32px' }}>
            Mantén el control total de los activos de Ikusi. Aquí puedes revisar de un vistazo el hardware disponible, equipos asignados y el ciclo de vida de los dispositivos.
          </p>
          <div className="hero-actions">
            <button onClick={async () => {
              try {
                const res = await axios.get(`${API_URL}/api/catalog/assets`);
                const data = res.data;
                const csvRows = ['ID,Status,Categoria,FechaCompra,GarantiaMeses,DepreciacionAnos'];
                for(const row of data) {
                  csvRows.push([row.id, row.status, row.categoryId, row.purchaseDate || '', row.warrantyMonths || '', row.depreciationYears || ''].join(','));
                }
                const blob = new Blob([csvRows.join('\\n')], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'Inventario_Ikusi.csv';
                a.click();
              } catch(e) {
                alert('Error exportando reporte');
              }
            }} className="btn-primary" style={{ padding: '12px 24px', fontSize: '16px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowRight size={20} />
              Exportar Reporte (JSON/CSV)
            </button>
            <Link to="/assets?filter=risk" className="btn-glass" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Auditoría de Riesgos
              <ShieldCheck size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Floating Cards Grid */}
      <section className="bento-grid">
        <Link to="/assets" className="floating-card bento-card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
          <div className="bento-header">
            <div className="stat-icon" style={{ background: 'var(--ikusi-green-light)', color: 'var(--status-active)' }}>
              <MonitorSmartphone size={24} />
            </div>
          </div>
          <div className="bento-body">
            <h3>Activos Totales</h3>
            <p className="stat-value">{metrics?.totalAssets || 0}</p>
            <span className="stat-label">Equipos registrados en el sistema</span>
          </div>
        </Link>

        <Link to="/assets?status=IN_USE" className="floating-card bento-card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
          <div className="bento-header">
            <div className="stat-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'var(--accent-blue)' }}>
              <Activity size={24} />
            </div>
          </div>
          <div className="bento-body">
            <h3>Asignaciones Activas</h3>
            <p className="stat-value">{metrics?.activeAssignments || 0}</p>
            <span className="stat-label">Equipos actualmente en uso</span>
          </div>
        </Link>


        <Link to="/assets?filter=risk" className="floating-card bento-card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
          <div className="bento-header">
            <div className="stat-icon" style={{ background: 'rgba(220, 38, 38, 0.1)', color: 'var(--accent-red)' }}>
              <ShieldCheck size={24} />
            </div>
          </div>
          <div className="bento-body">
            <h3>Equipos en Riesgo</h3>
            <p className="stat-value" style={{ color: 'var(--accent-red)' }}>{metrics?.obsoleteAssets || 0}</p>
            <span className="stat-label">En uso pero obsoletos o sin garantía</span>
          </div>
        </Link>

        <div className="floating-card bento-card activity-card">
          <div className="bento-header">
            <div className="stat-icon" style={{ background: '#f1f5f9', color: 'var(--text-muted)' }}>
              <Clock size={24} />
            </div>
            <h3 style={{ marginLeft: '12px' }}>Últimos Movimientos</h3>
          </div>
          <div className="activity-list">
            {metrics?.recentActivity?.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No hay movimientos recientes registrados
              </div>
            ) : (
              metrics?.recentActivity?.map(act => (
                <div className="activity-item" key={act.id}>
                  <div className="activity-dot" style={{borderColor: act.type.includes('RETURN') ? 'var(--accent-red)' : 'var(--ikusi-green)'}}></div>
                  <div className="activity-details">
                    <p>
                      <Link to={`/collaborators/${act.collaboratorId}`} style={{ color: 'var(--text-main)', textDecoration: 'underline', fontWeight: 500 }}>
                        {act.description.split(' ')[0] /* Obtiene el primer nombre temporalmente */}
                      </Link> 
                      {' ' + act.description.split(' ').slice(1).join(' ')}
                    </p>
                    <span className="activity-time">{new Date(act.date).toLocaleDateString()} {new Date(act.date).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="activity-footer">
            <Link to="/assets" style={{color: 'var(--accent-blue)', textDecoration: 'none', fontSize: '14px', fontWeight: 500}}>
              Ver el catálogo
            </Link>
          </div>
        </div>

      </section>

      {/* DASHBOARD CHARTS */}
      <section className="bento-grid" style={{ marginTop: '20px' }}>
        {/* Gráfico 1: Estado del Inventario */}
        <div className="floating-card bento-card" style={{ padding: '20px', minHeight: '350px' }}>
          <h3 style={{ marginBottom: '20px', color: 'var(--text-main)' }}>Estado del Inventario</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={metrics?.assetsByStatus || []}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="count"
                nameKey="status"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {metrics?.assetsByStatus?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number, name: string) => [value, name]} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico 2: Activos por Categoría */}
        <div className="floating-card bento-card" style={{ padding: '20px', minHeight: '350px' }}>
          <h3 style={{ marginBottom: '20px', color: 'var(--text-main)' }}>Activos por Categoría</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics?.assetsByCategory || []}>
              <XAxis dataKey="categoryName" stroke="var(--text-muted)" />
              <YAxis allowDecimals={false} stroke="var(--text-muted)" />
              <Tooltip cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }} />
              <Bar dataKey="count" fill="var(--ikusi-green-light)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

    </div>
  );
}

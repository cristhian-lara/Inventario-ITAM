import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';

const COLORS_TYPE = ['#14b8a6', '#a855f7'];

interface Props {
  typeData: { name: string; value: number }[];
  statusData: { status: string; count: number }[];
  monthlyData: { month: string; Preventivo: number; Correctivo: number }[];
}

export default function MaintenanceChartsSidebar({ typeData, statusData, monthlyData }: Props) {
  return (
    <div className="charts-sidebar">
      <div className="dash-card">
        <h3 className="dash-card-title">Preventivo vs Correctivo</h3>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={typeData} cx="50%" cy="45%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" nameKey="name">
              {typeData.map((_, i) => <Cell key={i} fill={COLORS_TYPE[i]} />)}
            </Pie>
            <Tooltip />
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        </ResponsiveContainer>
      </div>

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
  );
}

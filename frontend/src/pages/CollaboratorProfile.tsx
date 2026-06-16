import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { ArrowLeft, User, Mail, MapPin, Building, Calendar, Clock, MonitorSmartphone, Activity, Tag, Hash, Box } from 'lucide-react';
import './CollaboratorProfile.css';
import { API_URL } from '../config';

interface HistoryEvent {
  id: string;
  collaboratorId: string;
  action: 'CREATED' | 'ACTIVATED' | 'DEACTIVATED' | 'ASSET_ASSIGNED' | 'ASSET_RETURNED' | 'DEPARTMENT_CHANGED';
  timestamp: string;
  reason: string;
}

const ACTION_LABELS: Record<string, string> = {
  CREATED:            'Alta Usuario',
  ACTIVATED:          'Activación',
  DEACTIVATED:        'Baja Usuario',
  ASSET_ASSIGNED:     'Activo Asignado',
  ASSET_RETURNED:     'Activo Devuelto',
  DEPARTMENT_CHANGED: 'Cambio Departamento',
};

const translateAction = (action: string) => ACTION_LABELS[action] ?? action;

export default function CollaboratorProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: collaborator, isLoading: isLoadingCollab } = useQuery({
    queryKey: ['collaborator', id],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/collaborators/${id}`);
      return response.data;
    }
  });

  const { data: history, isLoading: isLoadingHistory } = useQuery<HistoryEvent[]>({
    queryKey: ['collaborator-history', id],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/collaborators/${id}/history`);
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

  const { data: categories } = useQuery<any[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/catalog/categories`);
      return response.data;
    }
  });

  const { data: departments } = useQuery<any[]>({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/collaborators/departments`);
      return response.data;
    }
  });

  const { data: activeAssignments } = useQuery({
    queryKey: ['assignments'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/assignments`);
      return response.data.filter((a: any) => a.collaboratorId === collaborator?.id);
    },
    enabled: !!collaborator
  });

  if (isLoadingCollab || isLoadingHistory) return <div className="loading-container"><div className="spinner"></div><p>Cargando perfil...</p></div>;
  if (!collaborator) return <div className="error-glass">No se encontró al colaborador.</div>;

  return (
    <div className="profile-container">
      <header className="profile-header">
        <button className="btn-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} /> Volver
        </button>
      </header>

      <div className="profile-grid">
        {/* Lado Izquierdo: Tarjeta de Perfil */}
        <div className="profile-card glass-panel">
          <div className="profile-avatar">
            <User size={64} color="var(--primary-color)" />
          </div>
          <h2 className="profile-name">{collaborator.name}</h2>
          <span className={`badge badge-${collaborator.status.toLowerCase()} profile-status`}>
            {collaborator.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
          </span>
          
          <div className="profile-details">
            <div className="detail-item">
              <Mail size={18} />
              <span>{collaborator.email}</span>
            </div>
            <div className="detail-item">
              <Building size={18} />
              <span>{departments?.find(d => String(d.id) === String(collaborator.department))?.name || collaborator.department}</span>
            </div>
            <div className="detail-item">
              <MapPin size={18} />
              <span>{collaborator.location}</span>
            </div>
            <div className="detail-item">
              <Calendar size={18} />
              <span>Alta: {new Date(collaborator.activationDate).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Lado Derecho: Pestañas de Info */}
        <div className="profile-content">
          
          <div className="content-section glass-panel">
            <h3 className="section-title"><MonitorSmartphone size={20} /> Activos Asignados Actualmente</h3>
            {activeAssignments && activeAssignments.length > 0 ? (
              <div className="assets-grid">
                {activeAssignments.map((a: any) => {
                  const asset = assets?.find(ast => ast.id === a.assetId);
                  const attrs = asset?.dynamicAttributes || {};
                  const hostname = attrs['Hostname'] || attrs['hostname'] || attrs['HOSTNAME'] || attrs['Host'] || attrs['host'];
                  const modelo = attrs['Modelo'] || attrs['modelo'] || attrs['Marca'] || attrs['marca'] || 'Sin modelo';
                  const serial = asset?.serial || 'Sin serial';

                  // Considera "Ikusi" si el ID tiene formato numérico (ej. 000264) o prefijo IKU/PLA, O si tiene hostname
                  const isIkusi = !!hostname || /^\d{5,}$/.test(asset?.id || '') || asset?.id?.startsWith('IKU-') || asset?.id?.startsWith('PLA-');

                  return (
                    <div 
                      key={a.id} 
                      className="asset-card" 
                      onClick={() => asset && navigate(`/assets/${asset.id}`)}
                      style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.3)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
                    >
                      <div className="asset-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Box size={16} /> 
                          {asset?.id?.startsWith('IKU-') || asset?.id?.startsWith('PLA-') ? `Placa: ${asset?.id}` : `ID: ${asset?.id}`}
                        </h4>
                        <span className="badge badge-in_use">En Uso</span>
                      </div>
                      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {isIkusi ? (
                          <>
                            <div style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Tag size={14} color="var(--primary-color)" /> 
                              <strong>Hostname:</strong> {hostname || 'N/A'}
                            </div>
                            <div style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Hash size={14} color="var(--primary-color)" /> 
                              <strong>Serial:</strong> {serial}
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Hash size={14} color="var(--primary-color)" /> 
                              <strong>Serial:</strong> {serial !== 'Sin serial' ? serial : modelo}
                            </div>
                            <div style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Tag size={14} color="var(--primary-color)" /> 
                              <strong>Detalle:</strong> {modelo !== 'Sin modelo' ? modelo : (hostname || 'N/A')}
                            </div>
                          </>
                        )}
                      </div>
                      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                          Asignado el: {new Date(a.startDate).toLocaleDateString()}
                        </p>
                        {a.documentPath && (
                          <a href={`${API_URL}${a.documentPath}`} target="_blank" rel="noreferrer" className="btn-link" style={{ fontSize: '12px', textDecoration: 'none', color: 'var(--primary-color)' }}>
                            Ver Acta Firmada
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="empty-text">Este colaborador no tiene activos asignados actualmente.</p>
            )}
          </div>

          <div className="content-section glass-panel">
            <h3 className="section-title"><Activity size={20} /> Histórico y Auditoría de Estados</h3>
            <div className="timeline">
              {history?.map((event, index) => {
                // Extraer el ID del activo del campo reason (ej. "Activo 000264 asignado...")
                const isAssetEvent = event.action === 'ASSET_ASSIGNED' || event.action === 'ASSET_RETURNED';
                let assetCategoryName: string | null = null;
                if (isAssetEvent) {
                  const match = event.reason?.match(/Activo\s+([^\s]+)/i);
                  if (match) {
                    const assetId = match[1];
                    const foundAsset = assets?.find((a: any) => a.id === assetId);
                    if (foundAsset) {
                      const cat = categories?.find((c: any) => c.id === Number(foundAsset.categoryId));
                      assetCategoryName = cat?.name ?? null;
                    }
                  }
                }

                return (
                  <div key={event.id} className="timeline-item">
                    <div className="timeline-connector"></div>
                    <div className={`timeline-dot ${event.action.toLowerCase()}`}></div>
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span className={`badge-sm badge-${event.action.toLowerCase()}`}>{translateAction(event.action)}</span>
                          {assetCategoryName && (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              fontSize: '11px', fontWeight: 600,
                              background: 'rgba(0,166,80,0.1)', color: 'var(--ikusi-green, #00a650)',
                              border: '1px solid rgba(0,166,80,0.25)',
                              borderRadius: '5px', padding: '2px 8px',
                              whiteSpace: 'nowrap'
                            }}>
                              <Tag size={10} />
                              {assetCategoryName}
                            </span>
                          )}
                        </div>
                        <span className="timeline-date"><Clock size={14}/> {new Date(event.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="timeline-reason">{event.reason}</p>
                    </div>
                  </div>
                );
              })}
              {history?.length === 0 && <p className="empty-text">No hay eventos registrados.</p>}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}

import { useState } from 'react';
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

export default function CollaboratorProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

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
        <button className="btn-back" onClick={() => navigate('/collaborators')}>
          <ArrowLeft size={20} /> Volver a Colaboradores
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
                  const isIkusi = asset?.id?.startsWith('IKU-') || asset?.id?.startsWith('PLA-');
                  const serial = asset?.serial || 'Sin serial';
                  
                  // Extraer hostname o modelo de atributos dinámicos
                  const attrs = asset?.dynamicAttributes || {};
                  const hostname = attrs['Hostname'] || attrs['hostname'] || attrs['Nombre'] || attrs['nombre'];
                  const modelo = attrs['Modelo'] || attrs['modelo'] || attrs['Marca'] || attrs['marca'] || 'Sin modelo';

                  return (
                    <div 
                      key={a.id} 
                      className="asset-card" 
                      onClick={() => asset && setSelectedAsset(asset)}
                      style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.3)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
                    >
                      <div className="asset-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Box size={16} /> 
                          {isIkusi ? `Placa: ${asset?.id}` : `ID: ${asset?.id}`}
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
              {history?.map((event, index) => (
                <div key={event.id} className="timeline-item">
                  <div className="timeline-connector"></div>
                  <div className={`timeline-dot ${event.action.toLowerCase()}`}></div>
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <span className={`badge-sm badge-${event.action.toLowerCase()}`}>{event.action}</span>
                      <span className="timeline-date"><Clock size={14}/> {new Date(event.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="timeline-reason">{event.reason}</p>
                  </div>
                </div>
              ))}
              {history?.length === 0 && <p className="empty-text">No hay eventos registrados.</p>}
            </div>
          </div>

        </div>
      </div>

      {/* Modal de Detalle de Activo */}
      {selectedAsset && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px' }} onClick={() => setSelectedAsset(null)}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', margin: 0, padding: '30px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedAsset(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px', padding: '5px' }}>✕</button>
            <h3 style={{ marginBottom: '24px', color: 'var(--text-main)', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Box size={24} color="var(--primary-color)" /> Detalles del Activo: {selectedAsset.id}
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: 'var(--text-muted)' }}>Categoría</p>
                <span className="badge badge-category" style={{ padding: '4px 12px' }}>{selectedAsset.categoryId}</span>
              </div>
              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: 'var(--text-muted)' }}>Estado</p>
                <span className={`badge badge-status badge-${selectedAsset.status?.toLowerCase()}`} style={{ padding: '4px 12px' }}>
                  {selectedAsset.status === 'IN_USE' ? 'En Uso' : selectedAsset.status}
                </span>
              </div>
              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: 'var(--text-muted)' }}>Serial</p>
                <div style={{ fontFamily: 'monospace', color: 'var(--text-main)' }}>{selectedAsset.serial || 'N/A'}</div>
              </div>
              {selectedAsset.purchaseDate && (
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: 'var(--text-muted)' }}>Fecha de Compra</p>
                  <div style={{ color: 'var(--text-main)' }}>{new Date(selectedAsset.purchaseDate).toLocaleDateString()}</div>
                </div>
              )}
            </div>

            <div>
              <h4 style={{ marginBottom: '16px', color: 'var(--text-main)', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>
                <MonitorSmartphone size={18} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                Especificaciones y Atributos Dinámicos
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {Object.entries(selectedAsset.dynamicAttributes || {}).map(([k, v]) => {
                  if (v === null || v === undefined || v === '') return null;
                  return (
                    <div key={k} style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', flex: '1 1 calc(50% - 10px)', minWidth: '200px' }}>
                      <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{k}</p>
                      <div style={{ color: 'var(--text-main)', fontSize: '14px', wordBreak: 'break-word' }}>{String(v)}</div>
                    </div>
                  );
                })}
                {(!selectedAsset.dynamicAttributes || Object.values(selectedAsset.dynamicAttributes).every(v => v === null || v === undefined || v === '')) && (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '14px' }}>Sin especificaciones registradas.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

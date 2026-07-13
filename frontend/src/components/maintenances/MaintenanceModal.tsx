import { Calendar, Wrench, CheckCircle } from 'lucide-react';

export interface MaintenanceFormData {
  assetId: string;
  type: string;
  scheduledDate: string;
  reason: string;
  startNote: string;
  notes: string;
  executionDate: string;
  realStartDate: string;
  realEndDate: string;
}

interface Props {
  mode: 'create' | 'start' | 'complete' | 'view' | 'forceSign';
  selectedRecord: any | null;
  errorMsg: string;
  formData: MaintenanceFormData;
  setFormData: (updater: MaintenanceFormData | ((prev: MaintenanceFormData) => MaintenanceFormData)) => void;
  assetSearchTerm: string;
  setAssetSearchTerm: (value: string) => void;
  showAssetDropdown: boolean;
  setShowAssetDropdown: (value: boolean) => void;
  assets: any[] | undefined;
  getCollaboratorForAsset: (assetId: string) => string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

export default function MaintenanceModal({
  mode,
  selectedRecord,
  errorMsg,
  formData,
  setFormData,
  assetSearchTerm,
  setAssetSearchTerm,
  showAssetDropdown,
  setShowAssetDropdown,
  assets,
  getCollaboratorForAsset,
  onClose,
  onSubmit,
  isPending
}: Props) {
  const filteredAssets = assets?.filter(a => {
    if (!assetSearchTerm) return true;
    const term = assetSearchTerm.toLowerCase();
    const placa = (a.id || '').toLowerCase();
    const hostname = (a.dynamicAttributes?.HOSTNAME || a.dynamicAttributes?.Hostname || a.dynamicAttributes?.hostname || '').toLowerCase();
    const collab = getCollaboratorForAsset(a.id).toLowerCase();
    return placa.includes(term) || hostname.includes(term) || collab.includes(term);
  });

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
      <div className="glass-panel" style={{ padding: '30px', maxWidth: '500px', width: '100%' }}>
        <h3 style={{ marginBottom: '20px', color: 'white' }}>
          {mode === 'create' ? 'Programar Mantenimiento' : mode === 'start' ? 'Iniciar Mantenimiento' : mode === 'view' ? 'Historial de Mantenimiento' : mode === 'forceSign' ? 'Firmar Forzadamente' : 'Completar Mantenimiento'}
        </h3>
        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            {errorMsg}
          </div>
        )}
        <form onSubmit={onSubmit}>
          {mode === 'create' && (
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
                    {filteredAssets?.slice(0, 5).map(a => (
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
                        onMouseDown={() => {
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
                    {filteredAssets?.length === 0 && (
                      <li style={{ padding: '10px 15px', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                        No se encontraron activos
                      </li>
                    )}
                  </ul>
                )}
              </div>
              <div className="form-group">
                <label>Tipo</label>
                <select className="glass-input" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
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
          {mode === 'start' && (
            <>
              <p style={{ color: 'var(--text-muted)', marginBottom: '15px' }}>Iniciando mantenimiento para el activo <b>{selectedRecord?.assetId}</b>.</p>
              <div className="form-group">
                <label>Diagnóstico Inicial / Notas de Inicio</label>
                <input required type="text" className="glass-input" value={formData.startNote} onChange={e => setFormData({ ...formData, startNote: e.target.value })} placeholder="Ej. Limpieza interna, Cambio de pasta térmica..." />
              </div>
            </>
          )}
          {mode === 'complete' && (
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
          {mode === 'forceSign' && (
            <div className="form-group">
              <label>Motivo de firma forzada</label>
              <textarea required className="glass-input" value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} placeholder="Ej. El usuario no tiene acceso al sistema..." style={{ minHeight: '80px', resize: 'vertical' }} />
            </div>
          )}
          {mode === 'view' && selectedRecord && (
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
            <button type="button" className="btn-glass" onClick={onClose}>{mode === 'view' ? 'Cerrar' : 'Cancelar'}</button>
            {mode !== 'view' && (
              <button type="submit" className="btn-primary" disabled={isPending}>
                {isPending ? 'Guardando...' : 'Confirmar'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

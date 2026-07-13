import { Send, UserCheck } from 'lucide-react';

export interface AssignFormData {
  id: string;
  assetId: string;
  collaboratorId: string;
  collaboratorEmail: string;
  collaboratorName: string;
  startDate: string;
  assignmentType: 'PERMANENT' | 'LOAN';
  expectedReturnDate: string;
}

interface Props {
  formData: AssignFormData;
  setFormData: (updater: AssignFormData | ((prev: AssignFormData) => AssignFormData)) => void;
  collaborators: any[] | undefined;
  collabSearchTerm: string;
  setCollabSearchTerm: (value: string) => void;
  showCollabDropdown: boolean;
  setShowCollabDropdown: (value: boolean) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

export default function AssignAssetModal({
  formData,
  setFormData,
  collaborators,
  collabSearchTerm,
  setCollabSearchTerm,
  showCollabDropdown,
  setShowCollabDropdown,
  onClose,
  onSubmit,
  isPending
}: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const filteredCollaborators = collaborators
    ?.filter(c => c.status === 'ACTIVE' && (collabSearchTerm === '' || c.name.toLowerCase().includes(collabSearchTerm.toLowerCase())));

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px' }}>
      <div className="glass-panel form-container" style={{ position: 'relative', width: '100%', maxWidth: '900px', margin: 0 }}>
        <button
          className="btn-glass"
          style={{ position: 'absolute', top: '20px', right: '20px', padding: '8px' }}
          onClick={onClose}
        >
          ✕
        </button>

        <div className="form-sidebar">
          <div className="icon-wrapper">
            <UserCheck size={48} />
          </div>
          <h3>Asignación Rápida</h3>
          <p>Al procesar la asignación, el sistema generará un Token criptográfico JWT y enviará un correo electrónico para capturar la firma digital del empleado.</p>
        </div>

        <form onSubmit={onSubmit} className="assignment-form">
          <div className="form-group">
            <label>ID de Asignación Temporal</label>
            <input type="text" className="glass-input" name="id" value={formData.id} disabled />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Placa Ikusi</label>
              <input type="text" className="glass-input" name="assetId" value={formData.assetId} disabled />
            </div>
            <div className="form-group" style={{ position: 'relative' }}>
              <label>Colaborador</label>
              <input
                type="text"
                required
                className="glass-input"
                placeholder="Buscar colaborador..."
                value={collabSearchTerm}
                onChange={(e) => {
                  setCollabSearchTerm(e.target.value);
                  setShowCollabDropdown(true);
                  if (!e.target.value) {
                    setFormData({ ...formData, collaboratorEmail: '', collaboratorId: '', collaboratorName: '' });
                  }
                }}
                onFocus={() => setShowCollabDropdown(true)}
                onBlur={() => setTimeout(() => setShowCollabDropdown(false), 200)}
                style={{ background: 'rgba(0,0,0,0.2)', color: 'white' }}
              />
              {showCollabDropdown && (
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
                  {filteredCollaborators?.slice(0, 5).map(c => (
                    <li
                      key={c.id}
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
                        setCollabSearchTerm(c.name);
                        setFormData({
                          ...formData,
                          collaboratorEmail: c.email,
                          collaboratorId: c.id,
                          collaboratorName: c.name
                        });
                        setShowCollabDropdown(false);
                      }}
                    >
                      <div style={{ fontWeight: 500 }}>{c.name}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>{c.email}</div>
                    </li>
                  ))}
                  {filteredCollaborators?.length === 0 && (
                    <li style={{ padding: '10px 15px', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                      No se encontraron colaboradores
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Correo Electrónico (Autocompletado)</label>
            <input type="email" className="glass-input" name="collaboratorEmail" value={formData.collaboratorEmail} disabled />
          </div>

          <div className="form-group">
            <label>Fecha de Asignación</label>
            <input type="date" className="glass-input" name="startDate" value={formData.startDate} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Modalidad de Asignación</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className={formData.assignmentType === 'PERMANENT' ? 'btn-primary' : 'btn-glass'}
                style={{ flex: 1, padding: '10px' }}
                onClick={() => setFormData({ ...formData, assignmentType: 'PERMANENT', expectedReturnDate: '' })}
              >
                Permanente
              </button>
              <button
                type="button"
                className={formData.assignmentType === 'LOAN' ? 'btn-primary' : 'btn-glass'}
                style={{ flex: 1, padding: '10px' }}
                onClick={() => setFormData({ ...formData, assignmentType: 'LOAN' })}
              >
                Préstamo
              </button>
            </div>
          </div>

          {formData.assignmentType === 'LOAN' && (
            <div className="form-group">
              <label>Fecha de Devolución Esperada</label>
              <input
                type="date"
                className="glass-input"
                name="expectedReturnDate"
                min={formData.startDate}
                value={formData.expectedReturnDate}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <button type="submit" className="btn-primary submit-btn" disabled={isPending}>
            {isPending ? 'Procesando...' : <><Send size={18} /> Procesar Asignación</>}
          </button>
        </form>
      </div>
    </div>
  );
}

import { Plus, Edit2, UserPlus } from 'lucide-react';

export interface CollaboratorFormData {
  name: string;
  email: string;
  department: string;
  location: string;
  isLeader: boolean;
  leaderId: string;
  cecos: string;
  activationDate: string;
}

interface Props {
  formData: CollaboratorFormData;
  setFormData: (updater: CollaboratorFormData | ((prev: CollaboratorFormData) => CollaboratorFormData)) => void;
  locationType: string;
  setLocationType: (value: string) => void;
  departments: any[] | undefined;
  cecosList: any[] | undefined;
  collaborators: any[];
  editingId: string | null;
  departmentHasLeader: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

export default function CollaboratorFormModal({
  formData,
  setFormData,
  locationType,
  setLocationType,
  departments,
  cecosList,
  collaborators,
  editingId,
  departmentHasLeader,
  onClose,
  onSubmit,
  isPending
}: Props) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px' }}>
      <div className="glass-panel" style={{ position: 'relative', width: '100%', maxWidth: '500px', margin: 0, padding: '30px', maxHeight: '90vh', overflowY: 'auto' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '5px', fontSize: '18px' }}
        >
          ✕
        </button>
        <h3 style={{ marginBottom: '24px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '22px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px', marginTop: 0 }}>
          <UserPlus size={24} color="var(--ikusi-green)" /> Registrar Colaborador
        </h3>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label>Nombre Completo</label>
            <input required className="glass-input" type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Correo Electrónico</label>
            <input required className="glass-input" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} disabled={!!editingId} style={editingId ? { opacity: 0.6, cursor: 'not-allowed' } : {}} />
          </div>
          <div className="form-group">
            <label>Fecha de Alta (Ingreso)</label>
            <input required className="glass-input" type="date" value={formData.activationDate} onChange={e => setFormData({ ...formData, activationDate: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Departamento</label>
            <select
              required
              className="glass-input"
              value={formData.department}
              onChange={e => setFormData({ ...formData, department: e.target.value })}
            >
              <option value="" disabled>Seleccione un departamento</option>
              {departments?.map(dep => (
                <option key={dep.id} value={dep.id}>{dep.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Localidad / Sede</label>
            <select
              className="glass-input"
              value={locationType}
              onChange={e => setLocationType(e.target.value)}
            >
              <option value="Medellín">Medellín</option>
              <option value="Bogotá">Bogotá</option>
              <option value="Otra">Otra (Especifique)</option>
            </select>
            {locationType === 'Otra' && (
              <input
                required
                className="glass-input"
                type="text"
                placeholder="Escriba la ciudad o sede"
                style={{ marginTop: '8px' }}
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
              />
            )}
          </div>

          <div className="form-group">
            <label>CECOS (Centro de Costos)</label>
            <select
              required
              className="glass-input"
              value={formData.cecos}
              onChange={e => setFormData({ ...formData, cecos: e.target.value })}
            >
              <option value="" disabled>Seleccione un CECOS</option>
              {cecosList?.map((c: any) => (
                <option key={c.id} value={c.id}>{c.id} - {c.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="checkbox"
              id="isLeader"
              checked={departmentHasLeader ? false : formData.isLeader}
              disabled={departmentHasLeader}
              onChange={e => setFormData({ ...formData, isLeader: e.target.checked })}
              style={{ width: '18px', height: '18px', cursor: departmentHasLeader ? 'not-allowed' : 'pointer' }}
            />
            <label htmlFor="isLeader" style={{ margin: 0, cursor: departmentHasLeader ? 'not-allowed' : 'pointer', color: departmentHasLeader ? 'var(--text-muted)' : 'inherit' }}>
              ¿Es un Líder del departamento seleccionado?
              {departmentHasLeader && <span style={{ display: 'block', fontSize: '12px', color: '#ef4444' }}>Este departamento ya tiene un líder asignado.</span>}
            </label>
          </div>

          {!formData.isLeader && (
            <div className="form-group">
              <label>¿A quién reporta? (Líder asignado)</label>
              <select
                className="glass-input"
                value={formData.leaderId}
                onChange={e => setFormData({ ...formData, leaderId: e.target.value })}
              >
                <option value="">Ninguno / No aplica</option>
                {collaborators?.filter(c => c.isLeader).map(leader => (
                  <option key={leader.id} value={leader.id}>{leader.name}</option>
                ))}
              </select>
            </div>
          )}

          <button type="submit" className="btn-primary" style={{ marginTop: '16px', justifyContent: 'center' }} disabled={isPending}>
            {editingId ? <Edit2 size={20} /> : <Plus size={20} />} {isPending ? 'Guardando...' : (editingId ? 'Actualizar Registro' : 'Guardar Registro')}
          </button>
        </form>
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Plus, Search, UserCheck, UserX, UserPlus, Edit2 } from 'lucide-react';
import './Collaborators.css';

interface Collaborator {
  id: string;
  name: string;
  email: string;
  department: string;
  location: string;
  status: 'ACTIVE' | 'INACTIVE';
  isLeader: boolean;
  leaderId: string | null;
  dynamicAttributes: Record<string, any>;
}

export default function Collaborators() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', department: '', location: '', isLeader: false, leaderId: '', cecos: '' });
  const [locationType, setLocationType] = useState('Medellín');
  const queryClient = useQueryClient();

  const { data: collaborators = [] } = useQuery<Collaborator[]>({
    queryKey: ['collaborators'],
    queryFn: async () => {
      const response = await axios.get('http://localhost:3000/api/collaborators');
      return response.data;
    }
  });
  const { data: cecosList } = useQuery({
    queryKey: ['cecos'],
    queryFn: async () => {
      const response = await axios.get('http://localhost:3000/api/collaborators/cecos');
      return response.data;
    }
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: departments } = useQuery<any[]>({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await axios.get('http://localhost:3000/api/collaborators/departments');
      return response.data;
    }
  });

  const mutation = useMutation({
    mutationFn: (newCollab: any) => axios.post('http://localhost:3000/api/collaborators', {
      ...newCollab,
      leaderId: newCollab.leaderId || null,
      dynamicAttributes: { CECOS: newCollab.cecos }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
      setIsModalOpen(false);
      setFormData({ name: '', email: '', department: '', location: '', isLeader: false, leaderId: '', cecos: '' });
    }
  });

  
  const editMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: formData.name,
        departmentId: formData.department,
        location: formData.locationType === 'Otra' ? formData.location : formData.locationType,
        status: 'ACTIVE',
        isLeader: formData.isLeader,
        leaderId: formData.isLeader ? undefined : formData.leaderId,
        dynamicAttributes: { CECOS: formData.cecos }
      };
      const response = await axios.put(`http://localhost:3000/api/collaborators/${editingId}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ name: '', email: '', department: '', location: '', isLeader: false, leaderId: '', cecos: '' });
      setLocationType('Medellín');
    }
  });

  const handleEditClick = (collab: any) => {
    setEditingId(collab.id);
    const isOtherLocation = !['Medellín', 'Bogotá'].includes(collab.location);
    setLocationType(isOtherLocation ? 'Otra' : collab.location);
    setFormData({
      name: collab.name,
      email: collab.email,
      department: departments?.find((d: any) => d.name === collab.department)?.id || '',
      location: collab.location,
      isLeader: collab.isLeader || false,
      leaderId: collab.leaderId || '',
      cecos: collab.dynamicAttributes?.CECOS || ''
    });
    setIsModalOpen(true);
  };

  const toggleStatusMutation = useMutation({
    mutationFn: (id: string) => axios.patch(`http://localhost:3000/api/collaborators/${id}/toggle-status`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['collaborators'] })
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalLocation = locationType === 'Otra' ? formData.location : locationType;
    mutation.mutate({ ...formData, location: finalLocation });
  };

  const getDepartmentName = (deptId: string) => {
    const dep = departments?.find(d => d.id === deptId);
    return dep ? dep.name : deptId;
  };
  const departmentHasLeader = useMemo(() => {
    if (!formData.department) return false;
    const deptName = departments?.find((d: any) => d.id === formData.department)?.name;
    if (!deptName) return false;
    return collaborators.some((c: any) => c.department === deptName && c.isLeader && c.id !== editingId);
  }, [formData.department, collaborators, departments, editingId]);

  const filtered = collaborators.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="catalog-container">
      <header className="catalog-header">
        <div>
          <h1 className="page-title">Directorio de Colaboradores</h1>
          <p className="page-subtitle">Gestión de personal para asignación de equipos</p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <UserPlus size={20} />
          Nuevo Colaborador
        </button>
      </header>

      <div className="glass-panel table-container">
        <div className="table-controls">
          <div className="search-box">
            <Search className="search-icon" size={20} />
            <input 
              type="text" 
              className="glass-input search-input" 
              placeholder="Buscar por nombre o correo..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="glass-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo Electrónico</th>
                <th>Departamento</th>
                <th>Sede</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="table-row">
                  <td className="fw-600">
                    <Link to={`/collaborators/${c.id}`} style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>
                      {c.name}
                    </Link>
                  </td>
                  <td>{c.email}</td>
                  <td>{getDepartmentName(c.department)}</td>
                  <td>{c.location}</td>
                  <td>
                    <span className={`badge badge-${c.status.toLowerCase()}`}>
                      {c.status === 'ACTIVE' ? <UserCheck size={14} /> : <UserX size={14} />}
                      {c.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn-action" 
                      style={{ marginRight: '8px' }}
                      onClick={() => handleEditClick(c)}
                      title="Editar Colaborador"
                    >
                      <Edit2 size={16} />
                    </button>
                    <Link to={`/collaborators/${c.id}`} className="btn-action" style={{ marginRight: '8px', textDecoration: 'none' }}>
                      Perfil
                    </Link>
                    <button 
                      className={`btn-action ${c.status === 'ACTIVE' ? 'btn-danger' : 'btn-success'}`}
                      style={{ opacity: 1, transform: 'none' }}
                      onClick={() => toggleStatusMutation.mutate(c.id)}
                    >
                      {c.status === 'ACTIVE' ? 'Dar de Baja' : 'Reactivar'}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>No se encontraron colaboradores</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px' }}>
          <div className="glass-panel" style={{ position: 'relative', width: '100%', maxWidth: '500px', margin: 0, padding: '30px', maxHeight: '90vh', overflowY: 'auto' }}>
            <button 
              onClick={() => setIsModalOpen(false)}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '5px', fontSize: '18px' }}
            >
              ✕
            </button>
            <h3 style={{ marginBottom: '24px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '22px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px', marginTop: 0 }}>
              <UserPlus size={24} color="var(--ikusi-green)" /> Registrar Colaborador
            </h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Nombre Completo</label>
                <input required className="glass-input" type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Correo Electrónico</label>
                <input required className="glass-input" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Departamento</label>
                <select 
                  required 
                  className="glass-input" 
                  value={formData.department} 
                  onChange={e => setFormData({...formData, department: e.target.value})}
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
                    onChange={e => setFormData({...formData, location: e.target.value})} 
                  />
                )}
              </div>

              <div className="form-group">
                <label>CECOS (Centro de Costos)</label>
                <select 
                  required 
                  className="glass-input" 
                  value={formData.cecos} 
                  onChange={e => setFormData({...formData, cecos: e.target.value})}
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
                  onChange={e => setFormData({...formData, isLeader: e.target.checked})} 
                  style={{ width: '18px', height: '18px', cursor: departmentHasLeader ? 'not-allowed' : 'pointer' }}
                />
                <label htmlFor="isLeader" style={{ margin: 0, cursor: departmentHasLeader ? 'not-allowed' : 'pointer', color: departmentHasLeader ? 'var(--text-muted)' : 'inherit' }}>
                  ¿Es un Líder del departamento seleccionado?
                  {departmentHasLeader && <span style={{display: 'block', fontSize: '12px', color: '#ef4444'}}>Este departamento ya tiene un líder asignado.</span>}
                </label>
              </div>

              {!formData.isLeader && (
                <div className="form-group">
                  <label>¿A quién reporta? (Líder asignado)</label>
                  <select 
                    className="glass-input" 
                    value={formData.leaderId} 
                    onChange={e => setFormData({...formData, leaderId: e.target.value})}
                  >
                    <option value="">Ninguno / No aplica</option>
                    {collaborators?.filter(c => c.isLeader).map(leader => (
                      <option key={leader.id} value={leader.id}>{leader.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <button type="submit" className="btn-primary" style={{ marginTop: '16px', justifyContent: 'center' }} disabled={mutation.isPending}>
                {editingId ? <Edit2 size={20} /> : <Plus size={20} />} {(mutation.isPending || editMutation.isPending) ? 'Guardando...' : (editingId ? 'Actualizar Registro' : 'Guardar Registro')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

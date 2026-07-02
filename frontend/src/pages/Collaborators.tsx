import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import ActionMenu from '../components/ActionMenu';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Plus, Search, UserCheck, UserX, UserPlus, Edit2, Upload, Eye, Crown } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext';
import { showWebexFailureModal } from '../utils/notificationNotice';
import './Collaborators.css';
import { API_URL } from '../config';

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
  activationDate?: string;
  assignedAssetsCount?: number;
}

export default function Collaborators() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  useEffect(() => { setCurrentPage(1); }, [searchTerm]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', department: '', location: '', isLeader: false, leaderId: '', cecos: '', activationDate: new Date().toISOString().split('T')[0] });
  const [locationType, setLocationType] = useState('Medellín');
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{successful: number, failed: number, errors: string[]} | null>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_URL}/api/collaborators/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImportResult(response.data);
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
    } catch (error: any) {
      confirm({
        title: 'Error de Importación',
        message: 'Error en la importación: ' + (error.response?.data?.error || error.message),
        type: 'danger',
        onConfirm: () => {}
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const { data: collaborators = [] } = useQuery<Collaborator[]>({
    queryKey: ['collaborators'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/collaborators`);
      return response.data;
    }
  });
  const { data: cecosList } = useQuery({
    queryKey: ['cecos'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/collaborators/cecos`);
      return response.data;
    }
  });

  const { data: assignmentsList = [] } = useQuery({
    queryKey: ['assignments'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/assignments`);
      return response.data;
    }
  });

  const { data: assetsList = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/catalog/assets`);
      return response.data;
    }
  });

  const { data: categoriesList = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/catalog/categories`);
      return response.data;
    }
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  const [batchReturnModalOpen, setBatchReturnModalOpen] = useState(false);
  const [selectedCollabForReturn, setSelectedCollabForReturn] = useState<Collaborator | null>(null);
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<string[]>([]);
  const [isBatchReturning, setIsBatchReturning] = useState(false);
  const [returnReason, setReturnReason] = useState('');

  const handleOpenBatchReturn = (collab: Collaborator) => {
    setSelectedCollabForReturn(collab);
    setBatchReturnModalOpen(true);
    setSelectedAssignmentIds([]); // Reset selection
    setReturnReason(''); // Reset reason
  };

  const handleBatchReturnSubmit = async () => {
    if (selectedAssignmentIds.length === 0 || !selectedCollabForReturn) return;
    setIsBatchReturning(true);
    try {
        const response = await axios.post(`${API_URL}/api/assignments/batch-return`, {
            assignmentIds: selectedAssignmentIds,
            email: selectedCollabForReturn.email,
            reason: returnReason
        });
        setBatchReturnModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['collaborators'] });
        queryClient.invalidateQueries({ queryKey: ['assignments'] });
        if (!showWebexFailureModal(confirm, response.data)) {
            confirm({
                title: 'Éxito',
                message: 'El acta de devolución múltiple ha sido enviada al colaborador por Webex.',
                type: 'success',
                onConfirm: () => {}
            });
        }
    } catch (error: any) {
        confirm({
            title: 'Error',
            message: error.response?.data?.error || 'Error al iniciar devolución',
            type: 'danger',
            onConfirm: () => {}
        });
    } finally {
        setIsBatchReturning(false);
    }
  };

    const { data: departments } = useQuery<any[]>({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/collaborators/departments`);
      return response.data;
    }
  });


  

  const mutation = useMutation({
    mutationFn: (newCollab: any) => axios.post(`${API_URL}/api/collaborators`, {
      ...newCollab,
      department: Number(newCollab.department),
      leaderId: newCollab.leaderId || null,
      dynamicAttributes: { CECOS: newCollab.cecos }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
      setIsModalOpen(false);
      setFormData({ name: '', email: '', department: '', location: '', isLeader: false, leaderId: '', cecos: '', activationDate: new Date().toISOString().split('T')[0] });
    }
  });

  
  const editMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: formData.name,
        departmentId: Number(formData.department),
        location: locationType === 'Otra' ? formData.location : locationType,
        status: 'ACTIVE',
        isLeader: departmentHasLeader ? false : formData.isLeader,
        leaderId: (departmentHasLeader ? false : formData.isLeader) ? undefined : formData.leaderId,
        dynamicAttributes: { CECOS: formData.cecos },
        activationDate: formData.activationDate
      };
      const response = await axios.put(`${API_URL}/api/collaborators/${editingId}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ name: '', email: '', department: '', location: '', isLeader: false, leaderId: '', cecos: '', activationDate: new Date().toISOString().split('T')[0] });
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
      cecos: collab.dynamicAttributes?.CECOS || '',
      activationDate: collab.activationDate ? collab.activationDate.split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const toggleStatusMutation = useMutation({
    mutationFn: (id: string) => axios.patch(`${API_URL}/api/collaborators/${id}/toggle-status`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['collaborators'] })
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalLocation = locationType === 'Otra' ? formData.location : locationType;
    const finalIsLeader = departmentHasLeader ? false : formData.isLeader;
    
    const submitAction = () => {
      if (editingId) {
        editMutation.mutate();
      } else {
        mutation.mutate({ ...formData, location: finalLocation, isLeader: finalIsLeader, leaderId: finalIsLeader ? undefined : formData.leaderId });
      }
    };

    confirm({
      title: editingId ? 'Guardar Cambios' : 'Crear Colaborador',
      message: editingId ? '¿Estás seguro de guardar los cambios de este colaborador?' : '¿Estás seguro de registrar este nuevo colaborador?',
      type: 'info',
      onConfirm: submitAction
    });
  };

  const getDepartmentName = (deptId: string | number) => {
    const dep = departments?.find(d => String(d.id) === String(deptId));
    return dep ? dep.name : deptId;
  };

  const getCECOName = (cecoId: string | undefined) => {
    if (!cecoId) return 'N/A';
    const ceco = cecosList?.find((c: any) => c.id === cecoId);
    return ceco ? `${ceco.id} - ${ceco.name}` : cecoId;
  };
  const departmentHasLeader = useMemo(() => {
    if (!formData.department) return false;
    return collaborators.some((c: any) => String(c.department) === String(formData.department) && c.isLeader && c.id !== editingId);
  }, [formData.department, collaborators, editingId]);

  const filtered = collaborators.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="catalog-container">
      <header className="catalog-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            Directorio de Colaboradores
            {collaborators && (
              <span style={{ fontSize: '14px', background: 'var(--bg-glass)', padding: '4px 12px', borderRadius: '20px', color: 'var(--text-muted)', border: '1px solid var(--border-glass)', fontWeight: 500, letterSpacing: '0.3px', display: 'inline-block' }}>
                {filtered.length === collaborators.length ? `Total: ${collaborators.length}` : `Mostrando ${filtered.length} de ${collaborators.length}`}
              </span>
            )}
          </h1>
          <p className="page-subtitle">Gestión de personal para asignación de equipos</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={handleImport}
          />
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', background: 'var(--glass-bg)', color: 'var(--text-main)', border: '1px solid var(--border-glass)', cursor: 'pointer', fontWeight: '500', transition: 'all 0.3s ease' }} onClick={() => fileInputRef.current?.click()} disabled={importing}>
            <Upload size={20} />
            {importing ? 'Importando...' : 'Importar (.xlsx, .csv)'}
          </button>
          <button className="btn-primary" onClick={() => {
    setEditingId(null);
    setFormData({ name: '', email: '', department: '', location: '', isLeader: false, leaderId: '', cecos: '', activationDate: new Date().toISOString().split('T')[0] });
    setLocationType('Medellín');
    setIsModalOpen(true);
  }}>
            <UserPlus size={20} />
            Nuevo Colaborador
          </button>
        </div>
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
                <th>CECo</th>
                <th>Activos</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="table-row">
                  <td className="fw-600">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Link to={`/collaborators/${c.id}`} style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>
                        {c.name}
                      </Link>
                      {c.isLeader && (
                        <span 
                          title="Líder de Departamento" 
                          style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '4px',
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#f59e0b',
                            borderRadius: '50%'
                          }}
                        >
                          <Crown size={14} strokeWidth={2.5} />
                        </span>
                      )}
                    </div>
                  </td>
                  <td>{c.email}</td>
                  <td>{getDepartmentName(c.department)}</td>
                  <td>{c.location}</td>
                  <td>{getCECOName(c.dynamicAttributes?.CECOS)}</td>
                  <td>
                    {(() => {
                      // Compute asset types for this collaborator
                      const collabAssignments = assignmentsList.filter(
                        (a: any) => a.collaboratorId === c.id &&
                          (a.status === 'ACCEPTED' || a.status === 'PENDING_ACCEPTANCE')
                      );
                      const count = collabAssignments.length;
                      if (count === 0) {
                        return (
                          <span style={{ fontSize: '12px', color: '#adb5bd', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                              <circle cx="12" cy="12" r="10"/><path d="M8 12h8"/>
                            </svg>
                            Sin activos
                          </span>
                        );
                      }
                      const tooltip = `${count} activo${count !== 1 ? 's' : ''} asignado${count !== 1 ? 's' : ''} \u2022 Click para gestionar devoluci\u00f3n`;
                      return (
                        <button
                          onClick={() => handleOpenBatchReturn(c)}
                          title={tooltip}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '5px 12px',
                            borderRadius: '20px',
                            background: 'rgba(0, 166, 80, 0.1)',
                            border: '1px solid rgba(0, 166, 80, 0.3)',
                            color: '#00a650',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            letterSpacing: '0.2px',
                            whiteSpace: 'nowrap'
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0, 166, 80, 0.18)';
                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0, 166, 80, 0.55)';
                            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(0,166,80,0.18)';
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0, 166, 80, 0.1)';
                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0, 166, 80, 0.3)';
                            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                            (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                          }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                            <path d="m3.3 7 8.7 5 8.7-5"/>
                            <path d="M12 22V12"/>
                          </svg>
                          {count} {count === 1 ? 'activo' : 'activos'}
                        </button>
                      );
                    })()}
                  </td>
                  <td>
                    <span className={`badge badge-${c.status.toLowerCase()}`}>
                      {c.status === 'ACTIVE' ? <UserCheck size={14} /> : <UserX size={14} />}
                      {c.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <ActionMenu>
                      <button 
                        className="action-icon-btn edit-btn" 
                        onClick={() => handleEditClick(c)}
                        title="Editar Colaborador"
                      >
                        <Edit2 size={16} />
                      </button>
                      <Link 
                        to={`/collaborators/${c.id}`} 
                        className="action-icon-btn view-btn" 
                        title="Ver Perfil"
                      >
                        <Eye size={16} />
                      </Link>
                      <button 
                        className={`action-icon-btn ${c.status === 'ACTIVE' ? 'delete-btn' : 'reactivate-btn'}`}
                        onClick={() => {
                          confirm({
                            title: c.status === 'ACTIVE' ? 'Dar de Baja' : 'Reactivar',
                            message: c.status === 'ACTIVE' 
                              ? '¿Estás seguro de dar de baja a este colaborador?' 
                              : '¿Estás seguro de reactivar a este colaborador?',
                            type: c.status === 'ACTIVE' ? 'danger' : 'info',
                            onConfirm: () => toggleStatusMutation.mutate(c.id)
                          });
                        }}
                        title={c.status === 'ACTIVE' ? 'Dar de Baja' : 'Reactivar'}
                      >
                        {c.status === 'ACTIVE' ? <UserX size={16} /> : <UserCheck size={16} />}
                      </button>
                    </ActionMenu>
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
                <input required className="glass-input" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} disabled={!!editingId} style={editingId ? { opacity: 0.6, cursor: 'not-allowed' } : {}} />
              </div>
              <div className="form-group">
                <label>Fecha de Alta (Ingreso)</label>
                <input required className="glass-input" type="date" value={formData.activationDate} onChange={e => setFormData({...formData, activationDate: e.target.value})} />
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
      {importResult && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ width: '400px', padding: '30px' }}>
            <h3 style={{ marginTop: 0, color: 'var(--text-main)' }}>Resultados de Importación</h3>
            <p style={{ color: 'var(--text-muted)' }}><strong>Exitosos:</strong> {importResult.successful}</p>
            <p style={{ color: 'var(--text-muted)' }}><strong>Fallidos:</strong> {importResult.failed}</p>
            {importResult.errors && importResult.errors.length > 0 && (
              <div style={{ marginTop: '10px', maxHeight: '200px', overflowY: 'auto', background: 'rgba(255,0,0,0.1)', padding: '10px', borderRadius: '8px', fontSize: '13px', color: '#ff4d4f' }}>
                {importResult.errors.map((err, i) => <div key={i}>{err}</div>)}
              </div>
            )}
            <button className="btn-primary" style={{ marginTop: '20px', width: '100%', justifyContent: 'center' }} onClick={() => setImportResult(null)}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {batchReturnModalOpen && selectedCollabForReturn && (() => {
        const collabAssignments = assignmentsList.filter((a: any) => a.collaboratorId === selectedCollabForReturn.id && (a.status === 'ACCEPTED' || a.status === 'PENDING_ACCEPTANCE'));
        const allSelected = collabAssignments.length > 0 && collabAssignments.every((a: any) => selectedAssignmentIds.includes(a.id));
        return (
          <div 
            onClick={() => setBatchReturnModalOpen(false)}
            style={{
              position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
              background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 1200, padding: '20px'
            }}
          >
            <div 
              onClick={e => e.stopPropagation()}
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                boxShadow: '0 25px 60px rgba(0,0,0,0.2), 0 8px 20px rgba(0,0,0,0.1)',
                width: '100%',
                maxWidth: '580px',
                overflow: 'hidden',
                animation: 'slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)'
              }}
            >
              {/* Header */}
              <div style={{
                background: 'linear-gradient(135deg, #00a650 0%, #008a42 100%)',
                padding: '28px 32px 24px',
                position: 'relative'
              }}>
                <button
                  onClick={() => setBatchReturnModalOpen(false)}
                  style={{
                    position: 'absolute', top: '18px', right: '18px',
                    background: 'rgba(255,255,255,0.2)', border: 'none',
                    borderRadius: '50%', width: '32px', height: '32px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#fff', fontSize: '18px',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.35)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
                >×</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.2)', borderRadius: '12px',
                    width: '46px', height: '46px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"/>
                      <path d="M16.5 9.4 7.55 4.24"/>
                      <polyline points="3.29 7 12 12 20.71 7"/>
                      <line x1="12" y1="22" x2="12" y2="12"/>
                      <circle cx="18.5" cy="15.5" r="2.5"/>
                      <path d="M20.27 17.27 22 19"/>
                    </svg>
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#fff' }}>Devolución de Equipos</h2>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.75)' }}>
                      Colaborador: <strong style={{ color: '#fff' }}>{selectedCollabForReturn.name}</strong>
                    </p>
                  </div>
                </div>
                {/* Select all bar */}
                {collabAssignments.length > 0 && (
                  <button
                    onClick={() => {
                      if (allSelected) {
                        setSelectedAssignmentIds([]);
                      } else {
                        setSelectedAssignmentIds(collabAssignments.map((a: any) => a.id));
                      }
                    }}
                    style={{
                      background: allSelected ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)',
                      border: '1px solid rgba(255,255,255,0.35)',
                      borderRadius: '8px', color: '#fff',
                      padding: '6px 14px', fontSize: '12px', fontWeight: '600',
                      cursor: 'pointer', transition: 'all 0.2s',
                      display: 'inline-flex', alignItems: 'center', gap: '6px'
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      {allSelected
                        ? <><polyline points="20 6 9 17 4 12"/></>
                        : <><rect x="3" y="3" width="18" height="18" rx="3"/></>}
                    </svg>
                    {allSelected ? 'Deseleccionar todos' : `Seleccionar todos (${collabAssignments.length})`}
                  </button>
                )}
              </div>

              {/* Asset list */}
              <div style={{ maxHeight: '340px', overflowY: 'auto', padding: '8px 0' }}>
                {collabAssignments.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '12px', opacity: 0.5 }}>
                      <rect x="2" y="3" width="20" height="14" rx="2"/>
                      <path d="M8 21h8M12 17v4"/>
                    </svg>
                    <p style={{ margin: 0, fontSize: '14px' }}>No hay activos asignados para retornar.</p>
                  </div>
                ) : (
                  collabAssignments.map((assignment: any) => {
                    const asset = assetsList.find((ast: any) => ast.id === assignment.assetId);
                    const isSelected = selectedAssignmentIds.includes(assignment.id);
                    const hostname = asset?.dynamicAttributes?.hostname || asset?.dynamicAttributes?.Hostname || 'Sin hostname';
                    const serial = asset?.serial || 'N/A';
                    const brand = asset?.dynamicAttributes?.marca || asset?.dynamicAttributes?.Marca || '';
                    const model = asset?.dynamicAttributes?.modelo || asset?.dynamicAttributes?.Modelo || '';
                    return (
                      <div
                        key={assignment.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedAssignmentIds(prev => prev.filter(id => id !== assignment.id));
                          } else {
                            setSelectedAssignmentIds(prev => [...prev, assignment.id]);
                          }
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '16px',
                          padding: '14px 28px',
                          cursor: 'pointer',
                          borderLeft: isSelected ? '3px solid #6366f1' : '3px solid transparent',
                          background: isSelected ? 'rgba(99,102,241,0.06)' : '#fff',
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = '#f8fafc'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = isSelected ? 'rgba(99,102,241,0.06)' : '#fff'; }}
                      >
                        {/* Custom checkbox */}
                        <div style={{
                          width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
                          border: isSelected ? '2px solid #00a650' : '2px solid #d1d5db',
                          background: isSelected ? '#00a650' : '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s ease'
                        }}>
                          {isSelected && (
                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                              <polyline points="2 6 5 9 10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        {/* Device icon */}
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                          background: isSelected ? 'rgba(0,166,80,0.1)' : '#f1f5f9',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s ease'
                        }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isSelected ? '#00a650' : '#94a3b8'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="3" width="20" height="14" rx="2"/>
                            <path d="M8 21h8M12 17v4"/>
                          </svg>
                        </div>
                        {/* Asset info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>{hostname}</span>
                            {brand && <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '10px' }}>{brand}</span>}
                          </div>
                          <div style={{ marginTop: '4px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="16 2 12 6 8 2"/></svg>
                              {asset?.id || assignment.assetId}
                            </span>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>S/N: {serial}</span>
                            {model && <span style={{ fontSize: '11px', color: '#94a3b8' }}>{model}</span>}
                          </div>
                        </div>
                          {isSelected && (
                            <div style={{ flexShrink: 0, color: '#00a650', fontSize: '11px', fontWeight: '600' }}>✓</div>
                          )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Reason Input */}
              <div style={{ padding: '0 28px 20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                  Motivo de devolución
                </label>
                <input
                  type="text"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Ej: Fin de contrato, Renovación de equipo, etc."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#00a650'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                />
              </div>

              {/* Footer */}
              <div style={{
                padding: '20px 28px',
                borderTop: '1px solid #f1f5f9',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: '12px', background: '#fafbfc'
              }}>
                <span style={{ fontSize: '13px', color: '#64748b' }}>
                  {selectedAssignmentIds.length === 0
                    ? 'Selecciona al menos un equipo'
                    : <><strong style={{ color: '#1e293b' }}>{selectedAssignmentIds.length}</strong> equipo{selectedAssignmentIds.length !== 1 ? 's' : ''} seleccionado{selectedAssignmentIds.length !== 1 ? 's' : ''}</>
                  }
                </span>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setBatchReturnModalOpen(false)}
                    disabled={isBatchReturning}
                    style={{
                      padding: '10px 22px', borderRadius: '10px', border: '1px solid #e2e8f0',
                      background: '#fff', color: '#64748b', fontWeight: '600',
                      fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                  >Cancelar</button>
                  <button
                    onClick={handleBatchReturnSubmit}
                    disabled={isBatchReturning || selectedAssignmentIds.length === 0}
                    style={{
                      padding: '10px 22px', borderRadius: '10px', border: 'none',
                      background: selectedAssignmentIds.length === 0
                        ? '#e2e8f0'
                        : 'linear-gradient(135deg, #00a650 0%, #008a42 100%)',
                      color: selectedAssignmentIds.length === 0 ? '#94a3b8' : '#fff',
                      fontWeight: '600', fontSize: '13px',
                      cursor: selectedAssignmentIds.length === 0 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', gap: '7px',
                      boxShadow: selectedAssignmentIds.length > 0 ? '0 4px 14px rgba(0,166,80,0.35)' : 'none'
                    }}
                  >
                    {isBatchReturning ? (
                      <><span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }}></span>Procesando...</>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 14 4 9 9 4"/>
                          <path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
                        </svg>
                        Iniciar Devolución{selectedAssignmentIds.length > 0 ? ` (${selectedAssignmentIds.length})` : ''}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

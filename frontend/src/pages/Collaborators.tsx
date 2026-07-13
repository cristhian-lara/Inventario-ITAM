import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Search, UserPlus, Upload } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import { usePermission } from '../context/AuthContext';
import { showWebexFailureModal } from '../utils/notificationNotice';
import CollaboratorFormModal from '../components/collaborators/CollaboratorFormModal';
import BatchReturnModal from '../components/collaborators/BatchReturnModal';
import OffboardModal from '../components/collaborators/OffboardModal';
import CollaboratorTableRow from '../components/collaborators/CollaboratorTableRow';
import Pagination from '../components/Pagination';
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
  // Permisos RBAC del módulo Colaboradores
  const collabPerms = usePermission('collaborators');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  useEffect(() => { setCurrentPage(1); }, [searchTerm]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', department: '', location: '', isLeader: false, leaderId: '', cecos: '', activationDate: new Date().toISOString().split('T')[0] });
  const [locationType, setLocationType] = useState('Medellín');
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const toast = useToast();

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
      toast.error('Error en la importación: ' + (error.response?.data?.error || error.message));
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

  const [editingId, setEditingId] = useState<string | null>(null);

  const [batchReturnModalOpen, setBatchReturnModalOpen] = useState(false);
  const [selectedCollabForReturn, setSelectedCollabForReturn] = useState<Collaborator | null>(null);
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<string[]>([]);
  const [isBatchReturning, setIsBatchReturning] = useState(false);
  const [returnReason, setReturnReason] = useState('');

  // Baja de colaborador con devolución forzada de todos sus activos (Paz y Salvo)
  const [offboardTarget, setOffboardTarget] = useState<Collaborator | null>(null);
  const [offboardReason, setOffboardReason] = useState('');
  const [isOffboarding, setIsOffboarding] = useState(false);

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
            toast.success('El acta de devolución múltiple ha sido enviada al colaborador por Webex.');
        }
    } catch (error: any) {
        toast.error(error.response?.data?.error || 'Error al iniciar devolución');
    } finally {
        setIsBatchReturning(false);
    }
  };

  const handleOffboardSubmit = async () => {
    if (!offboardTarget) return;
    if (!offboardReason.trim()) {
      toast.error('El motivo de la baja es obligatorio.');
      return;
    }
    setIsOffboarding(true);
    try {
      const response = await axios.post(`${API_URL}/api/collaborators/${offboardTarget.id}/offboard`, {
        reason: offboardReason
      });
      setOffboardTarget(null);
      setOffboardReason('');
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      confirm({
        title: 'Baja Registrada',
        message: response.data.message,
        type: 'success',
        confirmText: response.data.documentPath ? 'Ver Acta de Paz y Salvo' : 'Entendido',
        hideCancel: true,
        onConfirm: () => {
          if (response.data.documentPath) {
            window.open(`${API_URL}${response.data.documentPath}`, '_blank');
          }
        }
      });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al procesar la baja del colaborador');
    } finally {
      setIsOffboarding(false);
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

  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
        {collabPerms.create && (
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
        )}
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
              {paginated.map(c => (
                <CollaboratorTableRow
                  key={c.id}
                  c={c}
                  assignmentsList={assignmentsList}
                  collabPerms={collabPerms}
                  getDepartmentName={getDepartmentName}
                  getCECOName={getCECOName}
                  onOpenBatchReturn={handleOpenBatchReturn}
                  onEdit={handleEditClick}
                  onOffboard={(collab) => { setOffboardReason(''); setOffboardTarget(collab); }}
                  onToggleStatus={(id) => {
                    const collab = collaborators.find((x: any) => x.id === id);
                    const isActive = collab?.status === 'ACTIVE';
                    confirm({
                      title: isActive ? 'Dar de Baja' : 'Reactivar',
                      message: isActive
                        ? '¿Estás seguro de dar de baja a este colaborador?'
                        : '¿Estás seguro de reactivar a este colaborador?',
                      type: isActive ? 'danger' : 'info',
                      onConfirm: () => toggleStatusMutation.mutate(id)
                    });
                  }}
                />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>No se encontraron colaboradores</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={filtered.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {isModalOpen && (
        <CollaboratorFormModal
          formData={formData}
          setFormData={setFormData}
          locationType={locationType}
          setLocationType={setLocationType}
          departments={departments}
          cecosList={cecosList}
          collaborators={collaborators}
          editingId={editingId}
          departmentHasLeader={departmentHasLeader}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmit}
          isPending={mutation.isPending || editMutation.isPending}
        />
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

      {batchReturnModalOpen && selectedCollabForReturn && (
        <BatchReturnModal
          collaborator={selectedCollabForReturn}
          assignmentsList={assignmentsList}
          assetsList={assetsList}
          selectedAssignmentIds={selectedAssignmentIds}
          setSelectedAssignmentIds={setSelectedAssignmentIds}
          returnReason={returnReason}
          setReturnReason={setReturnReason}
          isBatchReturning={isBatchReturning}
          onClose={() => setBatchReturnModalOpen(false)}
          onSubmit={handleBatchReturnSubmit}
        />
      )}

      {offboardTarget && (
        <OffboardModal
          collaborator={offboardTarget}
          assignmentsList={assignmentsList}
          assetsList={assetsList}
          reason={offboardReason}
          setReason={setOffboardReason}
          isOffboarding={isOffboarding}
          onClose={() => setOffboardTarget(null)}
          onSubmit={handleOffboardSubmit}
        />
      )}
    </div>
  );
}

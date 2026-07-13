import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import LoadingState from '../components/LoadingState';
import AssetTableRow from '../components/catalog/AssetTableRow';
import ForceActionModal from '../components/catalog/ForceActionModal';
import ExtendLoanModal from '../components/catalog/ExtendLoanModal';
import AssignAssetModal from '../components/catalog/AssignAssetModal';
import AssetFormModal from '../components/catalog/AssetFormModal';
import RetireAssetModal from '../components/catalog/RetireAssetModal';
import Pagination from '../components/Pagination';
import axios from 'axios';
import { Plus, Search, MonitorSmartphone, RefreshCw, CheckCircle2, Upload } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import { usePermission } from '../context/AuthContext';
import { showWebexFailureModal } from '../utils/notificationNotice';
import './Catalog.css';
import { API_URL } from '../config';

interface Asset {
  id: string;
  categoryId: string;
  serial: string;
  status: string;
  dynamicAttributes: Record<string, any>;
}

export default function Catalog() {
  // Permisos RBAC del módulo Equipos: gobiernan crear/editar/dar de baja
  const assetPerms = usePermission('assets');
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const toast = useToast();
  const [modalErrorMsg, setModalErrorMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ successful: number, failed: number, errors: string[] } | null>(null);

  // Estados de los modales
  const [assignModalAssetId, setAssignModalAssetId] = useState<string | null>(null);

  // Autocomplete state para asignación
  const [collabSearchTerm, setCollabSearchTerm] = useState('');
  const [showCollabDropdown, setShowCollabDropdown] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const filterRisk = searchParams.get('filter') === 'risk';
  const filterCategoryInitial = searchParams.get('category') || 'all';
  const initialStatus = searchParams.get('status') || 'all';
  const [filterCategory, setFilterCategory] = useState(filterCategoryInitial);
  const [filterStatus, setFilterStatus] = useState(initialStatus);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterCategory, filterStatus, filterRisk]);
  const [retireModalAssetId, setRetireModalAssetId] = useState<string | null>(null);
  const [retireReason, setRetireReason] = useState('');
  const [retireBlanccoId, setRetireBlanccoId] = useState('');
  const [retireNotes, setRetireNotes] = useState('');
  
  // Modal de firma forzada (asignaciones)
  const [forceActionModal, setForceActionModal] = useState<{ type: 'accept' | 'return', assetId: string } | null>(null);
  const [forceReason, setForceReason] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newAsset, setNewAsset] = useState<{ id: string; categoryId: number | ''; serial: string; dynamicAttributes: any; purchaseDate?: string; warrantyMonths?: number; depreciationYears?: number; purchasePrice?: number; vendorName?: string; internalBuyer?: string }>({
    id: '',
    categoryId: '',
    serial: '',
    dynamicAttributes: {}
  });

  // Formulario de asignación
  const [formData, setFormData] = useState({
    id: `assig-${Math.floor(Math.random() * 1000)}`,
    assetId: '',
    collaboratorId: '',
    collaboratorEmail: '',
    collaboratorName: '',
    startDate: new Date().toISOString().split('T')[0],
    assignmentType: 'PERMANENT' as 'PERMANENT' | 'LOAN',
    expectedReturnDate: ''
  });

  // Extender fecha de devolución de un préstamo activo
  const [extendLoanTarget, setExtendLoanTarget] = useState<{ assignmentId: string; assetId: string; currentReturnDate?: string } | null>(null);
  const [extendLoanDate, setExtendLoanDate] = useState('');

  useEffect(() => {
    if (assignModalAssetId) {
      setFormData(prev => ({
        ...prev,
        assetId: assignModalAssetId
      }));
    }
  }, [assignModalAssetId]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_URL}/api/catalog/assets/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImportResult(response.data);
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Importación procesada', 8000);
    } catch (error: any) {
      toast.error('Error en la importación: ' + (error.response?.data?.error || error.message), 8000);
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownloadTemplate = () => {
    const headers = ['Placa Ikusi', 'Categoría', 'Serial', 'Fecha de Compra', 'Meses Garantía', 'Años Depreciación', 'PRECIO COMPRA'];
    const sampleRow = ['EQ-1001', '1', 'SN-A1B2C3', '2024-01-15', '12', '3', '3500000'];
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + sampleRow.join(',');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "plantilla_equipos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const { data: assets, isLoading, error } = useQuery<Asset[]>({
    queryKey: ['assets'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/catalog/assets`);
      return response.data;
    },
    refetchInterval: 30000, // Auto-refetch every 30 seconds
    staleTime: 10000,
  });

  const { data: categories } = useQuery<any[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/catalog/categories`);
      return response.data;
    }
  });

  const { data: assignments } = useQuery<any[]>({
    queryKey: ['assignments'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/assignments`);
      return response.data;
    },
    refetchInterval: 30000, // Auto-refetch every 30 seconds
    staleTime: 10000,
  });

  const getActiveAssignmentForAsset = (assetId: string) => {
    return assignments?.find((a: any) => a.assetId === assetId && ['ACCEPTED', 'PENDING_ACCEPTANCE', 'PENDING_RETURN'].includes(a.status));
  };

  const { data: collaborators } = useQuery<any[]>({
    queryKey: ['collaborators'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/collaborators`);
      return response.data;
    }
  });

  const getCollaboratorName = (collaboratorId: string) => {
    return collaborators?.find((c: any) => c.id === collaboratorId)?.name;
  };

  // MUTACIÓN PARA DEVOLVER
  const returnMutation = useMutation({
    mutationFn: async (payload: { assetId: string, collaboratorName?: string }) => {
      const response = await axios.post(`${API_URL}/api/assignments/return-by-asset/${payload.assetId}`, {
        collaboratorName: payload.collaboratorName
      });
      return response.data;
    },
    onSuccess: (data: any) => {
      if (!showWebexFailureModal(confirm, data)) {
        toast.success(data?.message || '¡Proceso de devolución iniciado! Se envió la notificación de firma por Webex.', 8000);
      }
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message, 8000);
    }
  });

  // MUTACIÓN PARA ASIGNAR
  const assignMutation = useMutation({
    mutationFn: async (newAssignment: typeof formData) => {
      const response = await axios.post(`${API_URL}/api/assignments`, newAssignment);
      return response.data;
    },
    onSuccess: (data: any) => {
      if (!showWebexFailureModal(confirm, data)) {
        toast.success(data?.message || '¡Asignación iniciada! Se envió la notificación de firma por Webex.', 8000);
      }
      setFormData({
        id: `assig-${Math.floor(Math.random() * 1000)}`,
        assetId: '',
        collaboratorId: '',
        collaboratorEmail: '',
        collaboratorName: '',
        startDate: new Date().toISOString().split('T')[0],
        assignmentType: 'PERMANENT',
        expectedReturnDate: ''
      });
      setAssignModalAssetId(null);
      setCollabSearchTerm('');
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message, 8000);
      setAssignModalAssetId(null);
    }
  });

  const addAssetMutation = useMutation({
    mutationFn: async (assetData: typeof newAsset) => {
      const response = await axios.post(`${API_URL}/api/catalog/assets`, {
        id: assetData.id,
        categoryId: assetData.categoryId,
        serial: assetData.serial,
        dynamicAttributes: assetData.dynamicAttributes,
        purchaseDate: assetData.purchaseDate,
        warrantyMonths: assetData.warrantyMonths,
        purchasePrice: assetData.purchasePrice,
        depreciationYears: assetData.depreciationYears,
        vendorName: assetData.vendorName,
        internalBuyer: assetData.internalBuyer
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setShowAddModal(false);
      setNewAsset({ id: '', categoryId: '', serial: '', dynamicAttributes: {} });
      setIsEditing(false);
      toast.success('Activo guardado exitosamente', 3000);
    },
    onError: (err: any) => {
      setModalErrorMsg(err.response?.data?.error || err.message);
      setTimeout(() => setModalErrorMsg(''), 5000);
    }
  });

  const editAssetMutation = useMutation({
    mutationFn: async (asset: any) => {
      const response = await axios.put(`${API_URL}/api/catalog/assets/${asset.id}`, asset);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setShowAddModal(false);
      setNewAsset({ id: '', categoryId: '', serial: '', dynamicAttributes: {} });
      setIsEditing(false);
      toast.success('Activo actualizado exitosamente', 3000);
    },
    onError: (err: any) => {
      setModalErrorMsg(err.response?.data?.error || err.message);
      setTimeout(() => setModalErrorMsg(''), 8000);
    }
  });

  const retireAssetMutation = useMutation({
    mutationFn: async ({ id, reason, blanccoReportId, notes }: { id: string, reason: string, blanccoReportId?: string, notes?: string }) => {
      const response = await axios.post(`${API_URL}/api/catalog/assets/${id}/decommission`, { reason, blanccoReportId, notes });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Activo dado de baja exitosamente', 3000);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message, 8000);
    }
  });

  const forceAcceptMutation = useMutation({
    mutationFn: async ({ assetId, reason, collaboratorName }: { assetId: string, reason: string, collaboratorName?: string }) => {
      const response = await axios.post(`${API_URL}/api/assignments/force-accept-by-asset/${assetId}`, { reason, collaboratorName });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Firma forzada completada (Administrativa).`);
      setForceActionModal(null);
      setForceReason('');
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      if (data.documentPath) {
        window.open(`${API_URL}${data.documentPath}`, '_blank');
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message, 8000);
    }
  });

  const forceReturnMutation = useMutation({
    mutationFn: async ({ assetId, reason, collaboratorName }: { assetId: string, reason: string, collaboratorName?: string }) => {
      const response = await axios.post(`${API_URL}/api/assignments/force-return-by-asset/${assetId}`, { reason, collaboratorName });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Devolución forzada completada (Administrativa).`);
      setForceActionModal(null);
      setForceReason('');
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      if (data.documentPath) {
        window.open(`${API_URL}${data.documentPath}`, '_blank');
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message, 8000);
    }
  });

  const resendLinkMutation = useMutation({
    mutationFn: async (payload: { assetId: string, collaboratorName?: string }) => {
      const response = await axios.post(`${API_URL}/api/assignments/resend-link-by-asset/${payload.assetId}`, { collaboratorName: payload.collaboratorName });
      return response.data;
    },
    onSuccess: (data: any) => {
      if (!showWebexFailureModal(confirm, data)) {
        toast.success(data?.message || 'Enlace de firma reenviado al colaborador por Webex.', 8000);
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message, 8000);
    }
  });

  const handleReturnClick = (assetId: string) => {
    confirm({
      title: 'Confirmar Devolución',
      message: `¿Estás seguro de que deseas iniciar el proceso de devolución para el activo ${assetId}? El colaborador recibirá un mensaje por Webex para firmar el Paz y Salvo.`,
      type: 'warning',
      onConfirm: () => {
        const activeAssignment = getActiveAssignmentForAsset(assetId);
        const collaboratorName = activeAssignment ? getCollaboratorName(activeAssignment.collaboratorId) : undefined;
        returnMutation.mutate({ assetId, collaboratorName });
      }
    });
  };

  const handleAssignClick = (assetId: string) => {
    setFormData({
      id: `assig-${Math.floor(Math.random() * 1000)}`,
      assetId: assetId,
      collaboratorId: '',
      collaboratorEmail: '',
      collaboratorName: '',
      startDate: new Date().toISOString().split('T')[0],
      assignmentType: 'PERMANENT',
      expectedReturnDate: ''
    });
    setAssignModalAssetId(assetId);
    setCollabSearchTerm('');
  };

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    confirm({
      title: 'Confirmar Asignación',
      message: formData.assignmentType === 'LOAN'
        ? `¿Estás seguro de asignar este equipo en modalidad de PRÉSTAMO, con devolución esperada el ${formData.expectedReturnDate}?`
        : '¿Estás seguro de asignar este equipo de forma permanente al colaborador seleccionado?',
      type: 'info',
      onConfirm: () => assignMutation.mutate({
        ...formData,
        expectedReturnDate: formData.assignmentType === 'LOAN' ? formData.expectedReturnDate : ''
      })
    });
  };

  const extendLoanMutation = useMutation({
    mutationFn: async ({ assignmentId, newReturnDate }: { assignmentId: string, newReturnDate: string }) => {
      const response = await axios.post(`${API_URL}/api/assignments/${assignmentId}/extend-loan`, { newReturnDate });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Fecha de devolución del préstamo extendida exitosamente.', 8000);
      setExtendLoanTarget(null);
      setExtendLoanDate('');
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message, 8000);
    }
  });

  const handleEditClick = (asset: any) => {
    setIsEditing(true);
    setNewAsset({
      id: asset.id,
      categoryId: Number(asset.categoryId),
      serial: asset.serial,
      dynamicAttributes: asset.dynamicAttributes || {},
      purchaseDate: asset.purchaseDate ? asset.purchaseDate.split('T')[0] : '',
      warrantyMonths: asset.warrantyMonths || 0,
      depreciationYears: asset.depreciationYears || 0,
      purchasePrice: asset.purchasePrice || undefined,
      vendorName: asset.vendorName || '',
      internalBuyer: asset.internalBuyer || ''
    });
    setShowAddModal(true);
  };

  if (isLoading) return <LoadingState message="Cargando inventario..." />;

  if (error) return <div className="error-glass">Error al cargar el inventario: {(error as Error).message}</div>;

  const filteredAssets = assets?.filter((asset: any) => {
    if (filterRisk) {
      if (asset.status === 'RETIRED') return false;
      let atRisk = false;
      const today = new Date();
      // Normalize today to midnight (date only, no time)
      today.setHours(0, 0, 0, 0);
      if (asset.purchaseDate) {
        // purchaseDate arrives as "2025-06-14T00:00:00.000Z" — parse as local date
        const pdStr = typeof asset.purchaseDate === 'string'
          ? asset.purchaseDate.split('T')[0]
          : new Date(asset.purchaseDate).toISOString().split('T')[0];
        const [pdYear, pdMonth, pdDay] = pdStr.split('-').map(Number);
        const pd = new Date(pdYear, pdMonth - 1, pdDay); // local midnight

        if (asset.warrantyMonths) {
          const wDate = new Date(pd);
          wDate.setMonth(wDate.getMonth() + Number(asset.warrantyMonths));
          if (wDate < today) atRisk = true;
        }
        if (asset.depreciationYears) {
          const dDate = new Date(pd);
          dDate.setFullYear(dDate.getFullYear() + Number(asset.depreciationYears));
          if (dDate < today) atRisk = true;
        }
      }
      if (!atRisk) return false;
    }

    if (filterCategory !== 'all') {
      if (Number(asset.categoryId) !== Number(filterCategory)) return false;
    }

    // Determine if this asset has a pending acceptance assignment
    const pendingAssignment = assignments?.find((a: any) => a.assetId === asset.id && a.status === 'PENDING_ACCEPTANCE');
    const isPendingFirma = !!pendingAssignment;

    // Determine if this asset is currently on loan (active assignment of type LOAN)
    const activeAssignmentForLoan = assignments?.find((a: any) => a.assetId === asset.id && ['ACCEPTED', 'PENDING_ACCEPTANCE', 'PENDING_RETURN'].includes(a.status));
    const isOnLoan = activeAssignmentForLoan?.assignmentType === 'LOAN';

    if (filterStatus === 'PENDING_ACCEPTANCE') {
      // Show ONLY assets pending signature
      if (!isPendingFirma) return false;
    } else if (filterStatus === 'AVAILABLE') {
      // Show only truly available (not pending signature)
      if (asset.status !== 'AVAILABLE' || isPendingFirma) return false;
    } else if (filterStatus === 'LOAN') {
      // Show only assets currently on loan
      if (!isOnLoan) return false;
    } else if (filterStatus !== 'all') {
      if (asset.status !== filterStatus) return false;
    }

    const hostname = String(asset.dynamicAttributes?.HOSTNAME || asset.dynamicAttributes?.Hostname || asset.dynamicAttributes?.hostname || '');
    return asset.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asset.serial && asset.serial.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (hostname && hostname.toLowerCase().includes(searchTerm.toLowerCase())) ||
      String(asset.categoryId).toLowerCase().includes(searchTerm.toLowerCase());
  });

  const paginatedAssets = filteredAssets?.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="catalog-page">
      <header className="catalog-header">
        <div>
          <h1 className="title-glow" style={{ fontSize: '32px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            Catálogo de Activos
            {assets && (
              <span style={{ fontSize: '14px', background: 'var(--bg-glass)', padding: '4px 12px', borderRadius: '20px', color: 'var(--text-muted)', border: '1px solid var(--border-glass)', fontWeight: 500, letterSpacing: '0.3px', display: 'inline-block' }}>
                {filteredAssets?.length === assets.length ? `Total: ${assets.length}` : `Mostrando ${filteredAssets?.length} de ${assets.length}`}
              </span>
            )}
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Visualiza y administra todos los equipos registrados en el inventario.</p>
        </div>
        {assetPerms.create && (
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleImport}
          />
          <button
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', background: 'var(--glass-bg)', color: 'var(--text-main)', border: '1px solid var(--border-glass)', cursor: 'pointer', fontWeight: '500', transition: 'all 0.3s ease' }}
            onClick={handleDownloadTemplate}
          >
            Descargar Plantilla
          </button>
          <button
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', background: 'var(--glass-bg)', color: 'var(--text-main)', border: '1px solid var(--border-glass)', cursor: 'pointer', fontWeight: '500', transition: 'all 0.3s ease' }}
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            {importing ? 'Importando...' : <><Upload size={18} /> Importar (.xlsx, .csv)</>}
          </button>
          <button className="btn-primary" onClick={() => {
            setIsEditing(false);
            setNewAsset({ id: '', categoryId: '', serial: '', dynamicAttributes: {} });
            setShowAddModal(true);
          }}>
            <Plus size={20} /> Nuevo Activo
          </button>
        </div>
        )}
      </header>

      {importResult && (
        <div className="glass-panel" style={{ marginBottom: '20px', borderLeft: '4px solid #3b82f6', background: 'rgba(59, 130, 246, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ marginTop: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={20} color="#3b82f6" />
                Resultados de Importación
              </h3>
              <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                  <strong style={{ color: '#22c55e' }}>Exitosos:</strong> {importResult.successful}
                </p>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                  <strong style={{ color: '#ef4444' }}>Fallidos:</strong> {importResult.failed}
                </p>
              </div>

              {importResult.errors && importResult.errors.length > 0 && (
                <div style={{ marginTop: '15px', padding: '15px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <h4 style={{ color: '#ef4444', margin: '0 0 10px 0', fontSize: '14px' }}>Detalles de errores:</h4>
                  <div style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '13px', color: 'var(--text-muted)' }}>
                    {importResult.errors.map((err, i) => <div key={i} style={{ marginBottom: '4px' }}>• {err}</div>)}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setImportResult(null)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '5px' }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="glass-panel table-container">
        <div className="table-controls" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div className="search-box" style={{ flex: 1, minWidth: '250px' }}>
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Buscar por serial, modelo o categoría..."
              className="glass-input search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="glass-input filter-select"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">Todas las Categorías</option>
            {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            className="glass-input filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Todos los Estados</option>
            <option value="AVAILABLE">Disponible</option>
            <option value="IN_USE">En Uso</option>
            <option value="PENDING_ACCEPTANCE">Pendiente de Firma</option>
            <option value="PENDING_INSPECTION">Pendiente de Visto Bueno</option>
            <option value="LOAN">En Préstamo</option>
            <option value="MAINTENANCE">En Mantenimiento</option>
            <option value="RETIRED">Baja</option>
          </select>
          <button
            type="button"
            className="btn-glass"
            onClick={() => setFilterStatus(filterStatus === 'AVAILABLE' ? 'all' : 'AVAILABLE')}
            title="Mostrar solo activos disponibles para asignar"
            aria-pressed={filterStatus === 'AVAILABLE'}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              ...(filterStatus === 'AVAILABLE' ? { background: 'var(--ikusi-green)', color: '#fff', borderColor: 'var(--ikusi-green)' } : {})
            }}
          >
            <CheckCircle2 size={16} />
            Solo disponibles
          </button>
          {(filterCategory !== 'all' || filterStatus !== 'all' || searchTerm !== '' || filterRisk) && (
            <button
              className="btn-glass"
              onClick={() => {
                setFilterCategory('all');
                setFilterStatus('all');
                setSearchTerm('');
                setSearchParams({});
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={16} /> Limpiar Filtros
            </button>
          )}
        </div>

        <div className="table-responsive">
          <table className="glass-table">
            <thead>
              <tr>
                <th>Placa</th>
                <th>Categoría</th>
                <th>Asignado a</th>
                <th>Características</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAssets?.map(asset => (
                <AssetTableRow
                  key={asset.id}
                  asset={asset}
                  categories={categories}
                  collaborators={collaborators}
                  activeAssignment={getActiveAssignmentForAsset(asset.id)}
                  assetPerms={assetPerms}
                  onEdit={handleEditClick}
                  onAssign={handleAssignClick}
                  onReturn={handleReturnClick}
                  onForceAction={(type, assetId) => setForceActionModal({ type, assetId })}
                  onExtendLoan={(assignmentId, assetId, currentReturnDate) => {
                    setExtendLoanDate('');
                    setExtendLoanTarget({ assignmentId, assetId, currentReturnDate });
                  }}
                  onResendLink={(assetId) => {
                    confirm({
                      title: 'Reenviar Enlace',
                      message: '¿Estás seguro de reenviar el enlace de firma al colaborador?',
                      type: 'info',
                      onConfirm: () => resendLinkMutation.mutate({ assetId })
                    });
                  }}
                  onRetire={(assetId) => {
                    setRetireReason('');
                    setRetireBlanccoId('');
                    setRetireNotes('');
                    setRetireModalAssetId(assetId);
                  }}
                  returnPending={returnMutation.isPending}
                  resendPending={resendLinkMutation.isPending}
                />
              ))}
              {filteredAssets?.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                      <MonitorSmartphone size={48} style={{ opacity: 0.2 }} />
                      <p>No se encontraron activos que coincidan con los filtros de búsqueda.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={filteredAssets?.length || 0}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>

      <ForceActionModal
        target={forceActionModal}
        reason={forceReason}
        onReasonChange={setForceReason}
        onClose={() => { setForceActionModal(null); setForceReason(''); }}
        onSubmit={(e) => {
          e.preventDefault();
          if (!forceActionModal) return;
          const collaboratorName = getCollaboratorName(getActiveAssignmentForAsset(forceActionModal.assetId)?.collaboratorId || '');
          if (forceActionModal.type === 'accept') {
            forceAcceptMutation.mutate({ assetId: forceActionModal.assetId, reason: forceReason, collaboratorName });
          } else {
            forceReturnMutation.mutate({ assetId: forceActionModal.assetId, reason: forceReason, collaboratorName });
          }
        }}
        isPending={forceAcceptMutation.isPending || forceReturnMutation.isPending}
      />

      <ExtendLoanModal
        target={extendLoanTarget}
        newReturnDate={extendLoanDate}
        onDateChange={setExtendLoanDate}
        onClose={() => { setExtendLoanTarget(null); setExtendLoanDate(''); }}
        onSubmit={(e) => {
          e.preventDefault();
          if (!extendLoanTarget) return;
          extendLoanMutation.mutate({ assignmentId: extendLoanTarget.assignmentId, newReturnDate: extendLoanDate });
        }}
        isPending={extendLoanMutation.isPending}
      />

      {assignModalAssetId && (
        <AssignAssetModal
          formData={formData}
          setFormData={setFormData}
          collaborators={collaborators}
          collabSearchTerm={collabSearchTerm}
          setCollabSearchTerm={setCollabSearchTerm}
          showCollabDropdown={showCollabDropdown}
          setShowCollabDropdown={setShowCollabDropdown}
          onClose={() => {
            setAssignModalAssetId(null);
            setCollabSearchTerm('');
            setFormData({
              id: `assig-${Math.floor(Math.random() * 1000)}`,
              assetId: '',
              collaboratorId: '',
              collaboratorEmail: '',
              collaboratorName: '',
              startDate: new Date().toISOString().split('T')[0],
              assignmentType: 'PERMANENT',
              expectedReturnDate: ''
            });
          }}
          onSubmit={handleAssignSubmit}
          isPending={assignMutation.isPending}
        />
      )}

      {showAddModal && (
        <AssetFormModal
          newAsset={newAsset}
          setNewAsset={setNewAsset}
          categories={categories}
          isEditing={isEditing}
          modalErrorMsg={modalErrorMsg}
          onClose={() => setShowAddModal(false)}
          onSubmit={(e) => {
            e.preventDefault();
            const submitAction = () => {
              if (isEditing) {
                editAssetMutation.mutate(newAsset);
              } else {
                addAssetMutation.mutate(newAsset);
              }
            };

            confirm({
              title: isEditing ? 'Guardar Cambios' : 'Crear Activo',
              message: isEditing ? '¿Estás seguro de guardar los cambios de este activo?' : '¿Estás seguro de registrar este nuevo activo?',
              type: 'info',
              onConfirm: submitAction
            });
          }}
          isPending={addAssetMutation.isPending || editAssetMutation.isPending}
        />
      )}

      <RetireAssetModal
        assetId={retireModalAssetId}
        reason={retireReason}
        setReason={setRetireReason}
        blanccoId={retireBlanccoId}
        setBlanccoId={setRetireBlanccoId}
        notes={retireNotes}
        setNotes={setRetireNotes}
        onClose={() => setRetireModalAssetId(null)}
        onConfirm={() => {
          if (retireModalAssetId && retireReason.trim() && retireReason !== 'Otro: ') {
            retireAssetMutation.mutate({
              id: retireModalAssetId,
              reason: retireReason.trim(),
              blanccoReportId: retireBlanccoId.trim() || undefined,
              notes: retireNotes.trim() || undefined
            });
            setRetireModalAssetId(null);
          }
        }}
        isPending={retireAssetMutation.isPending}
      />

    </div>
  );
}

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Plus, Search, Tag, Cpu, HardDrive, Wifi, PlusCircle, MonitorSmartphone, RefreshCw, CheckCircle2, AlertCircle, AlertTriangle, UserCheck, Send } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext';
import './Catalog.css';

interface Asset {
  id: string;
  categoryId: string;
  serial: string;
  status: string;
  dynamicAttributes: Record<string, any>;
}

export default function Catalog() {
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Estados de los modales
  const [returnId, setReturnId] = useState<string | null>(null);
  const [assignModalAssetId, setAssignModalAssetId] = useState<string | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const filterRisk = searchParams.get('filter') === 'risk';
  const filterCategoryInitial = searchParams.get('category') || 'all';
  const initialStatus = searchParams.get('status') || 'all';
  const [filterCategory, setFilterCategory] = useState(filterCategoryInitial);
  const [filterStatus, setFilterStatus] = useState(initialStatus);

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newAsset, setNewAsset] = useState<{ id: string; categoryId: string; serial: string; dynamicAttributes: any; purchaseDate?: string; warrantyMonths?: number; depreciationYears?: number; purchasePrice?: number }>({
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
    startDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (assignModalAssetId) {
      setFormData(prev => ({
        ...prev,
        assetId: assignModalAssetId
      }));
    }
  }, [assignModalAssetId]);

  const { data: assets, isLoading, error } = useQuery<Asset[]>({
    queryKey: ['assets'],
    queryFn: async () => {
      const response = await axios.get('http://localhost:3000/api/catalog/assets');
      return response.data;
    }
  });

  const { data: categories } = useQuery<any[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await axios.get('http://localhost:3000/api/catalog/categories');
      return response.data;
    }
  });

  const { data: assignments } = useQuery<any[]>({
    queryKey: ['assignments'],
    queryFn: async () => {
      const response = await axios.get('http://localhost:3000/api/assignments');
      return response.data;
    }
  });

  const getActiveAssignmentForAsset = (assetId: string) => {
    return assignments?.find((a: any) => a.assetId === assetId && a.status === 'ACCEPTED');
  };

  const { data: collaborators } = useQuery<any[]>({
    queryKey: ['collaborators'],
    queryFn: async () => {
      const response = await axios.get('http://localhost:3000/api/collaborators');
      return response.data;
    }
  });

  // MUTACIÓN PARA DEVOLVER
  const returnMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const response = await axios.post(`http://localhost:3000/api/assignments/return-by-asset/${assetId}`, {
        email: 'test@ikusi.com'
      });
      return response.data;
    },
    onSuccess: () => {
      setSuccessMsg('¡Proceso de devolución iniciado! Revisa la consola del servidor para el link de firma.');
      setTimeout(() => setSuccessMsg(''), 8000);
      setReturnId(null);
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || err.message);
      setTimeout(() => setErrorMsg(''), 8000);
      setReturnId(null);
    }
  });

  // MUTACIÓN PARA ASIGNAR
  const assignMutation = useMutation({
    mutationFn: async (newAssignment: typeof formData) => {
      const response = await axios.post('http://localhost:3000/api/assignments', newAssignment);
      return response.data;
    },
    onSuccess: () => {
      setSuccessMsg('¡Asignación iniciada! Revisa la consola del servidor para el link mágico.');
      setFormData({
        id: `assig-${Math.floor(Math.random() * 1000)}`,
        assetId: '',
        collaboratorId: '',
        collaboratorEmail: '',
        startDate: new Date().toISOString().split('T')[0]
      });
      setTimeout(() => setSuccessMsg(''), 8000);
      setAssignModalAssetId(null);
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || err.message);
      setTimeout(() => setErrorMsg(''), 8000);
      setAssignModalAssetId(null);
    }
  });

  const addAssetMutation = useMutation({
    mutationFn: async (assetData: typeof newAsset) => {
      const response = await axios.post('http://localhost:3000/api/catalog/assets', {
        id: assetData.id,
        categoryId: assetData.categoryId,
        serial: assetData.serial,
        dynamicAttributes: assetData.dynamicAttributes
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setShowAddModal(false);
      setNewAsset({ id: '', categoryId: '', serial: '', dynamicAttributes: {} });
      setIsEditing(false);
      setSuccessMsg('Activo guardado exitosamente');
      setTimeout(() => setSuccessMsg(''), 3000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || err.message);
      setTimeout(() => setErrorMsg(''), 3000);
    }
  });

  const editAssetMutation = useMutation({
    mutationFn: async (asset: any) => {
      const response = await axios.put(`http://localhost:3000/api/catalog/assets/${asset.id}`, asset);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setShowAddModal(false);
      setNewAsset({ id: '', categoryId: '', serial: '', dynamicAttributes: {} });
      setIsEditing(false);
      setSuccessMsg('Activo actualizado exitosamente');
      setTimeout(() => setSuccessMsg(''), 3000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || err.message);
      setTimeout(() => setErrorMsg(''), 8000);
    }
  });

  const retireAssetMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string, reason: string }) => {
      const response = await axios.put(`http://localhost:3000/api/catalog/assets/${id}/status`, { status: 'RETIRED', reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setSuccessMsg('Activo dado de baja exitosamente');
      setTimeout(() => setSuccessMsg(''), 3000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || err.message);
      setTimeout(() => setErrorMsg(''), 8000);
    }
  });

  const forceAcceptMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const response = await axios.post(`http://localhost:3000/api/assignments/force-accept-by-asset/${assetId}`);
      return response.data;
    },
    onSuccess: (data) => {
      setSuccessMsg(`Firma forzada completada (Administrativa).`);
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      if (data.documentPath) {
        window.open(`http://localhost:3000${data.documentPath}`, '_blank');
      }
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || err.message);
      setTimeout(() => setErrorMsg(''), 8000);
    }
  });

  const forceReturnMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const response = await axios.post(`http://localhost:3000/api/assignments/force-return-by-asset/${assetId}`);
      return response.data;
    },
    onSuccess: (data) => {
      setSuccessMsg(`Devolución forzada completada (Administrativa).`);
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      if (data.documentPath) {
        window.open(`http://localhost:3000${data.documentPath}`, '_blank');
      }
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || err.message);
      setTimeout(() => setErrorMsg(''), 8000);
    }
  });

  const resendLinkMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const response = await axios.post(`http://localhost:3000/api/assignments/resend-link-by-asset/${assetId}`);
      return response.data;
    },
    onSuccess: () => {
      setSuccessMsg('Enlace de firma reenviado al colaborador.');
      setTimeout(() => setSuccessMsg(''), 8000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || err.message);
      setTimeout(() => setErrorMsg(''), 8000);
    }
  });

  const handleReturnClick = (assetId: string) => {
    setReturnId(assetId);
  };

  const confirmReturn = () => {
    if (returnId) {
      confirm({
        title: 'Confirmar Devolución',
        message: '¿Estás seguro de que deseas iniciar el proceso de devolución para este activo?',
        type: 'warning',
        onConfirm: () => returnMutation.mutate(returnId)
      });
    }
  };

  const handleAssignClick = (assetId: string) => {
    setFormData({
      id: `assig-${Math.floor(Math.random() * 1000)}`,
      assetId: assetId,
      collaboratorId: '',
      collaboratorEmail: '',
      startDate: new Date().toISOString().split('T')[0]
    });
    setAssignModalAssetId(assetId);
  };

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    confirm({
      title: 'Confirmar Asignación',
      message: '¿Estás seguro de asignar este equipo al colaborador seleccionado?',
      type: 'info',
      onConfirm: () => assignMutation.mutate(formData)
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEditClick = (asset: any) => {
    setIsEditing(true);
    setNewAsset({
      id: asset.id,
      categoryId: asset.categoryId,
      serial: asset.serial,
      dynamicAttributes: asset.dynamicAttributes || {},
      purchaseDate: asset.purchaseDate ? asset.purchaseDate.split('T')[0] : '',
      warrantyMonths: asset.warrantyMonths || 0,
      depreciationYears: asset.depreciationYears || 0,
      purchasePrice: asset.purchasePrice || undefined
    });
    setShowAddModal(true);
  };

  if (isLoading) return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p className="title-glow">Cargando inventario...</p>
    </div>
  );

  if (error) return <div className="error-glass">Error al cargar el inventario: {(error as Error).message}</div>;

    const filteredAssets = assets?.filter((asset: any) => {
    if (filterRisk) {
      if (asset.status !== 'IN_USE') return false;
      let atRisk = false;
      const today = new Date();
      if (asset.purchaseDate) {
        const pd = new Date(asset.purchaseDate);
        if (asset.warrantyMonths) {
          const wDate = new Date(pd);
          wDate.setMonth(wDate.getMonth() + asset.warrantyMonths);
          if (wDate < today) atRisk = true;
        }
        if (asset.depreciationYears) {
          const dDate = new Date(pd);
          dDate.setFullYear(dDate.getFullYear() + asset.depreciationYears);
          if (dDate < today) atRisk = true;
        }
      }
      return atRisk;
    }
    
    if (filterCategory !== 'all') {
      if (asset.categoryId !== filterCategory) return false;
    }
    
    if (filterStatus !== 'all') {
      if (asset.status !== filterStatus) return false;
    }

    return asset.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asset.serial && asset.serial.toLowerCase().includes(searchTerm.toLowerCase())) ||
      asset.categoryId.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="catalog-page">
      <header className="catalog-header">
        <div>
          <h1 className="title-glow" style={{ fontSize: '32px', marginBottom: '8px' }}>Catálogo de Activos</h1>
          <p style={{ color: 'var(--text-muted)' }}>Visualiza y administra todos los equipos registrados en el inventario.</p>
        </div>
        <button className="btn-primary" onClick={() => {
          setIsEditing(false);
          setNewAsset({ id: '', categoryId: '', serial: '', dynamicAttributes: {} });
          setShowAddModal(true);
        }}>
          <Plus size={20} /> Nuevo Activo
        </button>
      </header>

      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: '20px' }}>
          <CheckCircle2 size={20} />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="alert alert-error" style={{ marginBottom: '20px' }}>
          <AlertCircle size={20} />
          {errorMsg}
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
            className="glass-input" 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="all">Todas las Categorías</option>
            {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select 
            className="glass-input" 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="all">Todos los Estados</option>
            <option value="AVAILABLE">Disponible</option>
            <option value="IN_USE">En Uso</option>
            <option value="MAINTENANCE">En Mantenimiento</option>
            <option value="RETIRED">Retirado / Baja</option>
          </select>
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
                <th>Placa Ikusi</th>
                <th>Categoría</th>
                <th>Serial</th>
                <th>Especificaciones Principales</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets?.map((asset) => (
                <tr key={asset.id} className="table-row">
                  <td className="fw-600">{asset.id}</td>
                  <td>
                    <span className="badge badge-category">
                      <Tag size={12} /> {asset.categoryId}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{asset.serial}</td>
                  <td className="specs-cell">
                    {Object.entries(asset.dynamicAttributes || {}).map(([key, value]) => {
                      if (!value || String(value).trim() === '') return null;
                      const lowerKey = key.toLowerCase();
                      let Icon = Tag;
                      if (lowerKey.includes('proces') || lowerKey.includes('cpu')) Icon = Cpu;
                      else if (lowerKey.includes('ram') || lowerKey.includes('mem') || lowerKey.includes('disco') || lowerKey.includes('disk')) Icon = HardDrive;
                      else if (lowerKey.includes('mac') || lowerKey.includes('wifi') || lowerKey.includes('red') || lowerKey.includes('ip')) Icon = Wifi;
                      
                      return (
                        <span key={key} className="spec-tag" title={key}>
                          <Icon size={12} /> {String(value)}
                        </span>
                      );
                    })}
                    {(!asset.dynamicAttributes || Object.values(asset.dynamicAttributes).every(v => !v || String(v).trim() === '')) && 
                      <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Sin specs</span>
                    }
                    
                    {asset.purchaseDate && (
                      <span className="spec-tag" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', marginTop: '4px' }}>
                        📅 Compra: {new Date(asset.purchaseDate).toLocaleDateString('es-CO')}
                      </span>
                    )}
                    
                    {asset.purchaseDate && asset.depreciationYears ? (() => {
                      const purchaseDate = new Date(asset.purchaseDate);
                      const now = new Date();
                      const elapsedMs = now.getTime() - purchaseDate.getTime();
                      const elapsedDays = Math.max(0, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)));
                      const totalDays = asset.depreciationYears * 365;
                      const depreciationPct = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
                      
                      let depreciationValueText = '';
                      if (asset.purchasePrice) {
                        const dailyDepreciation = asset.purchasePrice / totalDays;
                        const depreciatedValue = dailyDepreciation * elapsedDays;
                        const currentValue = Math.max(0, asset.purchasePrice - depreciatedValue);
                        depreciationValueText = ` | Valor Actual: COP $${currentValue.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
                      }

                      return (
                        <span className="spec-tag" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#ca8a04', marginTop: '4px' }}>
                          📉 Depreciación: {depreciationPct.toFixed(1)}%{depreciationValueText}
                        </span>
                      );
                    })() : null}
                  </td>
                  <td>
                    {(() => {
                      const activeAssignment = getActiveAssignmentForAsset(asset.id);
                      if (activeAssignment?.status === 'PENDING_ACCEPTANCE') {
                        return (
                          <>
                            <span className="badge badge-status badge-in_use" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#ca8a04' }}>
                              Pendiente de Firma
                            </span>
                            <div style={{ marginTop: '8px', fontSize: '12px' }}>
                              <span style={{ color: 'var(--text-muted)' }}>En proceso de asignación</span>
                            </div>
                          </>
                        );
                      }
                      if (activeAssignment?.status === 'PENDING_RETURN') {
                        return (
                          <>
                            <span className="badge badge-status badge-in_use" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#ca8a04' }}>
                              Pendiente Devolución
                            </span>
                            <div style={{ marginTop: '8px', fontSize: '12px' }}>
                              <span style={{ color: 'var(--text-muted)' }}>Esperando firma de devolución</span>
                            </div>
                          </>
                        );
                      }
                      
                      return (
                        <>
                          <span className={`badge badge-status badge-${asset.status.toLowerCase()}`}>
                            {asset.status === 'AVAILABLE' ? 'Disponible' :
                              asset.status === 'IN_USE' ? 'En Uso' : asset.status}
                          </span>
                          {asset.status === 'IN_USE' && (
                            <div style={{ marginTop: '8px', fontSize: '12px' }}>
                              {activeAssignment ? (
                                <span style={{ color: 'var(--text-muted)' }}>
                                  En uso por:{' '}
                                  <Link to={`/collaborators/${activeAssignment.collaboratorId}`} style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>
                                    Ver perfil
                                  </Link>
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>Asignado</span>
                              )}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </td>
                  <td style={{ display: 'flex', gap: '8px' }}>
                    {(() => {
                      const activeAssignment = getActiveAssignmentForAsset(asset.id);
                      const isPendingAcceptance = activeAssignment?.status === 'PENDING_ACCEPTANCE';
                      const isPendingReturn = activeAssignment?.status === 'PENDING_RETURN';
                      
                      if (isPendingAcceptance) {
                        return (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              className="btn-action"
                              style={{ borderColor: '#22c55e', color: '#22c55e' }}
                              title="Firma Forzada (TI)"
                              onClick={() => {
                                confirm({
                                  title: 'Firma Forzada (Asignación)',
                                  message: '¿Estás seguro de forzar la firma de esta asignación? Esta acción es administrativa.',
                                  type: 'info',
                                  onConfirm: () => forceAcceptMutation.mutate(asset.id)
                                });
                              }}
                              disabled={forceAcceptMutation.isPending}
                            >
                              <AlertTriangle size={16} /> Forzar Firma
                            </button>
                            <button
                              className="btn-action"
                              style={{ borderColor: '#3b82f6', color: '#3b82f6' }}
                              title="Reenviar Link de Firma"
                              onClick={() => {
                                confirm({
                                  title: 'Reenviar Enlace',
                                  message: '¿Estás seguro de reenviar el enlace de firma al colaborador?',
                                  type: 'info',
                                  onConfirm: () => resendLinkMutation.mutate(asset.id)
                                });
                              }}
                              disabled={resendLinkMutation.isPending}
                            >
                              <RefreshCw size={16} /> Reenviar
                            </button>
                          </div>
                        );
                      }

                      if (asset.status === 'AVAILABLE' && !isPendingAcceptance && !isPendingReturn) {
                        return (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              className="btn-action"
                              style={{ borderColor: 'var(--text-muted)', color: 'var(--text-muted)' }}
                              title="Editar Activo"
                              onClick={() => handleEditClick(asset)}
                            >
                              ✏️
                            </button>
                            <button
                              className="btn-action btn-assign"
                              title="Asignar Activo"
                              onClick={() => handleAssignClick(asset.id)}
                            >
                              <PlusCircle size={16} /> Asignar
                            </button>
                          </div>
                        );
                      }

                      if (asset.status === 'IN_USE' || isPendingReturn) {
                        return (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {!isPendingReturn && (
                              <button
                                className="btn-action btn-return"
                                title="Iniciar Devolución"
                                onClick={() => handleReturnClick(asset.id)}
                                disabled={returnMutation.isPending}
                              >
                                <RefreshCw size={16} /> Devolver
                              </button>
                            )}
                            <button
                              className="btn-action"
                              style={{ borderColor: '#ef4444', color: '#ef4444' }}
                              title="Devolución Forzada (TI)"
                              onClick={() => {
                                confirm({
                                  title: 'Devolución Forzada',
                                  message: '¿Estás seguro de forzar la devolución? Esta acción es administrativa.',
                                  type: 'danger',
                                  onConfirm: () => forceReturnMutation.mutate(asset.id)
                                });
                              }}
                              disabled={forceReturnMutation.isPending}
                            >
                              <AlertTriangle size={16} /> Forzar
                            </button>
                            {isPendingReturn && (
                              <button
                                className="btn-action"
                                style={{ borderColor: '#3b82f6', color: '#3b82f6' }}
                                title="Reenviar Link de Firma"
                                onClick={() => {
                                  confirm({
                                    title: 'Reenviar Enlace',
                                    message: '¿Estás seguro de reenviar el enlace de firma al colaborador?',
                                    type: 'info',
                                    onConfirm: () => resendLinkMutation.mutate(asset.id)
                                  });
                                }}
                                disabled={resendLinkMutation.isPending}
                              >
                                <RefreshCw size={16} /> Reenviar
                              </button>
                            )}
                          </div>
                        );
                      }
                      
                      return null;
                    })()}
                    {asset.status !== 'RETIRED' && (
                      <button
                        className="btn-action"
                        style={{ borderColor: '#ef4444', color: '#ef4444', marginLeft: '8px' }}
                        title="Dar de Baja"
                        onClick={() => {
                          const reason = window.prompt('Por favor, indica el motivo por el cual se da de baja este activo:');
                          if (reason !== null && reason.trim() !== '') {
                            confirm({
                              title: 'Dar de Baja',
                              message: '¿Estás seguro de que deseas dar de baja este activo definitivamente? Esta acción es irreversible.',
                              type: 'danger',
                              onConfirm: () => retireAssetMutation.mutate({ id: asset.id, reason: reason.trim() })
                            });
                          } else if (reason !== null) {
                            alert('Debes proporcionar un motivo válido para dar de baja el activo.');
                          }
                        }}
                        disabled={retireAssetMutation.isPending}
                      >
                        <AlertTriangle size={16} /> Baja
                      </button>
                    )}
                  </td>
                </tr>
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
      </div>

      {/* MODAL CONFIRMACIÓN DEVOLUCIÓN */}
      {returnId && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ padding: '30px', maxWidth: '400px', textAlign: 'center' }}>
            <AlertTriangle size={48} color="#eab308" style={{ marginBottom: '20px' }} />
            <h3>¿Iniciar Devolución?</h3>
            <p style={{ margin: '15px 0', color: 'var(--text-muted)' }}>
              Se iniciará el proceso de devolución para el activo <b>{returnId}</b>. El colaborador recibirá un correo para firmar el Paz y Salvo.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
              <button
                onClick={() => setReturnId(null)}
                style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--border-glass)', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmReturn}
                disabled={returnMutation.isPending}
                style={{ padding: '10px 20px', background: '#eab308', border: 'none', color: '#000', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {returnMutation.isPending ? 'Procesando...' : <><RefreshCw size={16} /> Confirmar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ASIGNACIÓN RÁPIDA */}
      {assignModalAssetId && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px' }}>

          <div className="glass-panel form-container" style={{ position: 'relative', width: '100%', maxWidth: '900px', margin: 0 }}>
            <button
              onClick={() => {
                setAssignModalAssetId(null);
                setFormData({
                  id: `assig-${Math.floor(Math.random() * 1000)}`,
                  assetId: '',
                  collaboratorId: '',
                  collaboratorEmail: '',
                  startDate: new Date().toISOString().split('T')[0]
                });
              }}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '5px' }}
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

            <form onSubmit={handleAssignSubmit} className="assignment-form">
              <div className="form-group">
                <label>ID de Asignación Temporal</label>
                <input type="text" className="glass-input" name="id" value={formData.id} disabled />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Placa Ikusi</label>
                  <input type="text" className="glass-input" name="assetId" value={formData.assetId} disabled />
                </div>
                <div className="form-group">
                  <label>Colaborador</label>
                  <select
                    required
                    className="glass-input"
                    value={formData.collaboratorEmail}
                    onChange={(e) => {
                      const selected = collaborators?.find(c => c.email === e.target.value);
                      if (selected) {
                        setFormData({
                          ...formData,
                          collaboratorEmail: selected.email,
                          collaboratorId: selected.id
                        });
                      } else {
                        setFormData({
                          ...formData,
                          collaboratorEmail: '',
                          collaboratorId: ''
                        });
                      }
                    }}
                    style={{ WebkitAppearance: 'none', background: 'rgba(0,0,0,0.2)', color: 'white' }}
                  >
                    <option value="" style={{ color: 'black' }}>Seleccione colaborador...</option>
                    {collaborators?.filter(c => c.status === 'ACTIVE').map(c => (
                      <option key={c.id} value={c.email} style={{ color: 'black' }}>{c.name}</option>
                    ))}
                  </select>
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

              <button type="submit" className="btn-primary submit-btn" disabled={assignMutation.isPending}>
                {assignMutation.isPending ? 'Procesando...' : <><Send size={18} /> Procesar Asignación</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR/EDITAR ACTIVO */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px' }}>
          <div className="glass-panel" style={{ position: 'relative', width: '100%', maxWidth: '600px', margin: 0, padding: '30px', maxHeight: '90vh', overflowY: 'auto' }}>
            <button
              onClick={() => setShowAddModal(false)}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '5px', fontSize: '18px' }}
            >
              ✕
            </button>
            <h3 style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--text-main)', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px', fontSize: '22px', marginTop: 0 }}>
              {isEditing ? 'Editar Activo' : 'Registrar Nuevo Activo'}
            </h3>
            <form onSubmit={(e) => { 
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
            }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Categoría</label>
                <select
                  required
                  className="glass-input"
                  value={newAsset.categoryId}
                  disabled={isEditing}
                  onChange={e => {
                    const catId = e.target.value;
                    const cat = categories?.find((c: any) => c.id === catId);
                    const newDynamicAttr: any = {};
                    if (cat && cat.schemaDefinition?.fields) {
                      cat.schemaDefinition.fields.forEach((f: any) => newDynamicAttr[f.name] = '');
                    }
                    setNewAsset({ ...newAsset, categoryId: catId, dynamicAttributes: newDynamicAttr });
                  }}
                >
                  <option value="" disabled>Seleccione una categoría</option>
                  {categories?.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {newAsset.categoryId && (
                <>
                                    <div className="form-group">
                    <label>
                      {(() => {
                         const cat = categories?.find((c: any) => c.id === newAsset.categoryId);
                         return cat?.schemaDefinition?.requiresPlacaIkusi !== false ? "Placa Ikusi" : "ID Interno (Generado automáticamente)";
                      })()}
                    </label>
                    <input 
                       type="text" 
                       required={categories?.find((c: any) => c.id === newAsset.categoryId)?.schemaDefinition?.requiresPlacaIkusi !== false}
                       className="glass-input" 
                       value={newAsset.id} 
                       disabled={isEditing || categories?.find((c: any) => c.id === newAsset.categoryId)?.schemaDefinition?.requiresPlacaIkusi === false} 
                       onChange={e => setNewAsset({ ...newAsset, id: e.target.value })} 
                       placeholder={categories?.find((c: any) => c.id === newAsset.categoryId)?.schemaDefinition?.requiresPlacaIkusi !== false ? "Ej. AST-2026-050" : "Autogenerado (Ej: 000001)"} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Número de Serie</label>
                    <input type="text" className="glass-input" value={newAsset.serial} onChange={e => setNewAsset({ ...newAsset, serial: e.target.value })} placeholder="Ej. SN-X3X3X3 (Opcional)" />
                  </div>
                  <div className="form-group">
                    <label>Fecha de Compra</label>
                    <input type="date" max={new Date().toISOString().split('T')[0]} className="glass-input" value={newAsset.purchaseDate || ''} onChange={e => setNewAsset({ ...newAsset, purchaseDate: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Garantía (Meses)</label>
                    <input type="number" min="0" className="glass-input" value={newAsset.warrantyMonths || ''} onChange={e => setNewAsset({ ...newAsset, warrantyMonths: parseInt((e.target.value), 10) })} placeholder="Ej. 12 (Opcional)" />
                  </div>
                  <div className="form-group">
                    <label>Valor de Compra (COP) (Opcional)</label>
                    <input type="number" step="0.01" min="0" className="glass-input" value={newAsset.purchasePrice || ''} onChange={e => setNewAsset({ ...newAsset, purchasePrice: parseFloat(e.target.value) })} placeholder="Ej. 1200000" />
                  </div>
                  <div className="form-group">
                    <label>Depreciación (Opcional)</label>
                    <select className="glass-input" value={newAsset.depreciationYears || ''} onChange={e => setNewAsset({ ...newAsset, depreciationYears: e.target.value ? parseInt(e.target.value, 10) : undefined })}>
                      <option value="">No aplica / Sin calcular</option>
                      <option value="3">3 Años</option>
                      <option value="5">5 Años</option>
                    </select>
                  </div>

                  {Object.keys(newAsset.dynamicAttributes).map((attrName) => {
                    const fieldDef = categories?.find((c: any) => c.id === newAsset.categoryId)?.schemaDefinition?.fields?.find((f: any) => f.name === attrName);
                    const isRequired = fieldDef?.isRequired;
                    const type = fieldDef?.type || 'text';
                    const options = fieldDef?.options || [];
                    const unit = fieldDef?.unit;
                    const regex = fieldDef?.validationRegex;
                    const regexMsg = fieldDef?.validationMessage;

                    return (
                      <div className="form-group" key={attrName}>
                        <label style={{ textTransform: 'capitalize' }}>{attrName} {isRequired && <span style={{ color: 'red' }}>*</span>}</label>
                        {type === 'select' ? (
                          <select
                            required={isRequired}
                            className="glass-input"
                            value={newAsset.dynamicAttributes[attrName] || ''}
                            onChange={(e) => setNewAsset({
                              ...newAsset,
                              dynamicAttributes: { ...newAsset.dynamicAttributes, [attrName]: e.target.value }
                            })}
                          >
                            <option value="" disabled>Seleccione una opción</option>
                            {options.map((opt: string) => {
                              const displayOpt = unit && !opt.includes(unit) ? `${opt} ${unit}` : opt;
                              return <option key={opt} value={displayOpt} style={{ color: 'black' }}>{displayOpt}</option>;
                            })}
                          </select>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="text"
                              required={isRequired}
                              className="glass-input"
                              pattern={regex}
                              title={regexMsg}
                              value={(newAsset.dynamicAttributes[attrName] || '').replace(new RegExp(`\\s?${unit}$`), '')}
                              onChange={(e) => {
                                const val = e.target.value;
                                const finalVal = val && unit ? `${val} ${unit}` : val;
                                setNewAsset({
                                  ...newAsset,
                                  dynamicAttributes: { ...newAsset.dynamicAttributes, [attrName]: finalVal }
                                });
                              }}
                              placeholder={`Ingrese ${attrName}`}
                            />
                            {unit && <span style={{ color: 'var(--text-muted)', fontWeight: 600, paddingRight: '8px' }}>{unit}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <button type="submit" className="btn-primary submit-btn" disabled={addAssetMutation.isPending || editAssetMutation.isPending}>
                    {(addAssetMutation.isPending || editAssetMutation.isPending) ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Crear Activo')}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

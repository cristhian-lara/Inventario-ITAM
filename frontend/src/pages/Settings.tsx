import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Plus, Building, Briefcase, Tag, CheckCircle2, AlertCircle, FileText, Save } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext';
import { usePermission } from '../context/AuthContext';
import LoadingState from '../components/LoadingState';
import CategoryFormModal from '../components/settings/CategoryFormModal';
import type { FieldConfig } from '../components/settings/CategoryFormModal';
import DepartmentFormModal from '../components/settings/DepartmentFormModal';
import CecosFormModal from '../components/settings/CecosFormModal';
import DeleteFieldModal from '../components/settings/DeleteFieldModal';
import './Settings.css';
import { API_URL } from '../config';

export default function Settings() {
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  // Permisos RBAC del módulo Configuración
  const settingsPerms = usePermission('settings');
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Estados form Categoría
  const [newCatName, setNewCatName] = useState('');
  const [newCatRequiresPlaca, setNewCatRequiresPlaca] = useState(true);
  const [newCatIdPrefix, setNewCatIdPrefix] = useState('');
  const [fields, setFields] = useState<FieldConfig[]>([{ name: '', isRequired: true, type: 'text', options: [], unit: '', newOptionValue: '' }]);
  const [deleteFieldIdx, setDeleteFieldIdx] = useState<number | null>(null);

  // Estados form Departamento
  const [newDepName, setNewDepName] = useState('');
  const [newDepDesc, setNewDepDesc] = useState('');

  // Estados form CECOS
  const [newCecosId, setNewCecosId] = useState('');
  const [newCecosName, setNewCecosName] = useState('');
  const [newCecosDesc, setNewCecosDesc] = useState('');
  const [editingCecosId, setEditingCecosId] = useState<string | null>(null);
  const [showCecosModal, setShowCecosModal] = useState(false);

  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [editingDepId, setEditingDepId] = useState<number | null>(null);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showDepModal, setShowDepModal] = useState(false);

  const { data: categories, isLoading: loadingCat } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/catalog/categories`);
      return response.data;
    }
  });

  const { data: departments, isLoading: loadingDep } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/collaborators/departments`);
      return response.data;
    }
  });

  const { data: cecosList, isLoading: loadingCecos } = useQuery({
    queryKey: ['cecos'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/collaborators/cecos`);
      return response.data;
    }
  });

  const catMutation = useMutation({
    mutationFn: async () => {
      const cleanFields = fields.map(({ newOptionValue, ...f }) => ({
        name: f.name,
        type: f.type,
        isRequired: f.isRequired,
        options: Array.isArray(f.options) ? f.options : [],
        unit: f.unit || undefined
      }));
      const payload = {
        name: newCatName,
        schema: {
          requiresPlacaIkusi: newCatRequiresPlaca,
          idPrefix: newCatRequiresPlaca ? undefined : (newCatIdPrefix.trim() || undefined),
          fields: cleanFields
        }
      };
      const res = await axios.post(`${API_URL}/api/catalog/categories`, payload);
      return res.data;
    },
    onSuccess: () => {
      setSuccessMsg('Categoría creada con éxito');
      setNewCatName(''); setNewCatRequiresPlaca(true); setNewCatIdPrefix(''); setFields([{name: '', isRequired: true, type: 'text', options: [], unit: '', newOptionValue: ''}]); setShowCatModal(false);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setTimeout(() => setSuccessMsg(''), 5000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || err.message);
      setTimeout(() => setErrorMsg(''), 5000);
    }
  });

  const updateCatMutation = useMutation({
    mutationFn: async () => {
      const cleanFields = fields.map(({ newOptionValue, ...f }) => ({
        name: f.name,
        type: f.type,
        isRequired: f.isRequired,
        options: Array.isArray(f.options) ? f.options : [],
        unit: f.unit || undefined
      }));
      const res = await axios.put(`${API_URL}/api/catalog/categories/${editingCatId}`, {
        name: newCatName,
        schema: {
          requiresPlacaIkusi: newCatRequiresPlaca,
          idPrefix: newCatRequiresPlaca ? undefined : (newCatIdPrefix.trim() || undefined),
          fields: cleanFields
        }
      });
      return res.data;
    },
    onSuccess: () => {
      setSuccessMsg('Categoría actualizada con éxito');
      setNewCatName(''); setFields([{name: '', isRequired: true, type: 'text', options: [], unit: '', newOptionValue: ''}]); setShowCatModal(false); setEditingCatId(null);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setTimeout(() => setSuccessMsg(''), 5000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || err.message);
      setTimeout(() => setErrorMsg(''), 5000);
    }
  });

  const depMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.post(`${API_URL}/api/collaborators/departments`, {
        name: newDepName,
        description: newDepDesc
      });
      return res.data;
    },
    onSuccess: () => {
      setSuccessMsg('Departamento creado con éxito');
      setNewDepName(''); setNewDepDesc(''); setShowDepModal(false);
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setTimeout(() => setSuccessMsg(''), 5000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || err.message);
      setTimeout(() => setErrorMsg(''), 5000);
    }
  });

  const updateDepMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.put(`${API_URL}/api/collaborators/departments/${editingDepId}`, {
        name: newDepName,
        description: newDepDesc
      });
      return res.data;
    },
    onSuccess: () => {
      setSuccessMsg('Departamento actualizado con éxito');
      setNewDepName(''); setNewDepDesc(''); setShowDepModal(false); setEditingDepId(null);
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setTimeout(() => setSuccessMsg(''), 5000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || err.message);
      setTimeout(() => setErrorMsg(''), 5000);
    }
  });

  const cecosMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.post(`${API_URL}/api/collaborators/cecos`, {
        id: newCecosId,
        name: newCecosName,
        description: newCecosDesc
      });
      return res.data;
    },
    onSuccess: () => {
      setSuccessMsg('CECOS guardado con éxito');
      setNewCecosId(''); setNewCecosName(''); setNewCecosDesc(''); setShowCecosModal(false);
      queryClient.invalidateQueries({ queryKey: ['cecos'] });
      setTimeout(() => setSuccessMsg(''), 5000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || err.message);
      setTimeout(() => setErrorMsg(''), 5000);
    }
  });

  const updateCecosMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.put(`${API_URL}/api/collaborators/cecos/${editingCecosId}`, {
        name: newCecosName,
        description: newCecosDesc
      });
      return res.data;
    },
    onSuccess: () => {
      setSuccessMsg('CECOS actualizado con éxito');
      setNewCecosId(''); setNewCecosName(''); setNewCecosDesc(''); setShowCecosModal(false); setEditingCecosId(null);
      queryClient.invalidateQueries({ queryKey: ['cecos'] });
      setTimeout(() => setSuccessMsg(''), 5000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || err.message);
      setTimeout(() => setErrorMsg(''), 5000);
    }
  });

  const handleEditCecos = (c: any) => {
    setEditingCecosId(c.id);
    setNewCecosId(c.id);
    setNewCecosName(c.name);
    setNewCecosDesc(c.description || '');
    setShowCecosModal(true);
  };

  // --- CUSTOM LISTS STATE ---
  const [activeTab2, setActiveTab2] = useState('categories');

  const { data: settingsData, isLoading: loadingSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/settings`);
      return response.data;
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await axios.put(`${API_URL}/api/settings`, payload);
      return res.data;
    },
    onSuccess: () => {
      setSuccessMsg('Plantillas guardadas con éxito');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setTimeout(() => setSuccessMsg(''), 5000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || err.message);
      setTimeout(() => setErrorMsg(''), 5000);
    }
  });

  const defaultAssignment = `Mediante la presente hago constar que recibí del área de Tecnología de información el equipo de cómputo en la siguiente página. Me han asignado para facilitar el desempeño de mis funciones, comprometiéndome a destinarlo solo para fines de trabajo y cuidados para su buen funcionamiento y conservación. Cabe señalar que, de existir algún daño físico del equipo imputable a negligencia, acepto la responsabilidad en la reparación de estos.\n\nDe la misma forma que estoy enterado del compromiso de no instalar software adicional al que tiene el equipo sin previa NOTIFICACION Y AUTORIZACION DEL DEPARTAMENTO DE TI. Haciéndome responsable de las sanciones que pudiera dar lugar por dicha instalación.\n\nLos gastos derivados de la reparación y/o remplazo de los equipos de cómputo por daños sufridos como consecuencias de negligencia o descuido por mi parte será de mi entera responsabilidad y son susceptibles de serme repercutidos.\n\nEn caso de robo del equipo, es obligatoria del empleado entregar al departamento de TI copia del acta levantada para poder proceder al trámite de seguro.\n\nCabe señalar que al dar terminada mi relación laboral dentro de IKUSI Redes Colombia, S.A.S. de C. V. me obligo a entregar el equipo en buenas condiciones, (incluyendo toda la información generada por mis actividades) al departamento de TI para que sea dada de baja esta RESPONSIVA.\n\nLa empresa se reserva el derecho de solicitar al empleado en cualquier momento el equipo para su auditoria y/o revisión.`;
  const defaultReturn = `Mediante la presente, el colaborador hace entrega formal al área de Tecnología de la Información del equipo de cómputo listado en este documento, el cual le fue asignado previamente para el desempeño de sus funciones.\n\nSe deja constancia de que el equipo ha sido revisado por el departamento de TI, validando su estado físico y de funcionamiento actual. Al firmar este documento de Paz y Salvo, el colaborador queda exento de cualquier responsabilidad futura relacionada con el cuidado, conservación o daños del hardware aquí mencionado.\n\nAsimismo, el colaborador certifica que ha entregado los accesorios asociados (cargador, maletín, etc.) y que no retiene información confidencial de IKUSI Redes Colombia, S.A.S. de C. V. en medios de almacenamiento personales derivada del uso de este equipo.\n\nEste documento cancela la responsiva firmada en el momento de la asignación original, dando de baja la responsabilidad del empleado sobre los activos relacionados.`;
  const defaultMaintenance = `Por medio de la presente, confirmo que he recibido de vuelta mi equipo y certifico que el servicio de mantenimiento detallado en la página anterior se ha realizado satisfactoriamente. Entiendo que debo notificar inmediatamente al área de Tecnología de la Información en caso de presentarse anomalías recurrentes relacionadas con este servicio.\n\nEl usuario certifica que al momento de la devolución, el equipo es operativo de acuerdo a lo expresado en los detalles técnicos de este acta, dándose por concluido el servicio programado.`;

  const [actaAsignacion, setActaAsignacion] = useState(defaultAssignment);
  const [actaDevolucion, setActaDevolucion] = useState(defaultReturn);
  const [actaMantenimiento, setActaMantenimiento] = useState(defaultMaintenance);

  React.useEffect(() => {
    if (settingsData) {
      if (settingsData.ACTA_ASIGNACION_TEXT) setActaAsignacion(settingsData.ACTA_ASIGNACION_TEXT);
      if (settingsData.ACTA_DEVOLUCION_TEXT) setActaDevolucion(settingsData.ACTA_DEVOLUCION_TEXT);
      if (settingsData.ACTA_MANTENIMIENTO_TEXT) setActaMantenimiento(settingsData.ACTA_MANTENIMIENTO_TEXT);
    }
  }, [settingsData]);

  const handleSaveTemplates = () => {
    confirm({
      title: 'Guardar Plantillas',
      message: '¿Estás seguro de guardar los cambios en las plantillas de actas?',
      type: 'info',
      onConfirm: () => {
        updateSettingsMutation.mutate({
          ACTA_ASIGNACION_TEXT: actaAsignacion,
          ACTA_DEVOLUCION_TEXT: actaDevolucion,
          ACTA_MANTENIMIENTO_TEXT: actaMantenimiento
        });
      }
    });
  };

    const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    confirm({
      title: editingCatId ? 'Guardar Cambios' : 'Crear Categoría',
      message: editingCatId ? '¿Estás seguro de guardar los cambios de esta categoría?' : '¿Estás seguro de crear esta categoría?',
      type: 'info',
      onConfirm: () => {
        if (editingCatId) {
          updateCatMutation.mutate();
        } else {
          catMutation.mutate();
        }
      }
    });
  };

  const handleCreateDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    confirm({
      title: editingDepId ? 'Guardar Cambios' : 'Crear Departamento',
      message: editingDepId ? '¿Estás seguro de guardar los cambios de este departamento?' : '¿Estás seguro de crear este departamento?',
      type: 'info',
      onConfirm: () => {
        if (editingDepId) {
          updateDepMutation.mutate();
        } else {
          depMutation.mutate();
        }
      }
    });
  };

  const handleEditCategory = (cat: any) => {
    setEditingCatId(cat.id);
    setNewCatName(cat.name);
    setNewCatRequiresPlaca(cat.schemaDefinition?.requiresPlacaIkusi !== false);
    setNewCatIdPrefix(cat.schemaDefinition?.idPrefix || '');
    const catFields = cat.schemaDefinition?.fields || [];
    setFields(catFields.length ? catFields.map((f: any) => ({
      ...f,
      type: f.type || 'text',
      options: Array.isArray(f.options) ? f.options : [],
      unit: f.unit || '',
      newOptionValue: ''
    })) : [{name: '', isRequired: true, type: 'text', options: [], unit: '', newOptionValue: ''}]);
    setShowCatModal(true);
  };

  return (
    <div className="settings-page">
      <header className="settings-header">
        <div>
          <h1 className="title-glow" style={{ fontSize: '32px', marginBottom: '8px' }}>Administración</h1>
          <p style={{ color: 'var(--text-muted)' }}>Gestiona los catálogos base del sistema.</p>
        </div>
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

      <div className="settings-container">
                <div className="settings-sidebar glass-panel">
          <button 
            className={`settings-tab ${activeTab2 === 'categories' ? 'active' : ''}`}
            onClick={() => setActiveTab2('categories')}
          >
            <Tag size={18} /> Categorías de Activos
          </button>
          <button 
            className={`settings-tab ${activeTab2 === 'departments' ? 'active' : ''}`}
            onClick={() => setActiveTab2('departments')}
          >
            <Building size={18} /> Departamentos
          </button>
          <button 
            className={`settings-tab ${activeTab2 === 'cecos' ? 'active' : ''}`}
            onClick={() => setActiveTab2('cecos')}
          >
            <Briefcase size={18} /> CECOS
          </button>
          <button
            className={`settings-tab ${activeTab2 === 'templates' ? 'active' : ''}`}
            onClick={() => setActiveTab2('templates')}
          >
            <FileText size={18} /> Plantillas de Actas
          </button>

                  </div>

        <div className="settings-content glass-panel">
          {activeTab2 === 'categories' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0 }}>Categorías Existentes</h3>
                {settingsPerms.create && (
                <button className="btn-primary" onClick={() => {
                  setEditingCatId(null);
                  setNewCatName('');
                  setNewCatRequiresPlaca(true);
                  setFields([{name: '', isRequired: true, type: 'text', options: [], unit: '', newOptionValue: ''}]);
                  setShowCatModal(true);
                }}>
                  <Plus size={16} /> Nueva Categoría
                </button>
                )}
              </div>
              {loadingCat ? <LoadingState inline /> : (
                <div className="list-grid">
                  {categories?.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--border-glass)' }}>
                      <Tag size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                      <p>No hay categorías registradas. ¡Crea la primera arriba!</p>
                    </div>
                  ) : categories?.map((cat: any) => (
                    <div key={cat.id} className="list-card" style={{ position: 'relative' }}>
                      {settingsPerms.edit && (
                      <button
                        onClick={() => handleEditCategory(cat)}
                        style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px' }}
                        title="Editar Categoría"
                      >
                        ✏️
                      </button>
                      )}
                      <h4>{cat.name}</h4>
                      <p className="list-id">ID: {cat.id}</p>
                      <div className="list-tags">
                        {cat.schemaDefinition?.fields?.map((f: any) => (
                          <span key={f.name} className="list-tag" style={{ borderLeft: f.isRequired ? '3px solid #ef4444' : '3px solid #3b82f6' }}>
                            {f.name} {f.isRequired ? '*' : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab2 === 'departments' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0 }}>Departamentos Existentes</h3>
                {settingsPerms.create && (
                <button className="btn-primary" onClick={() => {
                  setEditingDepId(null);
                  setNewDepName('');
                  setNewDepDesc('');
                  setShowDepModal(true);
                }}>
                  <Plus size={16} /> Nuevo Departamento
                </button>
                )}
              </div>
              {loadingDep ? <LoadingState inline /> : (
                <div className="list-grid">
                  {departments?.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--border-glass)' }}>
                      <Building size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                      <p>No hay departamentos registrados. ¡Crea el primero arriba!</p>
                    </div>
                  ) : departments?.map((dep: any) => (
                    <div key={dep.id} className="list-card" style={{ position: 'relative' }}>
                      {settingsPerms.edit && (
                      <button
                        onClick={() => {
                          setEditingDepId(dep.id);
                          setNewDepName(dep.name);
                          setNewDepDesc(dep.description || '');
                          setShowDepModal(true);
                        }}
                        style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px' }}
                        title="Editar Departamento"
                      >
                        ✏️
                      </button>
                      )}
                      <h4>{dep.name}</h4>
                      <p className="list-id">ID: {dep.id}</p>
                      <p className="list-desc">{dep.description || 'Sin descripción'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        {activeTab2 === 'cecos' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0 }}>CECOS Existentes</h3>
              {settingsPerms.create && (
              <button className="btn-primary" onClick={() => {
                setEditingCecosId(null);
                setNewCecosId(''); setNewCecosName(''); setNewCecosDesc('');
                setShowCecosModal(true);
              }}>
                <Plus size={18} /> Nuevo CECOS
              </button>
              )}
            </div>
            
            {loadingCecos ? (
              <LoadingState inline />
            ) : (
              <div className="list-grid">
                {cecosList?.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <Briefcase size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                    <p>No hay CECOS registrados. ¡Crea el primero arriba!</p>
                  </div>
                ) : cecosList?.map((c: any) => (
                  <div key={c.id} className="list-card" style={{ position: 'relative' }}>
                    {settingsPerms.edit && (
                    <button
                      onClick={() => handleEditCecos(c)}
                      style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px' }}
                      title="Editar CECOS"
                    >
                      ✏️
                    </button>
                    )}
                    <h4>{c.name}</h4>
                    <p className="list-id">ID: {c.id}</p>
                    <p className="list-desc">{c.description || 'Sin descripción'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab2 === 'templates' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0 }}>Plantillas de Actas</h3>
              {settingsPerms.edit && (
              <button className="btn-primary" onClick={handleSaveTemplates} disabled={updateSettingsMutation.isPending}>
                <Save size={18} /> Guardar Cambios
              </button>
              )}
            </div>
            
            {loadingSettings ? (
              <LoadingState inline />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px dashed var(--border-glass)' }}>
                  <h4 style={{ margin: '0 0 16px 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={18} color="var(--ikusi-green)" />
                    Acta de Asignación
                  </h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>Este texto legal aparecerá en la página final del PDF de asignación.</p>
                  <textarea 
                    className="glass-input"
                    rows={8}
                    readOnly={!settingsPerms.edit}
                    style={{ width: '100%', resize: 'vertical' }}
                    value={actaAsignacion}
                    onChange={(e) => setActaAsignacion(e.target.value)}
                  />
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px dashed var(--border-glass)' }}>
                  <h4 style={{ margin: '0 0 16px 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={18} color="var(--ikusi-green)" />
                    Acta de Paz y Salvo (Devolución)
                  </h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>Este texto legal aparecerá en la página final del PDF de devolución.</p>
                  <textarea 
                    className="glass-input"
                    rows={8}
                    readOnly={!settingsPerms.edit}
                    style={{ width: '100%', resize: 'vertical' }}
                    value={actaDevolucion}
                    onChange={(e) => setActaDevolucion(e.target.value)}
                  />
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px dashed var(--border-glass)' }}>
                  <h4 style={{ margin: '0 0 16px 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={18} color="var(--ikusi-green)" />
                    Acta de Mantenimiento Técnico
                  </h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>Este texto legal aparecerá en la página final del PDF de mantenimiento.</p>
                  <textarea 
                    className="glass-input"
                    rows={8}
                    readOnly={!settingsPerms.edit}
                    style={{ width: '100%', resize: 'vertical' }}
                    value={actaMantenimiento}
                    onChange={(e) => setActaMantenimiento(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

                  </div>

      {showCatModal && (
        <CategoryFormModal
          editingCatId={editingCatId}
          newCatName={newCatName}
          setNewCatName={setNewCatName}
          newCatRequiresPlaca={newCatRequiresPlaca}
          setNewCatRequiresPlaca={setNewCatRequiresPlaca}
          newCatIdPrefix={newCatIdPrefix}
          setNewCatIdPrefix={setNewCatIdPrefix}
          fields={fields}
          setFields={setFields}
          onDeleteFieldRequest={(idx) => setDeleteFieldIdx(idx)}
          onClose={() => setShowCatModal(false)}
          onSubmit={handleCreateCategory}
          onCancelEdit={() => { setEditingCatId(null); setNewCatName(''); setFields([{ name: '', isRequired: true, type: 'text', options: [] } as any]); setShowCatModal(false); }}
          isPending={catMutation.isPending || updateCatMutation.isPending}
        />
      )}

      {showDepModal && (
        <DepartmentFormModal
          editingDepId={editingDepId}
          newDepName={newDepName}
          setNewDepName={setNewDepName}
          newDepDesc={newDepDesc}
          setNewDepDesc={setNewDepDesc}
          onClose={() => setShowDepModal(false)}
          onSubmit={handleCreateDepartment}
          onCancelEdit={() => { setEditingDepId(null); setNewDepName(''); setNewDepDesc(''); setShowDepModal(false); }}
          isPending={depMutation.isPending || updateDepMutation.isPending}
        />
      )}

      {showCecosModal && (
        <CecosFormModal
          editingCecosId={editingCecosId}
          newCecosId={newCecosId}
          setNewCecosId={setNewCecosId}
          newCecosName={newCecosName}
          setNewCecosName={setNewCecosName}
          newCecosDesc={newCecosDesc}
          setNewCecosDesc={setNewCecosDesc}
          onClose={() => setShowCecosModal(false)}
          onSubmit={e => {
            e.preventDefault();
            confirm({
              title: editingCecosId ? 'Guardar Cambios' : 'Crear CECOS',
              message: editingCecosId ? '¿Estás seguro de guardar los cambios de este CECOS?' : '¿Estás seguro de crear este CECOS?',
              type: 'info',
              onConfirm: () => {
                if (editingCecosId) updateCecosMutation.mutate();
                else cecosMutation.mutate();
              }
            });
          }}
          onCancelEdit={() => { setEditingCecosId(null); setNewCecosId(''); setNewCecosName(''); setNewCecosDesc(''); setShowCecosModal(false); }}
          isPending={cecosMutation.isPending || updateCecosMutation.isPending}
        />
      )}

            </div>

      {/* MODAL ELIMINAR CAMPO */}
      {deleteFieldIdx !== null && (
        <DeleteFieldModal
          fieldName={fields[deleteFieldIdx]?.name || `Campo ${deleteFieldIdx + 1}`}
          onClose={() => setDeleteFieldIdx(null)}
          onConfirm={() => {
            const newF = fields.filter((_, i) => i !== deleteFieldIdx);
            setFields(newF);
            setDeleteFieldIdx(null);
          }}
        />
      )}

    </div>
  );
}
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Plus, Settings as SettingsIcon, Building, Briefcase, Tag, CheckCircle2, AlertCircle, Trash2, Database, Edit, X } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext';
import './Settings.css';
import { API_URL } from '../config';

export default function Settings() {
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Estados form Categoría
  const [newCatName, setNewCatName] = useState('');
  const [newCatRequiresPlaca, setNewCatRequiresPlaca] = useState(true);
  const [fields, setFields] = useState<FieldConfig[]>([{ name: '', isRequired: true, type: 'text', options: [], unit: '', newOptionValue: '' }]);

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
          fields: cleanFields 
        }
      };
      const res = await axios.post(`${API_URL}/api/catalog/categories`, payload);
      return res.data;
    },
    onSuccess: () => {
      setSuccessMsg('Categoría creada con éxito');
      setNewCatName(''); setNewCatRequiresPlaca(true); setFields([{name: '', isRequired: true, type: 'text', options: [], unit: '', newOptionValue: ''}]); setShowCatModal(false);
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
  const [activeTab2, setActiveTab2] = useState<'categories' | 'departments' | 'cecos' | 'custom-lists'>('categories');
  const [newCustomListName, setNewCustomListName] = useState('');
  const [newCustomListTarget, setNewCustomListTarget] = useState<'Collaborator' | 'Asset' | 'None'>('None');
  const [newCustomListDesc, setNewCustomListDesc] = useState('');
  const [editingCustomListId, setEditingCustomListId] = useState<string | null>(null);
  const [showCustomListModal, setShowCustomListModal] = useState(false);

  const [selectedListForItems, setSelectedListForItems] = useState<any>(null);
  const [showListItemsModal, setShowListItemsModal] = useState(false);
  const [newItemValue, setNewItemValue] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const { data: customLists, isLoading: loadingCustomLists } = useQuery({
    queryKey: ['custom-lists'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/master-data/custom-lists`);
      return response.data;
    }
  });

  const customListMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.post(`${API_URL}/api/master-data/custom-lists`, {
        name: newCustomListName,
        description: newCustomListDesc,
        targetEntity: newCustomListTarget,
        targetEntity: newCustomListTarget
      });
      return res.data;
    },
    onSuccess: () => {
      setSuccessMsg('Lista guardada con éxito');
      setNewCustomListName(''); setNewCustomListDesc(''); setNewCustomListTarget('None'); setShowCustomListModal(false);
      queryClient.invalidateQueries({ queryKey: ['custom-lists'] });
      setTimeout(() => setSuccessMsg(''), 5000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || err.message);
      setTimeout(() => setErrorMsg(''), 5000);
    }
  });

  const updateCustomListMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.put(`${API_URL}/api/master-data/custom-lists/${editingCustomListId}`, {
        name: newCustomListName,
        description: newCustomListDesc
      });
      return res.data;
    },
    onSuccess: () => {
      setSuccessMsg('Lista actualizada con éxito');
      setNewCustomListName(''); setNewCustomListDesc(''); setNewCustomListTarget('None'); setShowCustomListModal(false); setEditingCustomListId(null);
      queryClient.invalidateQueries({ queryKey: ['custom-lists'] });
      setTimeout(() => setSuccessMsg(''), 5000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || err.message);
      setTimeout(() => setErrorMsg(''), 5000);
    }
  });

  const itemMutation = useMutation({
    mutationFn: async () => {
      if (editingItemId) {
        await axios.put(`${API_URL}/api/master-data/custom-lists/${selectedListForItems.id}/items/${editingItemId}`, {
          value: newItemValue,
          description: newItemDesc
        });
      } else {
        await axios.post(`${API_URL}/api/master-data/custom-lists/${selectedListForItems.id}/items`, {
          value: newItemValue,
          description: newItemDesc
        });
      }
    },
    onSuccess: () => {
      setSuccessMsg('Opción guardada con éxito');
      setNewItemValue(''); setNewItemDesc(''); setEditingItemId(null);
      queryClient.invalidateQueries({ queryKey: ['custom-lists'] });
      queryClient.fetchQuery({ queryKey: ['custom-lists'] }).then((data: any) => {
         const updatedList = data.find((l: any) => l.id === selectedListForItems.id);
         if (updatedList) setSelectedListForItems(updatedList);
      });
      setTimeout(() => setSuccessMsg(''), 5000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || err.message);
      setTimeout(() => setErrorMsg(''), 5000);
    }
  });

  const handleEditCustomList = (c: any) => {
    setEditingCustomListId(c.id);
    setNewCustomListName(c.name);
    setNewCustomListDesc(c.description || '');
    setNewCustomListTarget(c.targetEntity || 'None');
    setShowCustomListModal(true);
  };

  const handleManageItems = (c: any) => {
    setSelectedListForItems(c);
    setShowListItemsModal(true);
  };

  const handleEditItem = (item: any, list: any) => {
    setSelectedListForItems(list);
    setEditingItemId(item.id);
    setNewItemValue(item.value);
    setNewItemDesc(item.description || '');
    setShowListItemsModal(true);
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
          
          {/* Dynamic Modules injected here */}
          <div style={{ padding: '10px 20px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px', marginTop: '10px', borderTop: '1px solid var(--border-glass)' }}>
            Módulos Dinámicos
          </div>
          {customLists?.map((list: any) => (
            <button key={list.id} className={`settings-tab ${activeTab2 === 'custom-list-' + list.id ? 'active' : ''}`} onClick={() => setActiveTab2('custom-list-' + list.id)}>
              <Database size={18} /> {list.name}
            </button>
          ))}
          <button className="settings-tab" style={{ color: 'var(--primary)', justifyContent: 'center', marginTop: '10px', border: '1px dashed var(--primary)' }} onClick={() => { setEditingCustomListId(null); setNewCustomListName(''); setNewCustomListDesc(''); setNewCustomListTarget('None'); setShowCustomListModal(true); }}>
            <Plus size={16} /> Crear Catálogo
          </button>
        </div>

        <div className="settings-content glass-panel">
          {activeTab2 === 'categories' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0 }}>Categorías Existentes</h3>
                <button className="btn-primary" onClick={() => {
                  setEditingCatId(null);
                  setNewCatName('');
                  setNewCatRequiresPlaca(true);
                  setFields([{name: '', isRequired: true, type: 'text', options: [], unit: '', newOptionValue: ''}]);
                  setShowCatModal(true);
                }}>
                  <Plus size={16} /> Nueva Categoría
                </button>
              </div>
              {loadingCat ? <p>Cargando...</p> : (
                <div className="list-grid">
                  {categories?.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--border-glass)' }}>
                      <Tag size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                      <p>No hay categorías registradas. ¡Crea la primera arriba!</p>
                    </div>
                  ) : categories?.map((cat: any) => (
                    <div key={cat.id} className="list-card" style={{ position: 'relative' }}>
                      <button 
                        onClick={() => handleEditCategory(cat)}
                        style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px' }}
                        title="Editar Categoría"
                      >
                        ✏️
                      </button>
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
                <button className="btn-primary" onClick={() => {
                  setEditingDepId(null);
                  setNewDepName('');
                  setNewDepDesc('');
                  setShowDepModal(true);
                }}>
                  <Plus size={16} /> Nuevo Departamento
                </button>
              </div>
              {loadingDep ? <p>Cargando...</p> : (
                <div className="list-grid">
                  {departments?.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--border-glass)' }}>
                      <Building size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                      <p>No hay departamentos registrados. ¡Crea el primero arriba!</p>
                    </div>
                  ) : departments?.map((dep: any) => (
                    <div key={dep.id} className="list-card" style={{ position: 'relative' }}>
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
              <button className="btn-primary" onClick={() => {
                setEditingCecosId(null);
                setNewCecosId(''); setNewCecosName(''); setNewCecosDesc('');
                setShowCecosModal(true);
              }}>
                <Plus size={18} /> Nuevo CECOS
              </button>
            </div>
            
            {loadingCecos ? (
              <div className="loading-spinner">Cargando...</div>
            ) : (
              <div className="list-grid">
                {cecosList?.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <Briefcase size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                    <p>No hay CECOS registrados. ¡Crea el primero arriba!</p>
                  </div>
                ) : cecosList?.map((c: any) => (
                  <div key={c.id} className="list-card" style={{ position: 'relative' }}>
                    <button 
                      onClick={() => handleEditCecos(c)}
                      style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px' }}
                      title="Editar CECOS"
                    >
                      ✏️
                    </button>
                    <h4>{c.name}</h4>
                    <p className="list-id">ID: {c.id}</p>
                    <p className="list-desc">{c.description || 'Sin descripción'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

          {/* RENDER INDIVIDUAL CUSTOM LIST TABS - INSIDE settings-content */}
          {customLists?.filter((list: any) => activeTab2 === 'custom-list-' + list.id).map((list: any) => (
            <div key={list.id} className="slide-in">
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', paddingBottom: '20px', borderBottom: '1px solid var(--border-glass)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, var(--ikusi-green), #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(16,185,129,0.35)', flexShrink: 0 }}>
                    <Database size={22} color="white" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--text-main)' }}>{list.name}</h2>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {list.targetEntity === 'Collaborator' && <><span style={{ color: 'var(--ikusi-green)' }}>●</span> Vinculado a Colaboradores</>}
                      {list.targetEntity === 'Asset' && <><span style={{ color: 'var(--ikusi-green)' }}>●</span> Vinculado a Activos / Equipos</>}
                      {list.targetEntity === 'None' && <><span style={{ color: 'var(--text-muted)' }}>●</span> Catálogo de uso general</>}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
                  <button className="btn-secondary" onClick={() => handleEditCustomList(list)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px', fontSize: '14px' }}>
                    <Edit size={15} /> Editar módulo
                  </button>
                  {!list.isSystem && (
                    <button
                      className="btn-secondary"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px', fontSize: '14px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
                      onClick={() => {
                        confirm({
                          title: 'Eliminar Módulo',
                          message: `¿Estás seguro de eliminar el módulo "${list.name}" permanentemente? Esta acción no se puede deshacer.`,
                          type: 'danger',
                          onConfirm: async () => {
                            try {
                              await axios.delete(`${API_URL}/api/master-data/custom-lists/${list.id}`);
                              queryClient.invalidateQueries({ queryKey: ['custom-lists'] });
                              setActiveTab2('categories');
                              setSuccessMsg('Módulo eliminado correctamente.');
                              setTimeout(() => setSuccessMsg(''), 5000);
                            } catch (e) { alert('Error al eliminar el módulo'); }
                          }
                        });
                      }}
                    >
                      <Trash2 size={15} /> Eliminar
                    </button>
                  )}
                </div>
              </div>

              {/* Add/Edit form */}
              <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 18px', fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Plus size={16} color="var(--ikusi-green)" />
                  {editingItemId ? 'Editar opción seleccionada' : 'Agregar nueva opción al catálogo'}
                </h3>
                <form
                  onSubmit={(e) => { e.preventDefault(); setSelectedListForItems(list); setTimeout(() => itemMutation.mutate(), 100); }}
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '14px', alignItems: 'flex-end' }}
                >
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Valor / Nombre <span className="text-danger">*</span></label>
                    <input type="text" className="glass-input" required value={newItemValue} onChange={(e) => setNewItemValue(e.target.value)} placeholder="Ej: Medellín, Lenovo, Piso 3..." />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Descripción <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '12px' }}>(Opcional)</span></label>
                    <input type="text" className="glass-input" value={newItemDesc} onChange={(e) => setNewItemDesc(e.target.value)} placeholder="Descripción breve..." />
                  </div>
                  <button type="submit" className="btn-primary" disabled={itemMutation.isPending} style={{ alignSelf: 'flex-end', whiteSpace: 'nowrap', height: '42px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {itemMutation.isPending ? '...' : editingItemId ? '✓ Actualizar' : <><Plus size={15} /> Agregar</>}
                  </button>
                  {editingItemId && (
                    <button type="button" className="btn-secondary" style={{ alignSelf: 'flex-end', height: '42px' }} onClick={() => { setEditingItemId(null); setNewItemValue(''); setNewItemDesc(''); }}>
                      Cancelar
                    </button>
                  )}
                </form>
              </div>

              {/* Items table */}
              {list.items?.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border-glass)', borderRadius: '16px', color: 'var(--text-muted)' }}>
                  <Database size={48} style={{ opacity: 0.15, marginBottom: '16px' }} />
                  <p style={{ margin: 0, fontSize: '15px', fontWeight: 500 }}>Este catálogo aún no tiene opciones.</p>
                  <p style={{ margin: '6px 0 0', fontSize: '13px' }}>Usa el formulario de arriba para agregar la primera opción.</p>
                </div>
              ) : (
                <table className="glass-table">
                  <thead>
                    <tr>
                      <th>Valor</th>
                      <th>Descripción</th>
                      <th style={{ width: '100px' }}>Estado</th>
                      <th style={{ width: '100px', textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.items?.map((item: any) => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 600 }}>{item.value}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{item.description || <span style={{ opacity: 0.35 }}>—</span>}</td>
                        <td><span className={`status-badge ${item.isActive ? 'status-active' : 'status-inactive'}`}>{item.isActive ? 'Activo' : 'Inactivo'}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button className="icon-btn" title="Editar" onClick={() => handleEditItem(item)} style={{ color: 'var(--ikusi-green)' }}><Edit size={15} /></button>
                            <button className="icon-btn text-danger" title="Eliminar" onClick={() => {
                              confirm({ title: 'Eliminar Opción', message: `¿Eliminar la opción "${item.value}"?`, type: 'danger', onConfirm: async () => {
                                try {
                                  await axios.delete(`${API_URL}/api/master-data/custom-lists/${list.id}/items/${item.id}`);
                                  queryClient.invalidateQueries({ queryKey: ['custom-lists'] });
                                } catch (e) { alert('Error al eliminar'); }
                              }});
                            }}><Trash2 size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}

        </div>
      
      {showCatModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px' }}>
          <div className="glass-panel" style={{ position: 'relative', width: '100%', maxWidth: '900px', margin: 0, padding: '30px', maxHeight: '90vh', overflowY: 'auto' }}>
            <button
              onClick={() => setShowCatModal(false)}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '5px', fontSize: '18px' }}
            >
              ✕
            </button>
            <h3 style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--text-main)', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px', fontSize: '22px', marginTop: 0 }}>
              {editingCatId ? 'Editar Categoría' : 'Nueva Categoría'}
            </h3>
            <form onSubmit={handleCreateCategory} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px dashed var(--border-glass)' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Nombre (Ej: Laptop, Teléfono Móvil)</label>
                    <input required className="glass-input" value={newCatName} onChange={e => setNewCatName(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input 
                      type="checkbox" 
                      id="requiresPlaca"
                      checked={newCatRequiresPlaca} 
                      onChange={e => setNewCatRequiresPlaca(e.target.checked)} 
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <label htmlFor="requiresPlaca" style={{ marginBottom: 0, cursor: 'pointer' }}>
                      ¿Los activos de esta categoría llevan Placa Ikusi? <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>(Desmarcar para Periféricos / ID Autoincremental)</span>
                    </label>
                  </div>
                </div>
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--accent-blue)', borderRadius: '8px', padding: '12px 16px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ color: 'var(--accent-blue)' }}><AlertCircle size={20} /></div>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <strong>Nota:</strong> Los valores por defecto del sistema (Número de Serie, Garantía, Valor de Compra y Depreciación) ahora son <strong>opcionales</strong> para todos los activos. Solo necesitas definir aquí los campos específicos obligatorios de esta categoría.
                  </p>
                </div>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <label style={{ margin: 0, fontSize: '16px', color: 'var(--text-main)' }}>Estructura de Campos Dinámicos</label>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {fields.map((field, idx) => (
                      <div key={idx} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '0', position: 'relative', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
                        
                        {/* Header de la Tarjeta */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
                          <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Tag size={16} color="var(--ikusi-green)" />
                            {field.name ? `Campo: ${field.name}` : 'Nuevo Campo Dinámico'}
                          </h4>
                          
                          <button 
                            type="button" 
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, padding: '4px 8px', borderRadius: '4px' }} 
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                            title="Eliminar este campo por completo"
                            onClick={() => {
                              if (window.confirm('¿Seguro que deseas eliminar este campo?')) {
                                const newF = fields.filter((_, i) => i !== idx);
                                setFields(newF);
                              }
                            }}
                          >
                            <Trash2 size={16} /> Eliminar
                          </button>
                        </div>

                        {/* Cuerpo de la Tarjeta */}
                        <div style={{ padding: '24px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: field.type === 'select' ? '20px' : '0' }}>
                            <div>
                              <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Nombre del Campo</label>
                              <input 
                                className="glass-input" 
                                placeholder="Ej. procesador, resolucion"
                                value={field.name}
                                onChange={(e) => {
                                  const newF = [...fields];
                                  newF[idx].name = e.target.value;
                                  setFields(newF);
                                }}
                              />
                            </div>
                            
                            <div>
                              <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Obligatoriedad</label>
                              <select 
                                className="glass-input" 
                                value={field.isRequired ? 'req' : 'opt'}
                                onChange={(e) => {
                                  const newF = [...fields];
                                  newF[idx].isRequired = e.target.value === 'req';
                                  setFields(newF);
                                }}
                              >
                                <option value="req">Obligatorio</option>
                                <option value="opt">Opcional</option>
                              </select>
                            </div>
                            
                            <div>
                              <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Tipo de Dato</label>
                              <select 
                                className="glass-input" 
                                value={field.type || 'text'}
                                onChange={(e) => {
                                  const newF = [...fields];
                                  newF[idx].type = e.target.value;
                                  setFields(newF);
                                }}
                              >
                                <option value="text">Texto Libre</option>
                                <option value="select">Lista de Opciones</option>
                              </select>
                            </div>
                            
                            <div>
                              <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Unidad de Medida (Opcional)</label>
                              <input 
                                className="glass-input" 
                                placeholder="Ej. GB, MHz"
                                value={field.unit || ''}
                                onChange={(e) => {
                                  const newF = [...fields];
                                  newF[idx].unit = e.target.value;
                                  setFields(newF);
                                }}
                              />
                            </div>
                          </div>

                          {field.type === 'select' && (
                            <div style={{ background: '#f1f5f9', padding: '20px', borderRadius: '8px', border: '1px dashed var(--border-strong)' }}>
                              <label style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: 600, marginBottom: '12px', display: 'block' }}>
                                Opciones Disponibles
                              </label>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <input 
                                  className="glass-input" 
                                  placeholder="Escribe una opción y presiona la tecla Enter..."
                                  value={field.newOptionValue || ''}
                                  onChange={(e) => {
                                    const newF = [...fields];
                                    newF[idx].newOptionValue = e.target.value;
                                    setFields(newF);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      if (field.newOptionValue?.trim()) {
                                        const newF = [...fields];
                                        newF[idx].options = [...(Array.isArray(newF[idx].options) ? newF[idx].options : []), newF[idx].newOptionValue.trim()];
                                        newF[idx].newOptionValue = '';
                                        setFields(newF);
                                      }
                                    }
                                  }}
                                />
                              </div>
                              
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '16px' }}>
                                {Array.isArray(field.options) && field.options.length === 0 && (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    ⚠️ Escribe arriba y presiona Enter para agregar la primera opción.
                                  </span>
                                )}
                                {Array.isArray(field.options) && field.options.map((opt: string, optIdx: number) => (
                                  <span key={optIdx} className="badge badge-category" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--ikusi-green-light)', border: '1px solid var(--ikusi-green)', padding: '8px 14px', fontSize: '14px', color: 'var(--ikusi-green-hover)' }}>
                                    {opt}
                                    <button type="button" style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '0', fontWeight: 'bold', fontSize: '16px', display: 'flex', alignItems: 'center' }} title="Eliminar opción" onClick={() => {
                                      const newF = [...fields];
                                      newF[idx].options.splice(optIdx, 1);
                                      setFields(newF);
                                    }}>✕</button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button 
                    type="button" 
                    className="btn-glass" 
                    onClick={() => setFields([...fields, {name: '', isRequired: true, type: 'text', options: [], unit: '', newOptionValue: ''}])}
                    style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '16px', borderStyle: 'dashed', borderWidth: '2px', color: 'var(--ikusi-green)', borderColor: 'var(--ikusi-green-glow)', background: 'var(--ikusi-green-light)', fontWeight: 600 }}
                  >
                    + Agregar Nuevo Campo a la Categoría
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="btn-primary" disabled={catMutation.isPending || updateCatMutation.isPending}>
                    <Plus size={16} /> {editingCatId ? 'Guardar Cambios' : 'Crear Categoría'}
                  </button>
                  {editingCatId && (
                    <button type="button" className="btn-secondary" style={{ padding: '10px 16px', background: 'transparent', border: '1px solid var(--border-glass)', color: 'white', cursor: 'pointer' }} onClick={() => { setEditingCatId(null); setNewCatName(''); setFields([{name: '', isRequired: true, type: 'text', options: []} as any]); setShowCatModal(false); }}>
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
          </div>
        </div>
      )}

      {showDepModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px' }}>
          <div className="glass-panel" style={{ position: 'relative', width: '100%', maxWidth: '600px', margin: 0, padding: '30px', maxHeight: '90vh', overflowY: 'auto' }}>
            <button
              onClick={() => setShowDepModal(false)}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '5px', fontSize: '18px' }}
            >
              ✕
            </button>
            <h3 style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--text-main)', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px', fontSize: '22px', marginTop: 0 }}>
              {editingDepId ? 'Editar Departamento' : 'Nuevo Departamento'}
            </h3>
            <form onSubmit={handleCreateDepartment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px dashed var(--border-glass)' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Nombre del Departamento</label>
                    <input required className="glass-input" value={newDepName} onChange={e => setNewDepName(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                    <label>Descripción</label>
                    <input className="glass-input" value={newDepDesc} onChange={e => setNewDepDesc(e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="btn-primary" disabled={depMutation.isPending || updateDepMutation.isPending}>
                    <Plus size={16} /> {editingDepId ? 'Guardar Cambios' : 'Crear Departamento'}
                  </button>
                  {editingDepId && (
                    <button type="button" className="btn-secondary" style={{ padding: '10px 16px', background: 'transparent', border: '1px solid var(--border-glass)', color: 'white', cursor: 'pointer' }} onClick={() => { setEditingDepId(null); setNewDepName(''); setNewDepDesc(''); setShowDepModal(false); }}>
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
          </div>
        </div>
      )}

      {showCecosModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px' }}>
          <div className="glass-panel" style={{ position: 'relative', width: '100%', maxWidth: '600px', margin: 0, padding: '30px', maxHeight: '90vh', overflowY: 'auto' }}>
            <button
              onClick={() => setShowCecosModal(false)}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '5px', fontSize: '18px' }}
            >
              ✕
            </button>
            <h3 style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--text-main)', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px', fontSize: '22px', marginTop: 0 }}>
              {editingCecosId ? 'Editar CECOS' : 'Nuevo CECOS'}
            </h3>
            <form onSubmit={e => {
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
            }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px dashed var(--border-glass)' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Código del CECOS (Ej: TI-001)</label>
                    <input required className="glass-input" disabled={!!editingCecosId} value={newCecosId} onChange={e => setNewCecosId(e.target.value.toUpperCase())} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Nombre del CECOS</label>
                    <input required className="glass-input" value={newCecosName} onChange={e => setNewCecosName(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                    <label>Descripción</label>
                    <input className="glass-input" value={newCecosDesc} onChange={e => setNewCecosDesc(e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="btn-primary" disabled={cecosMutation.isPending || updateCecosMutation.isPending}>
                    <Plus size={16} /> {editingCecosId ? 'Guardar Cambios' : 'Crear CECOS'}
                  </button>
                  {editingCecosId && (
                    <button type="button" className="btn-secondary" style={{ padding: '10px 16px', background: 'transparent', border: '1px solid var(--border-glass)', color: 'white', cursor: 'pointer' }} onClick={() => { setEditingCecosId(null); setNewCecosId(''); setNewCecosName(''); setNewCecosDesc(''); setShowCecosModal(false); }}>
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
          </div>
        </div>
      )}


      {/* CUSTOM LIST MODAL - REDESIGNED */}
      {showCustomListModal && (
        <div className="modal-overlay slide-in">
          <div className="modal-content glass-panel" style={{ maxWidth: '540px' }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', paddingBottom: '20px', borderBottom: '1px solid var(--border-glass)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--ikusi-green), #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(16,185,129,0.3)', flexShrink: 0 }}>
                  <Database size={20} color="white" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-main)' }}>
                    {editingCustomListId ? 'Editar Módulo' : 'Nuevo Catálogo Dinámico'}
                  </h2>
                  <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>Configura un catálogo reutilizable en el sistema</p>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setShowCustomListModal(false)} style={{ flexShrink: 0, marginTop: '2px' }}><X size={20} /></button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); editingCustomListId ? updateCustomListMutation.mutate() : customListMutation.mutate(); }} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', display: 'block', color: 'var(--text-secondary)' }}>Nombre del catálogo <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="glass-input"
                  required
                  value={newCustomListName}
                  onChange={(e) => setNewCustomListName(e.target.value)}
                  placeholder="Ej: Sedes, Ubicaciones, Tipos de Contrato..."
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', display: 'block', color: 'var(--text-secondary)' }}>Vincular a formulario</label>
                <select className="glass-input" value={newCustomListTarget} onChange={(e) => setNewCustomListTarget(e.target.value as any)}>
                  <option value="None">🔘 Ninguno — Uso general</option>
                  <option value="Collaborator">👤 Colaboradores / Usuarios</option>
                  <option value="Asset">🖥️ Activos / Equipos</option>
                </select>
                <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  {newCustomListTarget === 'Collaborator' && 'Este campo aparecerá automáticamente en el formulario de Colaboradores.'}
                  {newCustomListTarget === 'Asset' && 'Este campo aparecerá automáticamente en el formulario de Activos.'}
                  {newCustomListTarget === 'None' && 'El catálogo estará disponible pero no se inyectará en ningún formulario.'}
                </p>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', display: 'block', color: 'var(--text-secondary)' }}>Descripción <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Opcional)</span></label>
                <textarea
                  className="glass-input"
                  value={newCustomListDesc}
                  onChange={(e) => setNewCustomListDesc(e.target.value)}
                  rows={3}
                  placeholder="Describe para qué se usará este catálogo..."
                  style={{ resize: 'vertical', minHeight: '80px' }}
                ></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px', paddingTop: '20px', borderTop: '1px solid var(--border-glass)' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowCustomListModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={customListMutation.isPending || updateCustomListMutation.isPending} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {customListMutation.isPending || updateCustomListMutation.isPending ? 'Guardando...' : <><Database size={15} /> {editingCustomListId ? 'Guardar cambios' : 'Crear catálogo'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}

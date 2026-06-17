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
  const [activeTab2, setActiveTab2] = useState('categories');
  

  

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
                              setDeleteFieldIdx(idx);
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


            </div>

      {/* MODAL ELIMINAR CAMPO */}
      {deleteFieldIdx !== null && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px' }}>
          <div className="glass-panel" style={{ padding: '30px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
            <Trash2 size={48} color="#ef4444" style={{ marginBottom: '20px' }} />
            <h3 style={{ color: 'var(--text-main)', marginBottom: '15px' }}>Eliminar campo</h3>
            <p style={{ margin: '0 0 24px 0', color: 'var(--text-muted)' }}>
              ¿Estás seguro de que deseas eliminar el campo <b>"{fields[deleteFieldIdx]?.name || `Campo ${deleteFieldIdx + 1}`}"</b>? Esta acción removerá el campo de la configuración de la categoría.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                className="btn-glass" 
                onClick={() => setDeleteFieldIdx(null)}
                style={{ padding: '10px 20px' }}
              >
                Cancelar
              </button>
              <button 
                className="btn-primary" 
                style={{ background: '#ef4444', borderColor: '#ef4444', padding: '10px 20px' }}
                onClick={() => {
                  const newF = fields.filter((_, i) => i !== deleteFieldIdx);
                  setFields(newF);
                  setDeleteFieldIdx(null);
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Plus, UserCog, Edit, Trash2, X, KeyRound, ShieldCheck, Power } from 'lucide-react';
import { useAuth, usePermission, Role } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import { API_URL } from '../config';
import { isPasswordValid } from '../utils/passwordPolicy';
import PasswordChecklist from '../components/PasswordChecklist';
import './Users.css';

interface UserRow {
    id: string;
    username: string;
    fullName: string;
    email: string;
    role: Role;
    isActive: boolean;
}

interface SystemModule {
    id: string;
    key: string;
    name: string;
    displayOrder: number;
    supportsCreate: boolean;
    supportsEdit: boolean;
    supportsDelete: boolean;
}

interface PermissionRow {
    moduleKey: string;
    canRead: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
}

type MatrixState = Record<string, { canRead: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }>;

const ROLE_LABELS: Record<string, string> = {
    SUPER_ADMIN: 'Super Administrador',
    ADMINISTRADOR: 'Administrador',
    ESTANDAR: 'Auditor',
};

const FLAG_LABELS: Record<'canRead' | 'canCreate' | 'canEdit' | 'canDelete', string> = {
    canRead: 'Lectura',
    canCreate: 'Crear',
    canEdit: 'Editar',
    canDelete: 'Eliminar',
};

const emptyMatrix = (modules: SystemModule[]): MatrixState => {
    const matrix: MatrixState = {};
    for (const m of modules) {
        matrix[m.key] = { canRead: false, canCreate: false, canEdit: false, canDelete: false };
    }
    return matrix;
};

export default function Users() {
    const queryClient = useQueryClient();
    const { confirm } = useConfirm();
    const toast = useToast();
    const { user: currentUser } = useAuth();
    const perms = usePermission('users');
    const isSuperAdmin = currentUser?.role === Role.SUPER_ADMIN;

    // Modal crear/editar
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<UserRow | null>(null);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<Role>(Role.ESTANDAR);
    const [matrix, setMatrix] = useState<MatrixState>({});

    // Modal restablecer contraseña
    const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
    const [newPassword, setNewPassword] = useState('');

    const onApiError = (err: any) => toast.error(err.response?.data?.error || err.message, 5000);

    const { data: users = [], isLoading } = useQuery<UserRow[]>({
        queryKey: ['users'],
        queryFn: async () => (await axios.get(`${API_URL}/api/users`)).data,
    });

    const { data: modules = [] } = useQuery<SystemModule[]>({
        queryKey: ['system-modules'],
        queryFn: async () => (await axios.get(`${API_URL}/api/users/modules`)).data,
    });

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] });

    const createMutation = useMutation({
        mutationFn: async () => {
            const permissions = toPermissionPayload(matrix);
            return axios.post(`${API_URL}/api/users`, { username, password, fullName, email, role, permissions });
        },
        onSuccess: () => { toast.success('Usuario creado con éxito'); closeModal(); invalidate(); },
        onError: onApiError,
    });

    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!editingUser) return;
            await axios.put(`${API_URL}/api/users/${editingUser.id}`, { fullName, email, role });
            if (editingUser.role !== Role.SUPER_ADMIN) {
                await axios.put(`${API_URL}/api/users/${editingUser.id}/permissions`, {
                    permissions: toPermissionPayload(matrix)
                });
            }
        },
        onSuccess: () => { toast.success('Usuario actualizado con éxito'); closeModal(); invalidate(); },
        onError: onApiError,
    });

    const statusMutation = useMutation({
        mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
            axios.patch(`${API_URL}/api/users/${id}/status`, { isActive }),
        onSuccess: (_d, vars) => {
            toast.success(vars.isActive ? 'Usuario reactivado' : 'Usuario desactivado');
            invalidate();
        },
        onError: onApiError,
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => axios.delete(`${API_URL}/api/users/${id}`),
        onSuccess: () => { toast.success('Usuario eliminado'); invalidate(); },
        onError: onApiError,
    });

    const resetMutation = useMutation({
        mutationFn: async () => {
            if (!resetTarget) return;
            return axios.post(`${API_URL}/api/users/${resetTarget.id}/reset-password`, { newPassword });
        },
        onSuccess: () => {
            toast.success(`Contraseña de ${resetTarget?.username} restablecida`);
            setResetTarget(null); setNewPassword('');
        },
        onError: onApiError,
    });

    const toPermissionPayload = (m: MatrixState): PermissionRow[] =>
        Object.entries(m).map(([moduleKey, flags]) => ({ moduleKey, ...flags }));

    const openCreate = () => {
        setEditingUser(null);
        setFullName(''); setEmail(''); setUsername(''); setPassword('');
        setRole(Role.ESTANDAR);
        setMatrix(emptyMatrix(modules));
        setShowModal(true);
    };

    const openEdit = async (u: UserRow) => {
        setEditingUser(u);
        setFullName(u.fullName); setEmail(u.email); setUsername(u.username); setPassword('');
        setRole(u.role);
        const base = emptyMatrix(modules);
        if (u.role !== Role.SUPER_ADMIN) {
            try {
                const { data } = await axios.get<PermissionRow[]>(`${API_URL}/api/users/${u.id}/permissions`);
                for (const p of data) {
                    if (base[p.moduleKey]) {
                        base[p.moduleKey] = { canRead: p.canRead, canCreate: p.canCreate, canEdit: p.canEdit, canDelete: p.canDelete };
                    }
                }
            } catch (err: any) {
                onApiError(err);
            }
        }
        setMatrix(base);
        setShowModal(true);
    };

    const closeModal = () => { setShowModal(false); setEditingUser(null); };

    const togglePermission = (moduleKey: string, flag: keyof MatrixState[string]) => {
        setMatrix(prev => {
            const current = { ...prev[moduleKey], [flag]: !prev[moduleKey][flag] };
            // Regla acumulativa: cualquier permiso de escritura implica lectura
            if (current.canCreate || current.canEdit || current.canDelete) current.canRead = true;
            return { ...prev, [moduleKey]: current };
        });
    };

    // El rol Auditor es de solo consulta: al seleccionarlo se limpian los
    // permisos de escritura y sus casillas quedan deshabilitadas.
    const handleRoleChange = (newRole: Role) => {
        setRole(newRole);
        if (newRole === Role.ESTANDAR) {
            setMatrix(prev => {
                const cleaned: MatrixState = {};
                for (const [key, flags] of Object.entries(prev)) {
                    cleaned[key] = { canRead: flags.canRead, canCreate: false, canEdit: false, canDelete: false };
                }
                return cleaned;
            });
        }
    };

    /** Una casilla se deshabilita si el rol Auditor no admite escritura o el módulo no ofrece esa acción. */
    const isFlagDisabled = (m: SystemModule, flag: keyof MatrixState[string]): boolean => {
        if (flag === 'canRead') return false;
        if (role === Role.ESTANDAR) return true;
        if (flag === 'canCreate') return !m.supportsCreate;
        if (flag === 'canEdit') return !m.supportsEdit;
        return !m.supportsDelete;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingUser) {
            updateMutation.mutate();
            return;
        }
        if (!isPasswordValid(password)) {
            toast.error('La contraseña no cumple con los requisitos mínimos de seguridad.');
            return;
        }
        createMutation.mutate();
    };

    const handleDelete = (u: UserRow) => {
        confirm({
            title: 'Eliminar usuario',
            message: `¿Eliminar definitivamente a "${u.fullName}" (${u.username})? Esta acción no se puede deshacer.`,
            type: 'danger',
            confirmText: 'Eliminar',
            onConfirm: () => deleteMutation.mutate(u.id),
        });
    };

    const handleToggleStatus = (u: UserRow) => {
        confirm({
            title: u.isActive ? 'Desactivar usuario' : 'Reactivar usuario',
            message: u.isActive
                ? `"${u.username}" no podrá iniciar sesión y sus sesiones activas quedarán bloqueadas.`
                : `"${u.username}" podrá volver a iniciar sesión.`,
            type: u.isActive ? 'warning' : 'info',
            confirmText: u.isActive ? 'Desactivar' : 'Reactivar',
            onConfirm: () => statusMutation.mutate({ id: u.id, isActive: !u.isActive }),
        });
    };

    const isTargetSuperAdmin = (u: UserRow) => u.role === Role.SUPER_ADMIN;
    const saving = createMutation.isPending || updateMutation.isPending;

    return (
        <div className="users-page">
            <header className="page-header">
                <div>
                    <h1><UserCog size={28} style={{ verticalAlign: 'text-bottom', marginRight: '10px' }} />Usuarios</h1>
                    <p className="page-subtitle">Administración de usuarios, roles y permisos del sistema</p>
                </div>
                {perms.create && (
                    <button className="btn-primary" onClick={openCreate}>
                        <Plus size={18} /> Nuevo usuario
                    </button>
                )}
            </header>

            <div className="glass-panel" style={{ padding: 0 }}>
                <div className="table-responsive">
                    <table className="glass-table users-table">
                        <thead>
                            <tr>
                                <th>Nombre completo</th>
                                <th>Correo</th>
                                <th>Usuario</th>
                                <th>Rol</th>
                                <th>Estado</th>
                                <th style={{ textAlign: 'right' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading && (
                                <tr><td colSpan={6}>Cargando usuarios...</td></tr>
                            )}
                            {!isLoading && users.map(u => (
                                <tr key={u.id} className={u.isActive ? '' : 'user-inactive'}>
                                    <td>
                                        {u.fullName}
                                        {isTargetSuperAdmin(u) && (
                                            <span className="badge-superadmin" title="Control total del sistema">
                                                <ShieldCheck size={13} /> Super Admin
                                            </span>
                                        )}
                                    </td>
                                    <td>{u.email}</td>
                                    <td>{u.username}</td>
                                    <td>{ROLE_LABELS[u.role] || u.role}</td>
                                    <td>
                                        <span className={`status-pill ${u.isActive ? 'active' : 'inactive'}`}>
                                            {u.isActive ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="users-actions">
                                            {perms.edit && (!isTargetSuperAdmin(u) || isSuperAdmin) && u.id !== currentUser?.id && (
                                                <button className="btn-icon" title="Editar" onClick={() => openEdit(u)}>
                                                    <Edit size={17} />
                                                </button>
                                            )}
                                            {perms.edit && (!isTargetSuperAdmin(u) || isSuperAdmin) && (
                                                <button className="btn-icon" title="Restablecer contraseña"
                                                    onClick={() => { setResetTarget(u); setNewPassword(''); }}>
                                                    <KeyRound size={17} />
                                                </button>
                                            )}
                                            {perms.edit && !isTargetSuperAdmin(u) && u.id !== currentUser?.id && (
                                                <button className="btn-icon" title={u.isActive ? 'Desactivar' : 'Reactivar'}
                                                    onClick={() => handleToggleStatus(u)}>
                                                    <Power size={17} />
                                                </button>
                                            )}
                                            {perms.delete && !isTargetSuperAdmin(u) && u.id !== currentUser?.id && (
                                                <button className="btn-icon danger" title="Eliminar" onClick={() => handleDelete(u)}>
                                                    <Trash2 size={17} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal crear / editar */}
            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content glass-panel users-modal" onClick={e => e.stopPropagation()}>
                        <div className="users-modal-header">
                            <h3>{editingUser ? `Editar usuario: ${editingUser.username}` : 'Nuevo usuario'}</h3>
                            <button className="btn-icon" aria-label="Cerrar" onClick={closeModal}><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="users-form-grid">
                                <div className="form-group">
                                    <label>Nombre completo *</label>
                                    <input className="glass-input" value={fullName} onChange={e => setFullName(e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label>Correo electrónico *</label>
                                    <input type="email" className="glass-input" value={email} onChange={e => setEmail(e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label>Usuario de inicio de sesión *</label>
                                    <input className="glass-input" value={username} onChange={e => setUsername(e.target.value)}
                                        required disabled={!!editingUser} />
                                </div>
                                {!editingUser && (
                                    <div className="form-group">
                                        <label>Contraseña *</label>
                                        <input type="password" className="glass-input" value={password}
                                            onChange={e => setPassword(e.target.value)} required />
                                        <PasswordChecklist password={password} />
                                    </div>
                                )}
                                <div className="form-group">
                                    <label>Rol *</label>
                                    {editingUser && editingUser.role === Role.SUPER_ADMIN ? (
                                        <input className="glass-input" value="Super Administrador" disabled />
                                    ) : editingUser && editingUser.role === Role.ADMINISTRADOR && !isSuperAdmin ? (
                                        /* Solo el Super Admin puede cambiar el rol de un Administrador */
                                        <input className="glass-input" value="Administrador" disabled />
                                    ) : (
                                        <select className="glass-input" value={role} onChange={e => handleRoleChange(e.target.value as Role)}>
                                            <option value={Role.ESTANDAR}>Auditor</option>
                                            {isSuperAdmin && <option value={Role.ADMINISTRADOR}>Administrador</option>}
                                        </select>
                                    )}
                                </div>
                            </div>

                            {(!editingUser || editingUser.role !== Role.SUPER_ADMIN) && (
                                <div className="permissions-section">
                                    <h4>Permisos por módulo</h4>
                                    <p className="field-hint">
                                        Sin casillas marcadas = sin acceso (el módulo no aparece en el menú).
                                        Crear, Editar o Eliminar activan Lectura automáticamente.
                                        {role === Role.ESTANDAR
                                            ? ' El rol Auditor es de solo consulta: únicamente puede otorgarse Lectura.'
                                            : ' Las casillas deshabilitadas indican acciones que ese módulo no ofrece.'}
                                        {' '}Nota: Mantenimientos y Dashboard usan datos de Equipos y Colaboradores;
                                        otorga Lectura en esos módulos para que sus pantallas carguen completas.
                                    </p>
                                    <div className="table-responsive" style={{ minHeight: 'unset' }}>
                                        <table className="permissions-table">
                                            <thead>
                                                <tr>
                                                    <th>Módulo</th>
                                                    <th>Lectura</th>
                                                    <th>Crear</th>
                                                    <th>Editar</th>
                                                    <th>Eliminar</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {modules.map(m => (
                                                    <tr key={m.key}>
                                                        <td>{m.name}</td>
                                                        {(['canRead', 'canCreate', 'canEdit', 'canDelete'] as const).map(flag => {
                                                            const disabled = isFlagDisabled(m, flag);
                                                            const flagLabel = FLAG_LABELS[flag];
                                                            const checkboxId = `perm-${m.key}-${flag}`;
                                                            return (
                                                                <td key={flag}>
                                                                    <label htmlFor={checkboxId} className="sr-only">{`${m.name} - ${flagLabel}`}</label>
                                                                    <input
                                                                        id={checkboxId}
                                                                        type="checkbox"
                                                                        checked={matrix[m.key]?.[flag] || false}
                                                                        disabled={disabled}
                                                                        title={disabled ? (role === Role.ESTANDAR ? 'El rol Auditor es de solo consulta' : 'Este módulo no ofrece esta acción') : undefined}
                                                                        onChange={() => togglePermission(m.key, flag)}
                                                                    />
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            <div className="users-modal-footer">
                                <button type="button" className="btn-secondary" onClick={closeModal}>Cancelar</button>
                                <button type="submit" className="btn-primary" disabled={saving}>
                                    {saving ? 'Guardando...' : (editingUser ? 'Guardar cambios' : 'Crear usuario')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal restablecer contraseña */}
            {resetTarget && (
                <div className="modal-overlay" onClick={() => setResetTarget(null)}>
                    <div className="modal-content glass-panel" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
                        <div className="users-modal-header">
                            <h3>Restablecer contraseña</h3>
                            <button className="btn-icon" aria-label="Cerrar" onClick={() => setResetTarget(null)}><X size={20} /></button>
                        </div>
                        <p style={{ marginTop: 0 }}>
                            Nueva contraseña para <strong>{resetTarget.fullName}</strong> ({resetTarget.username}).
                            Comunícasela al usuario por un medio seguro.
                        </p>
                        <form onSubmit={e => {
                            e.preventDefault();
                            if (!isPasswordValid(newPassword)) {
                                toast.error('La contraseña no cumple con los requisitos mínimos de seguridad.');
                                return;
                            }
                            resetMutation.mutate();
                        }}>
                            <div className="form-group">
                                <label>Nueva contraseña *</label>
                                <input type="password" className="glass-input" value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)} required autoFocus />
                                <PasswordChecklist password={newPassword} />
                            </div>
                            <div className="users-modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setResetTarget(null)}>Cancelar</button>
                                <button type="submit" className="btn-primary" disabled={resetMutation.isPending || !isPasswordValid(newPassword)}>
                                    {resetMutation.isPending ? 'Guardando...' : 'Restablecer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

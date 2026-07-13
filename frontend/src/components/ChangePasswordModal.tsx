import { useState } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';
import { API_URL } from '../config';
import { isPasswordValid } from '../utils/passwordPolicy';
import PasswordChecklist from './PasswordChecklist';

interface Props {
    onClose: () => void;
}

/** Cambio de contraseña del usuario autenticado (exige la contraseña actual). */
export default function ChangePasswordModal({ onClose }: Props) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!isPasswordValid(newPassword)) {
            setError('La nueva contraseña no cumple con los requisitos mínimos de seguridad.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('La nueva contraseña y su confirmación no coinciden.');
            return;
        }

        setSaving(true);
        try {
            await axios.post(`${API_URL}/api/auth/change-password`, { currentPassword, newPassword });
            setSuccess(true);
            setTimeout(onClose, 1500);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al cambiar la contraseña.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass-panel" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0 }}>Cambiar contraseña</h3>
                    <button className="btn-icon" aria-label="Cerrar" onClick={onClose}><X size={20} /></button>
                </div>

                {success ? (
                    <p style={{ color: 'var(--success, #4ade80)' }}>✅ Contraseña actualizada correctamente.</p>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {error && <div style={{ color: 'var(--danger, #f87171)', fontSize: '14px' }}>{error}</div>}
                        <div className="form-group">
                            <label>Contraseña actual</label>
                            <input type="password" className="glass-input" value={currentPassword}
                                onChange={e => setCurrentPassword(e.target.value)} required autoFocus />
                        </div>
                        <div className="form-group">
                            <label>Nueva contraseña</label>
                            <input type="password" className="glass-input" value={newPassword}
                                onChange={e => setNewPassword(e.target.value)} required />
                            <PasswordChecklist password={newPassword} />
                        </div>
                        <div className="form-group">
                            <label>Confirmar nueva contraseña</label>
                            <input type="password" className="glass-input" value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)} required />
                        </div>
                        <button type="submit" className="btn-primary" disabled={saving || !isPasswordValid(newPassword) || newPassword !== confirmPassword}>
                            {saving ? 'Guardando...' : 'Guardar contraseña'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

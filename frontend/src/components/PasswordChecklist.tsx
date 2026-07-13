import { getPasswordChecks } from '../utils/passwordPolicy';

interface Props {
    password: string;
}

/** Checklist en vivo de la política de contraseña, para validación en tiempo real en el cliente. */
export default function PasswordChecklist({ password }: Props) {
    const checks = getPasswordChecks(password);
    const items: { key: keyof typeof checks; label: string }[] = [
        { key: 'length', label: 'Mínimo 8 caracteres' },
        { key: 'upper', label: 'Una mayúscula' },
        { key: 'lower', label: 'Una minúscula' },
        { key: 'digit', label: 'Un número' },
    ];

    return (
        <ul style={{ listStyle: 'none', margin: '4px 0 0', padding: 0, display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
            {items.map(({ key, label }) => (
                <li key={key} style={{ fontSize: '12px', color: checks[key] ? 'var(--success, #22c55e)' : 'var(--text-muted)' }}>
                    {checks[key] ? '✓' : '○'} {label}
                </li>
            ))}
        </ul>
    );
}

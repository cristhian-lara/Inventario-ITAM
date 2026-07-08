/**
 * Política de contraseña segura del sistema:
 * mínimo 8 caracteres, al menos una mayúscula, una minúscula y un número.
 * Único punto de validación para crear, cambiar o restablecer contraseñas.
 */
export class PasswordPolicy {
    static readonly DESCRIPTION = 'La contraseña debe tener mínimo 8 caracteres e incluir mayúscula, minúscula y número.';

    static validate(password: string): { valid: boolean; error?: string } {
        if (typeof password !== 'string' || password.length < 8) {
            return { valid: false, error: PasswordPolicy.DESCRIPTION };
        }
        if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
            return { valid: false, error: PasswordPolicy.DESCRIPTION };
        }
        return { valid: true };
    }
}

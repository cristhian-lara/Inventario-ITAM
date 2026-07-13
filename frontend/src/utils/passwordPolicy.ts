/**
 * Espejo en el cliente de la política de contraseña del backend
 * (src/modules/auth/domain/PasswordPolicy.ts): mínimo 8 caracteres,
 * al menos una mayúscula, una minúscula y un número.
 */
export interface PasswordChecks {
    length: boolean;
    upper: boolean;
    lower: boolean;
    digit: boolean;
}

export const PASSWORD_HINT = 'Mínimo 8 caracteres, con mayúscula, minúscula y número.';

export function getPasswordChecks(password: string): PasswordChecks {
    return {
        length: password.length >= 8,
        upper: /[A-Z]/.test(password),
        lower: /[a-z]/.test(password),
        digit: /[0-9]/.test(password),
    };
}

export function isPasswordValid(password: string): boolean {
    const checks = getPasswordChecks(password);
    return checks.length && checks.upper && checks.lower && checks.digit;
}

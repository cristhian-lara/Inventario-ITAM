/**
 * Aviso estándar cuando la notificación de Webex de un proceso de firma
 * (asignación, devolución simple/múltiple o mantenimiento) no pudo enviarse.
 *
 * El backend responde 2xx con `notificationSent: false` porque el proceso sí
 * quedó registrado y el enlace de firma sigue vigente; aquí solo informamos
 * al administrador con un modal para que decida cómo proceder.
 *
 * @returns true si se mostró un modal (la notificación falló), false si todo salió bien.
 */
interface ConfirmFn {
  (options: {
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info' | 'success';
    hideCancel?: boolean;
  }): void;
}

export interface NotificationResponseFields {
  notificationSent?: boolean | null;
  accountNotFound?: boolean;
  notificationError?: string;
  message?: string;
}

export function showWebexFailureModal(confirm: ConfirmFn, data: NotificationResponseFields | undefined): boolean {
  // null/undefined = no aplicaba notificar (p. ej. mantenimiento sin colaborador en turno)
  if (!data || data.notificationSent !== false) return false;

  if (data.accountNotFound) {
    confirm({
      title: 'Cuenta de Webex no encontrada',
      message: data.message || 'La cuenta de Webex del colaborador no existe. El proceso quedó registrado y el enlace de firma sigue vigente: verifica el correo del colaborador y usa "Reenviar enlace".',
      type: 'warning',
      confirmText: 'Entendido',
      hideCancel: true,
      onConfirm: () => {}
    });
  } else {
    confirm({
      title: 'Notificación de Webex no enviada',
      message: data.message || 'No se pudo enviar la notificación (el colaborador puede no estar disponible o hay un problema de conexión). El enlace de firma sigue vigente: usa "Reenviar enlace" para intentarlo de nuevo.',
      type: 'warning',
      confirmText: 'Entendido',
      hideCancel: true,
      onConfirm: () => {}
    });
  }
  return true;
}

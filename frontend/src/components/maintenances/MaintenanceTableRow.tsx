import { Plus, Clock, Wrench, Bell, CheckCircle, Edit3, Mail } from 'lucide-react';
import ActionMenu from '../ActionMenu';

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Programado',
  IN_PROGRESS: 'En Progreso',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
};

interface Props {
  m: any;
  assets: any[] | undefined;
  isAdmin: boolean;
  canCreate: boolean;
  isLate: boolean;
  delayDays: number | null;
  getCollaboratorForAsset: (assetId: string) => string;
  onFilterByHostname: (hostname: string) => void;
  onOpenModal: (mode: 'create' | 'start' | 'complete' | 'view' | 'forceSign', record?: any, presetAsset?: { assetId: string; displayName: string }) => void;
  onNotify: (id: string, assetId: string) => void;
  onRequestSignature: (id: string) => void;
  notifyPending: boolean;
  requestSignaturePending: boolean;
  forceSignPending: boolean;
}

export default function MaintenanceTableRow({
  m,
  assets,
  isAdmin,
  canCreate,
  isLate,
  delayDays,
  getCollaboratorForAsset,
  onFilterByHostname,
  onOpenModal,
  onNotify,
  onRequestSignature,
  notifyPending,
  requestSignaturePending,
  forceSignPending
}: Props) {
  const asset = assets?.find(a => a.id === m?.assetId);
  const hostname = asset?.dynamicAttributes?.HOSTNAME || asset?.dynamicAttributes?.Hostname || asset?.dynamicAttributes?.hostname;

  return (
    <tr>
      <td style={{ fontWeight: 600 }}>
        <span
          style={{ cursor: 'pointer', textDecoration: 'underline', color: 'var(--text-main)' }}
          onClick={() => onFilterByHostname(hostname || m?.assetId || '')}
          title="Filtrar mantenimientos por este equipo"
        >
          {hostname || m?.assetId}
        </span>
      </td>
      <td>
        {m?.isDummy ? (
          <span className="spec-tag" style={{ background: 'rgba(71,85,105,0.12)', color: '#475569' }}>
            Sin asignar
          </span>
        ) : (
          <span className="spec-tag" style={{ background: m?.type === 'PREVENTIVE' ? 'rgba(59,130,246,0.12)' : 'rgba(239,68,68,0.12)', color: m?.type === 'PREVENTIVE' ? '#3b82f6' : '#ef4444' }}>
            {m?.type === 'PREVENTIVE' ? 'Preventivo' : 'Correctivo'}
          </span>
        )}
      </td>
      <td>
        {m?.isDummy ? (
          <span className="badge badge-status" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
            Sin Programar
          </span>
        ) : (
          <span className={`badge badge-status badge-${(m?.status || 'UNKNOWN').toLowerCase()}`}>
            {m?.status ? (STATUS_LABELS[m.status] || m.status) : 'Desconocido'}
          </span>
        )}
        {!m?.isDummy && isLate && <span style={{ color: '#ef4444', fontSize: '12px', marginLeft: '6px' }}>⚠ Vencido</span>}
      </td>
      <td>{m?.isDummy ? <span style={{ color: 'var(--text-muted)' }}>—</span> : (m?.scheduledDate ? new Date(m.scheduledDate).toLocaleDateString('es-CO', { timeZone: 'UTC' }) : 'N/A')}</td>
      <td>
        {m?.isDummy ? (
          <span style={{ color: 'var(--text-muted)' }}>—</span>
        ) : delayDays === null ? (
          <span style={{ color: 'var(--text-muted)' }}>—</span>
        ) : delayDays === 0 ? (
          <span style={{ color: '#10b981', fontWeight: 600 }}>A tiempo</span>
        ) : (
          <span style={{ color: m?.status === 'COMPLETED' ? '#f59e0b' : '#ef4444', fontWeight: 600 }}>{delayDays} días</span>
        )}
      </td>
      <td>{m?.isDummy ? getCollaboratorForAsset(m?.assetId || '') : (m?.collaboratorInTurnName || <span style={{ color: 'var(--text-muted)' }}>N/A</span>)}</td>
      <td>
        {m?.isDummy ? (
          <span style={{ color: 'var(--text-muted)' }}>—</span>
        ) : m?.status !== 'COMPLETED' ? (
          <span style={{ color: 'var(--text-muted)' }}>N/A</span>
        ) : (m?.signedAt || m?.pdfUrl) ? (
          <span style={{ color: '#10b981', fontWeight: 600 }}>Firmada</span>
        ) : m?.signatureToken ? (
          <span style={{ color: '#f59e0b', fontWeight: 600 }}>Pendiente</span>
        ) : (
          <span style={{ color: '#ef4444', fontWeight: 600 }}>Sin enviar</span>
        )}
      </td>
      <td>
        {m?.isDummy ? (
          canCreate && (
            <ActionMenu>
              <button className="btn-action" style={{ borderColor: '#3b82f6', color: '#3b82f6' }} title="Programar Mantenimiento" onClick={() => {
                const displayName = asset ? `${asset.id} - ${hostname || 'Sin Hostname'}` : m.assetId;
                onOpenModal('create', undefined, { assetId: m.assetId, displayName });
              }}>
                <Plus size={16} /> Programar
              </button>
            </ActionMenu>
          )
        ) : (
          <ActionMenu>
            <button className="btn-action" style={{ borderColor: '#8b5cf6', color: '#8b5cf6' }} title="Ver Historial" onClick={() => onOpenModal('view', m)}>
              <Clock size={16} />
            </button>
            {isAdmin && m.status === 'SCHEDULED' && (
              <button className="btn-action" style={{ borderColor: '#eab308', color: '#eab308' }} title="Iniciar Mantenimiento" onClick={() => onOpenModal('start', m)}>
                <Wrench size={16} />
              </button>
            )}
            {isAdmin && m.status === 'SCHEDULED' && (
              <button
                className="btn-action"
                style={{ borderColor: '#06b6d4', color: '#06b6d4', opacity: notifyPending ? 0.5 : 1 }}
                title="Enviar recordatorio por Webex al colaborador"
                disabled={notifyPending}
                onClick={() => onNotify(m.id, m.assetId)}
              >
                <Bell size={16} />
              </button>
            )}
            {isAdmin && m.status === 'IN_PROGRESS' && (
              <button className="btn-action" style={{ borderColor: '#22c55e', color: '#22c55e' }} title="Completar Mantenimiento" onClick={() => onOpenModal('complete', m)}>
                <CheckCircle size={16} />
              </button>
            )}
            {isAdmin && m?.status === 'COMPLETED' && !m?.signedAt && !m?.pdfUrl && (
              <button
                className="btn-action"
                style={{ borderColor: '#ec4899', color: '#ec4899', opacity: forceSignPending ? 0.5 : 1 }}
                title="Firmar forzadamente"
                onClick={() => onOpenModal('forceSign', m)}
                disabled={forceSignPending}
              >
                <Edit3 size={16} />
              </button>
            )}
            {isAdmin && m?.status === 'COMPLETED' && (
              <button
                className="btn-action"
                style={{
                  borderColor: (m?.signedAt || m?.pdfUrl) ? '#94a3b8' : '#3b82f6',
                  color: (m?.signedAt || m?.pdfUrl) ? '#94a3b8' : '#3b82f6',
                  opacity: (requestSignaturePending || m?.signedAt || m?.pdfUrl) ? 0.5 : 1,
                  cursor: (m?.signedAt || m?.pdfUrl) ? 'not-allowed' : 'pointer'
                }}
                title={(m?.signedAt || m?.pdfUrl) ? "Mantenimiento ya firmado" : "Solicitar firma de mantenimiento"}
                onClick={() => {
                  if (m?.signedAt || m?.pdfUrl) return;
                  onRequestSignature(m.id);
                }}
                disabled={requestSignaturePending || !!(m?.signedAt || m?.pdfUrl)}
              >
                <Mail size={16} />
              </button>
            )}
          </ActionMenu>
        )}
      </td>
    </tr>
  );
}

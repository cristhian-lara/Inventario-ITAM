import { Link } from 'react-router-dom';
import { Tag, Cpu, HardDrive, Wifi, PlusCircle, MonitorSmartphone, RefreshCw, AlertTriangle, Trash2, CalendarClock, FileText, FileCheck } from 'lucide-react';
import ActionMenu from '../ActionMenu';

interface Asset {
  id: string;
  categoryId: string;
  serial: string;
  status: string;
  dynamicAttributes: Record<string, any>;
}

interface Props {
  asset: Asset;
  categories: any[] | undefined;
  collaborators: any[] | undefined;
  activeAssignment: any;
  assetPerms: { edit: boolean; delete: boolean };
  onEdit: (asset: any) => void;
  onAssign: (assetId: string) => void;
  onReturn: (assetId: string) => void;
  onForceAction: (type: 'accept' | 'return', assetId: string) => void;
  onExtendLoan: (assignmentId: string, assetId: string, currentReturnDate?: string) => void;
  onResendLink: (assetId: string) => void;
  onRetire: (assetId: string) => void;
  onGenerateAct: (assignmentId: string) => void;
  onViewAct: (documentPath: string) => void;
  returnPending: boolean;
  resendPending: boolean;
  generateActPending: boolean;
}

export default function AssetTableRow({
  asset,
  categories,
  collaborators,
  activeAssignment,
  assetPerms,
  onEdit,
  onAssign,
  onReturn,
  onForceAction,
  onExtendLoan,
  onResendLink,
  onRetire,
  onGenerateAct,
  onViewAct,
  returnPending,
  resendPending,
  generateActPending
}: Props) {
  const category = categories?.find(c => c.id === asset.categoryId);
  const requiresPlaca = category?.schemaDefinition?.requiresPlacaIkusi !== false;
  const isPendingAcceptance = activeAssignment?.status === 'PENDING_ACCEPTANCE';
  const isPendingReturn = activeAssignment?.status === 'PENDING_RETURN';

  const renderAssignedTo = () => {
    if (activeAssignment && activeAssignment.collaboratorId) {
      const coll = collaborators?.find((c: any) => c.id === activeAssignment.collaboratorId);
      if (!coll) return 'Sin asignar';
      const isLoan = activeAssignment.assignmentType === 'LOAN';
      const overdue = isLoan && activeAssignment.expectedReturnDate && new Date(activeAssignment.expectedReturnDate) < new Date();
      return (
        <>
          <Link to={`/collaborators/${activeAssignment.collaboratorId}`} style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: '500' }}>
            {coll.email}
          </Link>
          {isLoan && (
            <div style={{ marginTop: '4px' }}>
              <span
                className="badge"
                style={{
                  fontSize: '11px',
                  background: overdue ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: overdue ? '#dc2626' : '#ca8a04'
                }}
                title={overdue ? 'Préstamo vencido' : 'Préstamo activo'}
              >
                Préstamo · {overdue ? 'Vencido' : 'Vence'} {activeAssignment.expectedReturnDate ? new Date(activeAssignment.expectedReturnDate).toLocaleDateString('es-CO') : ''}
              </span>
            </div>
          )}
        </>
      );
    }
    return 'Sin asignar';
  };

  const renderSpecs = () => {
    if (!requiresPlaca) {
      return (
        <>
          {asset.serial && (
            <span className="spec-tag" title="Serial">
              <HardDrive size={12} /> {asset.serial}
            </span>
          )}
          {Object.entries(asset.dynamicAttributes || {}).map(([key, value]) => {
            if (!value || String(value).trim() === '') return null;
            const lowerKey = key.toLowerCase();

            if (
              lowerKey.includes('fecha de compra') ||
              lowerKey.includes('precio') ||
              lowerKey.includes('depreciaci') ||
              lowerKey.includes('garant') ||
              lowerKey.includes('warranty')
            ) return null;

            let Icon = Tag;
            if (lowerKey.includes('proces') || lowerKey.includes('cpu')) Icon = Cpu;
            else if (lowerKey.includes('ram') || lowerKey.includes('mem') || lowerKey.includes('disco') || lowerKey.includes('disk')) Icon = HardDrive;
            else if (lowerKey.includes('mac') || lowerKey.includes('wifi') || lowerKey.includes('red') || lowerKey.includes('ip')) Icon = Wifi;

            return (
              <span key={key} className="spec-tag" title={key}>
                <Icon size={12} /> {String(value)}
              </span>
            );
          })}
          {(!asset.dynamicAttributes || Object.values(asset.dynamicAttributes).every(v => !v || String(v).trim() === '')) && !asset.serial &&
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Sin specs</span>
          }
        </>
      );
    }

    const hostname = asset.dynamicAttributes?.Hostname || asset.dynamicAttributes?.hostname || asset.dynamicAttributes?.HOSTNAME;
    const modelo = asset.dynamicAttributes?.Modelo || asset.dynamicAttributes?.modelo || asset.dynamicAttributes?.MODELO || asset.dynamicAttributes?.Model || asset.dynamicAttributes?.model;

    return (
      <>
        {hostname && (
          <span className="spec-tag" title="Hostname">
            <MonitorSmartphone size={12} /> {hostname}
          </span>
        )}
        {modelo && (
          <span className="spec-tag" title="Modelo">
            <Tag size={12} /> {modelo}
          </span>
        )}
        {!hostname && !modelo && (
          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Sin specs</span>
        )}
      </>
    );
  };

  const renderStatus = () => {
    if (isPendingAcceptance) {
      return (
        <>
          <span className="badge badge-status badge-in_use" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#ca8a04' }}>
            Pendiente de Firma
          </span>
          <div style={{ marginTop: '8px', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-muted)' }}>En proceso de asignación</span>
          </div>
        </>
      );
    }
    if (isPendingReturn) {
      return (
        <>
          <span className="badge badge-status badge-in_use" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#ca8a04' }}>
            Pendiente Devolución
          </span>
          <div style={{ marginTop: '8px', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Esperando firma de devolución</span>
          </div>
        </>
      );
    }
    return (
      <span className={`badge badge-status badge-${asset.status.toLowerCase()}`}>
        {asset.status === 'AVAILABLE' ? 'Disponible' :
          asset.status === 'IN_USE' ? 'En Uso' :
          asset.status === 'PENDING_INSPECTION' ? 'Pendiente Visto Bueno' : asset.status}
      </span>
    );
  };

  const renderActions = () => {
    if (!assetPerms.edit) return null;

    if (isPendingAcceptance) {
      return (
        <>
          <button onClick={() => onForceAction('accept', asset.id)} className="btn-action" style={{ borderColor: '#f59e0b', color: '#f59e0b' }} title="Firma Forzada (TI)">
            <AlertTriangle size={16} />
          </button>
          <button
            className="btn-action"
            style={{ borderColor: '#3b82f6', color: '#3b82f6' }}
            title="Reenviar Link de Firma"
            onClick={() => onResendLink(asset.id)}
            disabled={resendPending}
          >
            <RefreshCw size={16} />
          </button>
        </>
      );
    }

    if (asset.status === 'AVAILABLE' && !isPendingAcceptance && !isPendingReturn) {
      return (
        <button
          className="btn-action btn-assign"
          title="Asignar Activo"
          onClick={() => onAssign(asset.id)}
        >
          <PlusCircle size={16} />
        </button>
      );
    }

    if (asset.status === 'IN_USE' || isPendingReturn) {
      return (
        <>
          {activeAssignment?.status === 'ACCEPTED' && (
            activeAssignment?.documentPath ? (
              <button
                className="btn-action"
                style={{ borderColor: 'var(--ikusi-green)', color: 'var(--ikusi-green)' }}
                title="Ver Acta de Asignación"
                onClick={() => onViewAct(activeAssignment.documentPath)}
              >
                <FileCheck size={16} />
              </button>
            ) : (
              <button
                className="btn-action"
                style={{ borderColor: '#3b82f6', color: '#3b82f6' }}
                title="Generar Acta de Asignación"
                onClick={() => onGenerateAct(activeAssignment.id)}
                disabled={generateActPending}
              >
                <FileText size={16} />
              </button>
            )
          )}
          {!isPendingReturn && (
            <button
              className="btn-action btn-return"
              title="Iniciar Devolución"
              onClick={() => onReturn(asset.id)}
              disabled={returnPending}
            >
              <RefreshCw size={16} />
            </button>
          )}
          {!isPendingReturn && activeAssignment?.assignmentType === 'LOAN' && (
            <button
              className="btn-action"
              style={{ borderColor: '#f59e0b', color: '#f59e0b' }}
              title="Extender Préstamo"
              onClick={() => onExtendLoan(activeAssignment.id, asset.id, activeAssignment.expectedReturnDate)}
            >
              <CalendarClock size={16} />
            </button>
          )}
          <button
            className="btn-action"
            style={{ borderColor: '#ef4444', color: '#ef4444' }}
            title="Devolución Forzada (TI)"
            onClick={() => onForceAction('return', asset.id)}
          >
            <AlertTriangle size={16} />
          </button>
          {isPendingReturn && (
            <button
              className="btn-action"
              style={{ borderColor: '#3b82f6', color: '#3b82f6' }}
              title="Reenviar Link de Firma"
              onClick={() => onResendLink(asset.id)}
              disabled={resendPending}
            >
              <RefreshCw size={16} />
            </button>
          )}
        </>
      );
    }

    return null;
  };

  return (
    <tr className="table-row">
      <td style={{ fontWeight: 600 }}>
        <Link to={`/assets/${asset.id}`} style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>
          {asset.id}
        </Link>
      </td>
      <td>{category?.name || 'Desconocida'}</td>
      <td>{renderAssignedTo()}</td>
      <td className="specs-cell">
        <div className="specs-cell-inner">{renderSpecs()}</div>
      </td>
      <td>{renderStatus()}</td>
      <td>
        <ActionMenu>
          <Link
            to={`/assets/${asset.id}`}
            className="btn-action"
            style={{ borderColor: 'var(--ikusi-green)', color: 'var(--ikusi-green)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
            title="Hoja de Vida del Equipo"
          >
            📋
          </Link>
          {assetPerms.edit && asset.status !== 'RETIRED' && (
            <button
              className="btn-action"
              style={{ borderColor: 'var(--text-muted)', color: 'var(--text-muted)' }}
              title="Editar Activo"
              onClick={() => onEdit(asset)}
            >
              ✏️
            </button>
          )}
          {renderActions()}
          {assetPerms.delete && asset.status !== 'RETIRED' && (
            <button
              className="btn-action"
              style={{ borderColor: '#ef4444', color: '#ef4444' }}
              title="Dar de Baja"
              onClick={() => onRetire(asset.id)}
            >
              <Trash2 size={16} />
            </button>
          )}
        </ActionMenu>
      </td>
    </tr>
  );
}

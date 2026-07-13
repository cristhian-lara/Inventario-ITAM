import { Link } from 'react-router-dom';
import ActionMenu from '../ActionMenu';
import { UserCheck, UserX, Edit2, Eye, Crown } from 'lucide-react';

interface Collaborator {
  id: string;
  name: string;
  email: string;
  department: string;
  location: string;
  status: 'ACTIVE' | 'INACTIVE';
  isLeader: boolean;
  leaderId: string | null;
  dynamicAttributes: Record<string, any>;
}

interface Props {
  c: Collaborator;
  assignmentsList: any[];
  collabPerms: { edit: boolean };
  getDepartmentName: (deptId: string | number) => string;
  getCECOName: (cecoId: string | undefined) => string;
  onOpenBatchReturn: (collab: Collaborator) => void;
  onEdit: (collab: Collaborator) => void;
  onOffboard: (collab: Collaborator) => void;
  onToggleStatus: (id: string) => void;
}

export default function CollaboratorTableRow({
  c,
  assignmentsList,
  collabPerms,
  getDepartmentName,
  getCECOName,
  onOpenBatchReturn,
  onEdit,
  onOffboard,
  onToggleStatus
}: Props) {
  const collabAssignments = assignmentsList.filter(
    (a: any) => a.collaboratorId === c.id && (a.status === 'ACCEPTED' || a.status === 'PENDING_ACCEPTANCE')
  );
  const count = collabAssignments.length;

  return (
    <tr className="table-row">
      <td className="fw-600">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link to={`/collaborators/${c.id}`} style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>
            {c.name}
          </Link>
          {c.isLeader && (
            <span
              title="Líder de Departamento"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#f59e0b',
                borderRadius: '50%'
              }}
            >
              <Crown size={14} strokeWidth={2.5} />
            </span>
          )}
        </div>
      </td>
      <td>{c.email}</td>
      <td>{getDepartmentName(c.department)}</td>
      <td>{c.location}</td>
      <td>{getCECOName(c.dynamicAttributes?.CECOS)}</td>
      <td>
        {count === 0 ? (
          <span style={{ fontSize: '12px', color: '#adb5bd', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
              <circle cx="12" cy="12" r="10" /><path d="M8 12h8" />
            </svg>
            Sin activos
          </span>
        ) : (
          <button
            onClick={() => onOpenBatchReturn(c)}
            title={`${count} activo${count !== 1 ? 's' : ''} asignado${count !== 1 ? 's' : ''} • Click para gestionar devolución`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '20px',
              background: 'rgba(0, 166, 80, 0.1)',
              border: '1px solid rgba(0, 166, 80, 0.3)',
              color: '#00a650',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              letterSpacing: '0.2px',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0, 166, 80, 0.18)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0, 166, 80, 0.55)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(0,166,80,0.18)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0, 166, 80, 0.1)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0, 166, 80, 0.3)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              <path d="m3.3 7 8.7 5 8.7-5" />
              <path d="M12 22V12" />
            </svg>
            {count} {count === 1 ? 'activo' : 'activos'}
          </button>
        )}
      </td>
      <td>
        <span className={`badge badge-${c.status.toLowerCase()}`}>
          {c.status === 'ACTIVE' ? <UserCheck size={14} /> : <UserX size={14} />}
          {c.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
        </span>
      </td>
      <td>
        <ActionMenu>
          {collabPerms.edit && (
            <button
              className="action-icon-btn edit-btn"
              onClick={() => onEdit(c)}
              title="Editar Colaborador"
            >
              <Edit2 size={16} />
            </button>
          )}
          <Link
            to={`/collaborators/${c.id}`}
            className="action-icon-btn view-btn"
            title="Ver Perfil"
          >
            <Eye size={16} />
          </Link>
          {collabPerms.edit && (
            <button
              className={`action-icon-btn ${c.status === 'ACTIVE' ? 'delete-btn' : 'reactivate-btn'}`}
              onClick={() => {
                if (c.status === 'ACTIVE' && count > 0) {
                  onOffboard(c);
                  return;
                }
                onToggleStatus(c.id);
              }}
              title={c.status === 'ACTIVE' ? 'Dar de Baja' : 'Reactivar'}
            >
              {c.status === 'ACTIVE' ? <UserX size={16} /> : <UserCheck size={16} />}
            </button>
          )}
        </ActionMenu>
      </td>
    </tr>
  );
}

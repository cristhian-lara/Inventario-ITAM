import { UserX } from 'lucide-react';
import Modal from '../Modal';

interface Collaborator {
  id: string;
  name: string;
}

interface Props {
  collaborator: Collaborator;
  assignmentsList: any[];
  assetsList: any[];
  reason: string;
  setReason: (value: string) => void;
  isOffboarding: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export default function OffboardModal({ collaborator, assignmentsList, assetsList, reason, setReason, isOffboarding, onClose, onSubmit }: Props) {
  const collabAssignments = assignmentsList.filter((a: any) => a.collaboratorId === collaborator.id && (a.status === 'ACCEPTED' || a.status === 'PENDING_ACCEPTANCE'));

  return (
    <Modal
      onClose={onClose}
      disableClose={isOffboarding}
      zIndex={1200}
      overlayStyle={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
      panelStyle={{
        background: '#ffffff',
        borderRadius: '20px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.2), 0 8px 20px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '580px',
        overflow: 'hidden',
        animation: 'slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)'
      }}
    >
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
        padding: '28px 32px 24px',
        position: 'relative'
      }}>
        <button
          onClick={() => !isOffboarding && onClose()}
          style={{
            position: 'absolute', top: '18px', right: '18px',
            background: 'rgba(255,255,255,0.2)', border: 'none',
            borderRadius: '50%', width: '32px', height: '32px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#fff', fontSize: '18px',
            transition: 'background 0.2s'
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.35)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
        >×</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            background: 'rgba(255,255,255,0.2)', borderRadius: '12px',
            width: '46px', height: '46px', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <UserX size={22} color="#fff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#fff' }}>Baja de Colaborador · Paz y Salvo</h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.75)' }}>
              Colaborador: <strong style={{ color: '#fff' }}>{collaborator.name}</strong>
            </p>
          </div>
        </div>
        <p style={{ margin: '14px 0 0', fontSize: '12.5px', color: 'rgba(255,255,255,0.9)', lineHeight: 1.5 }}>
          Este colaborador tiene <strong>{collabAssignments.length}</strong> equipo{collabAssignments.length !== 1 ? 's' : ''} asignado{collabAssignments.length !== 1 ? 's' : ''}.
          Al confirmar la baja se devolverán todos, quedarán disponibles en el catálogo y se generará un único acta de Paz y Salvo.
        </p>
      </div>

      {/* Asset list (read-only, all included) */}
      <div style={{ maxHeight: '300px', overflowY: 'auto', padding: '8px 0' }}>
        {collabAssignments.map((assignment: any) => {
          const asset = assetsList.find((ast: any) => ast.id === assignment.assetId);
          const hostname = asset?.dynamicAttributes?.hostname || asset?.dynamicAttributes?.Hostname || 'Sin hostname';
          const serial = asset?.serial || 'N/A';
          const brand = asset?.dynamicAttributes?.marca || asset?.dynamicAttributes?.Marca || '';
          const model = asset?.dynamicAttributes?.modelo || asset?.dynamicAttributes?.Modelo || '';
          return (
            <div
              key={assignment.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                padding: '14px 28px',
                borderLeft: '3px solid #dc2626',
                background: 'rgba(220,38,38,0.04)',
                borderBottom: '1px solid #f1f5f9'
              }}
            >
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                background: 'rgba(220,38,38,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <path d="M8 21h8M12 17v4" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>{hostname}</span>
                  {brand && <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '10px' }}>{brand}</span>}
                </div>
                <div style={{ marginTop: '4px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>{asset?.id || assignment.assetId}</span>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>S/N: {serial}</span>
                  {model && <span style={{ fontSize: '11px', color: '#94a3b8' }}>{model}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reason Input */}
      <div style={{ padding: '16px 28px 20px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
          Motivo de la baja <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <input
          type="text"
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ej: Fin de contrato, Renuncia, Terminación anticipada, etc."
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            fontSize: '14px',
            outline: 'none',
            boxSizing: 'border-box'
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = '#dc2626'}
          onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
        />
      </div>

      {/* Footer */}
      <div style={{
        padding: '20px 28px',
        borderTop: '1px solid #f1f5f9',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        gap: '12px', background: '#fafbfc'
      }}>
        <button
          onClick={onClose}
          disabled={isOffboarding}
          style={{
            padding: '10px 22px', borderRadius: '10px', border: '1px solid #e2e8f0',
            background: '#fff', color: '#64748b', fontWeight: '600',
            fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s'
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
          onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
        >Cancelar</button>
        <button
          onClick={onSubmit}
          disabled={isOffboarding || !reason.trim()}
          style={{
            padding: '10px 22px', borderRadius: '10px', border: 'none',
            background: (isOffboarding || !reason.trim())
              ? '#cbd5e1'
              : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
            color: '#fff',
            fontWeight: '600', fontSize: '13px',
            cursor: (isOffboarding || !reason.trim()) ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', gap: '7px',
            boxShadow: (isOffboarding || !reason.trim()) ? 'none' : '0 4px 14px rgba(220,38,38,0.35)'
          }}
        >
          {isOffboarding ? (
            <><span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }}></span>Procesando...</>
          ) : (
            <>
              <UserX size={14} />
              Confirmar Baja y Generar Paz y Salvo
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}

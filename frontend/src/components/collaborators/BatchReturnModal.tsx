import Modal from '../Modal';

interface Collaborator {
  id: string;
  name: string;
}

interface Props {
  collaborator: Collaborator;
  assignmentsList: any[];
  assetsList: any[];
  selectedAssignmentIds: string[];
  setSelectedAssignmentIds: (updater: string[] | ((prev: string[]) => string[])) => void;
  returnReason: string;
  setReturnReason: (value: string) => void;
  isBatchReturning: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export default function BatchReturnModal({
  collaborator,
  assignmentsList,
  assetsList,
  selectedAssignmentIds,
  setSelectedAssignmentIds,
  returnReason,
  setReturnReason,
  isBatchReturning,
  onClose,
  onSubmit
}: Props) {
  const collabAssignments = assignmentsList.filter((a: any) => a.collaboratorId === collaborator.id && (a.status === 'ACCEPTED' || a.status === 'PENDING_ACCEPTANCE'));
  const allSelected = collabAssignments.length > 0 && collabAssignments.every((a: any) => selectedAssignmentIds.includes(a.id));

  return (
    <Modal
      onClose={onClose}
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
        background: 'linear-gradient(135deg, #00a650 0%, #008a42 100%)',
        padding: '28px 32px 24px',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
          <div style={{
            background: 'rgba(255,255,255,0.2)', borderRadius: '12px',
            width: '46px', height: '46px', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14" />
              <path d="M16.5 9.4 7.55 4.24" />
              <polyline points="3.29 7 12 12 20.71 7" />
              <line x1="12" y1="22" x2="12" y2="12" />
              <circle cx="18.5" cy="15.5" r="2.5" />
              <path d="M20.27 17.27 22 19" />
            </svg>
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#fff' }}>Devolución de Equipos</h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.75)' }}>
              Colaborador: <strong style={{ color: '#fff' }}>{collaborator.name}</strong>
            </p>
          </div>
        </div>
        {collabAssignments.length > 0 && (
          <button
            onClick={() => {
              if (allSelected) {
                setSelectedAssignmentIds([]);
              } else {
                setSelectedAssignmentIds(collabAssignments.map((a: any) => a.id));
              }
            }}
            style={{
              background: allSelected ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.35)',
              borderRadius: '8px', color: '#fff',
              padding: '6px 14px', fontSize: '12px', fontWeight: '600',
              cursor: 'pointer', transition: 'all 0.2s',
              display: 'inline-flex', alignItems: 'center', gap: '6px'
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {allSelected
                ? <><polyline points="20 6 9 17 4 12" /></>
                : <><rect x="3" y="3" width="18" height="18" rx="3" /></>}
            </svg>
            {allSelected ? 'Deseleccionar todos' : `Seleccionar todos (${collabAssignments.length})`}
          </button>
        )}
      </div>

      {/* Asset list */}
      <div style={{ maxHeight: '340px', overflowY: 'auto', padding: '8px 0' }}>
        {collabAssignments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '12px', opacity: 0.5 }}>
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
            <p style={{ margin: 0, fontSize: '14px' }}>No hay activos asignados para retornar.</p>
          </div>
        ) : (
          collabAssignments.map((assignment: any) => {
            const asset = assetsList.find((ast: any) => ast.id === assignment.assetId);
            const isSelected = selectedAssignmentIds.includes(assignment.id);
            const hostname = asset?.dynamicAttributes?.hostname || asset?.dynamicAttributes?.Hostname || 'Sin hostname';
            const serial = asset?.serial || 'N/A';
            const brand = asset?.dynamicAttributes?.marca || asset?.dynamicAttributes?.Marca || '';
            const model = asset?.dynamicAttributes?.modelo || asset?.dynamicAttributes?.Modelo || '';
            return (
              <div
                key={assignment.id}
                onClick={() => {
                  if (isSelected) {
                    setSelectedAssignmentIds(prev => prev.filter(id => id !== assignment.id));
                  } else {
                    setSelectedAssignmentIds(prev => [...prev, assignment.id]);
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '16px',
                  padding: '14px 28px',
                  cursor: 'pointer',
                  borderLeft: isSelected ? '3px solid #6366f1' : '3px solid transparent',
                  background: isSelected ? 'rgba(99,102,241,0.06)' : '#fff',
                  borderBottom: '1px solid #f1f5f9',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = '#f8fafc'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = isSelected ? 'rgba(99,102,241,0.06)' : '#fff'; }}
              >
                <div style={{
                  width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
                  border: isSelected ? '2px solid #00a650' : '2px solid #d1d5db',
                  background: isSelected ? '#00a650' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}>
                  {isSelected && (
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <polyline points="2 6 5 9 10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                  background: isSelected ? 'rgba(0,166,80,0.1)' : '#f1f5f9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isSelected ? '#00a650' : '#94a3b8'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" /><polyline points="16 2 12 6 8 2" /></svg>
                      {asset?.id || assignment.assetId}
                    </span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>S/N: {serial}</span>
                    {model && <span style={{ fontSize: '11px', color: '#94a3b8' }}>{model}</span>}
                  </div>
                </div>
                {isSelected && (
                  <div style={{ flexShrink: 0, color: '#00a650', fontSize: '11px', fontWeight: '600' }}>✓</div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Reason Input */}
      <div style={{ padding: '0 28px 20px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
          Motivo de devolución
        </label>
        <input
          type="text"
          value={returnReason}
          onChange={(e) => setReturnReason(e.target.value)}
          placeholder="Ej: Fin de contrato, Renovación de equipo, etc."
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            fontSize: '14px',
            outline: 'none',
            transition: 'border-color 0.2s',
            boxSizing: 'border-box'
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = '#00a650'}
          onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
        />
      </div>

      {/* Footer */}
      <div style={{
        padding: '20px 28px',
        borderTop: '1px solid #f1f5f9',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '12px', background: '#fafbfc'
      }}>
        <span style={{ fontSize: '13px', color: '#64748b' }}>
          {selectedAssignmentIds.length === 0
            ? 'Selecciona al menos un equipo'
            : <><strong style={{ color: '#1e293b' }}>{selectedAssignmentIds.length}</strong> equipo{selectedAssignmentIds.length !== 1 ? 's' : ''} seleccionado{selectedAssignmentIds.length !== 1 ? 's' : ''}</>
          }
        </span>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onClose}
            disabled={isBatchReturning}
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
            disabled={isBatchReturning || selectedAssignmentIds.length === 0}
            style={{
              padding: '10px 22px', borderRadius: '10px', border: 'none',
              background: selectedAssignmentIds.length === 0
                ? '#e2e8f0'
                : 'linear-gradient(135deg, #00a650 0%, #008a42 100%)',
              color: selectedAssignmentIds.length === 0 ? '#94a3b8' : '#fff',
              fontWeight: '600', fontSize: '13px',
              cursor: selectedAssignmentIds.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: '7px',
              boxShadow: selectedAssignmentIds.length > 0 ? '0 4px 14px rgba(0,166,80,0.35)' : 'none'
            }}
          >
            {isBatchReturning ? (
              <><span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }}></span>Procesando...</>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 14 4 9 9 4" />
                  <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
                </svg>
                Iniciar Devolución{selectedAssignmentIds.length > 0 ? ` (${selectedAssignmentIds.length})` : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

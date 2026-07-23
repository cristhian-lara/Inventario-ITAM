import { useState } from 'react';
import { AlertCircle } from 'lucide-react';

export interface NewAssetData {
  id: string;
  categoryId: number | '';
  serial: string;
  dynamicAttributes: any;
  purchaseDate?: string;
  warrantyMonths?: number;
  depreciationYears?: number;
  purchasePrice?: number;
  vendorName?: string;
  internalBuyer?: string;
}

interface Props {
  newAsset: NewAssetData;
  setNewAsset: (updater: NewAssetData | ((prev: NewAssetData) => NewAssetData)) => void;
  categories: any[] | undefined;
  isEditing: boolean;
  modalErrorMsg: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

export default function AssetFormModal({ newAsset, setNewAsset, categories, isEditing, modalErrorMsg, onClose, onSubmit, isPending }: Props) {
  const selectedCategory = categories?.find((c: any) => c.id === newAsset.categoryId);
  const requiresPlaca = selectedCategory?.schemaDefinition?.requiresPlacaIkusi !== false;
  const idPrefix: string = selectedCategory?.schemaDefinition?.idPrefix || '';
  const [placaUnlocked, setPlacaUnlocked] = useState(false);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px' }}>
      <div className="glass-panel" style={{ position: 'relative', width: '100%', maxWidth: '600px', margin: 0, padding: '30px', maxHeight: '90vh', overflowY: 'auto' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '5px', fontSize: '18px' }}
        >
          ✕
        </button>
        <h3 style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--text-main)', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px', fontSize: '22px', marginTop: 0 }}>
          {isEditing ? 'Editar Activo' : 'Registrar Nuevo Activo'}
        </h3>
        {modalErrorMsg && (
          <div className="alert alert-error" style={{ marginBottom: '20px', fontSize: '14px' }}>
            <AlertCircle size={18} />
            {modalErrorMsg}
          </div>
        )}
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label>Categoría</label>
            <select
              required
              className="glass-input"
              value={newAsset.categoryId}
              disabled={isEditing}
              onChange={e => {
                const catId = Number(e.target.value);
                const cat = categories?.find((c: any) => c.id === catId);
                const newDynamicAttr: any = {};
                if (cat && cat.schemaDefinition?.fields) {
                  cat.schemaDefinition.fields.forEach((f: any) => newDynamicAttr[f.name] = '');
                }
                setNewAsset({ ...newAsset, categoryId: catId, dynamicAttributes: newDynamicAttr });
              }}
            >
              <option value="" disabled>Seleccione una categoría</option>
              {categories?.map((cat: any) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {newAsset.categoryId && (
            <>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span>{requiresPlaca ? "Placa Ikusi" : "ID Interno (Generado automáticamente)"}</span>
                  {isEditing && requiresPlaca && (
                    <button
                      type="button"
                      onClick={() => setPlacaUnlocked(v => !v)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--accent, #4a9eff)', cursor: 'pointer', fontSize: '12px', fontWeight: 600, textDecoration: 'underline', padding: 0 }}
                    >
                      {placaUnlocked ? 'Cancelar corrección' : 'Corregir placa'}
                    </button>
                  )}
                </label>
                <input
                  type="text"
                  required={requiresPlaca}
                  className="glass-input"
                  value={newAsset.id}
                  disabled={(isEditing && !placaUnlocked) || !requiresPlaca}
                  onChange={e => setNewAsset({ ...newAsset, id: e.target.value })}
                  placeholder={requiresPlaca ? "Ej. AST-2026-050" : `Autogenerado (Ej: ${idPrefix ? `${idPrefix}001` : '000001'})`}
                />
                {isEditing && requiresPlaca && placaUnlocked && (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', marginTop: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                    <span>Úsalo solo para corregir un activo que quedó sin placa asignada. El cambio se reflejará también en su historial de asignaciones, mantenimientos y upgrades.</span>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Número de Serie</label>
                <input type="text" className="glass-input" value={newAsset.serial} onChange={e => setNewAsset({ ...newAsset, serial: e.target.value })} placeholder="Ej. SN-X3X3X3 (Opcional)" />
              </div>
              <div className="form-group">
                <label>Fecha de Compra</label>
                <input type="date" max={new Date().toISOString().split('T')[0]} className="glass-input" value={newAsset.purchaseDate || ''} onChange={e => setNewAsset({ ...newAsset, purchaseDate: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Garantía (Meses)</label>
                <input type="number" min="0" className="glass-input" value={newAsset.warrantyMonths || ''} onChange={e => setNewAsset({ ...newAsset, warrantyMonths: parseInt((e.target.value), 10) })} placeholder="Ej. 12 (Opcional)" />
              </div>
              <div className="form-group">
                <label>Valor de Compra (COP) (Opcional)</label>
                <input type="number" step="0.01" min="0" className="glass-input" value={newAsset.purchasePrice || ''} onChange={e => setNewAsset({ ...newAsset, purchasePrice: parseFloat(e.target.value) })} placeholder="Ej. 1200000" />
              </div>
              <div className="form-group">
                <label>Depreciación (Opcional)</label>
                <select className="glass-input" value={newAsset.depreciationYears || ''} onChange={e => setNewAsset({ ...newAsset, depreciationYears: e.target.value ? parseInt(e.target.value, 10) : undefined })}>
                  <option value="">No aplica / Sin calcular</option>
                  <option value="3">3 Años</option>
                  <option value="5">5 Años</option>
                </select>
              </div>
              <div className="form-group">
                <label>Proveedor (Opcional)</label>
                <input type="text" className="glass-input" value={newAsset.vendorName || ''} onChange={e => setNewAsset({ ...newAsset, vendorName: e.target.value })} placeholder="Ej. CompuMundo S.A.S" />
              </div>
              <div className="form-group">
                <label>Comprador Interno (Opcional)</label>
                <input type="text" className="glass-input" value={newAsset.internalBuyer || ''} onChange={e => setNewAsset({ ...newAsset, internalBuyer: e.target.value })} placeholder="Ej. Juan Pérez (Compras)" />
              </div>

              {(() => {
                // Renderizamos todos los campos definidos en el esquema de la categoría
                // (aunque estén vacíos) y además cualquier atributo legado que ya tenga
                // el activo pero que ya no esté en el esquema, para no ocultar datos.
                const schemaFieldNames: string[] = (selectedCategory?.schemaDefinition?.fields || []).map((f: any) => f.name);
                const legacyNames = Object.keys(newAsset.dynamicAttributes).filter((n) => !schemaFieldNames.includes(n));
                return [...schemaFieldNames, ...legacyNames];
              })().map((attrName) => {
                const fieldDef = selectedCategory?.schemaDefinition?.fields?.find((f: any) => f.name === attrName);
                const isRequired = fieldDef?.isRequired;
                const type = fieldDef?.type || 'text';
                const options = fieldDef?.options || [];
                const unit = fieldDef?.unit;
                const regex = fieldDef?.validationRegex;
                const regexMsg = fieldDef?.validationMessage;

                return (
                  <div className="form-group" key={attrName}>
                    <label style={{ textTransform: 'capitalize' }}>{attrName} {isRequired && <span style={{ color: 'red' }}>*</span>}</label>
                    {type === 'select' ? (
                      <select
                        required={isRequired}
                        className="glass-input"
                        value={newAsset.dynamicAttributes[attrName] || ''}
                        onChange={(e) => setNewAsset({
                          ...newAsset,
                          dynamicAttributes: { ...newAsset.dynamicAttributes, [attrName]: e.target.value }
                        })}
                      >
                        <option value="" disabled>Seleccione una opción</option>
                        {options.map((opt: string) => {
                          const displayOpt = unit && !opt.includes(unit) ? `${opt} ${unit}` : opt;
                          return <option key={opt} value={displayOpt} style={{ color: 'black' }}>{displayOpt}</option>;
                        })}
                      </select>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="text"
                          required={isRequired}
                          className="glass-input"
                          pattern={regex}
                          title={regexMsg}
                          value={String(newAsset.dynamicAttributes[attrName] || '').replace(new RegExp(`\\s?${unit}$`), '')}
                          onChange={(e) => {
                            const val = e.target.value;
                            const finalVal = val && unit ? `${val} ${unit}` : val;
                            setNewAsset({
                              ...newAsset,
                              dynamicAttributes: { ...newAsset.dynamicAttributes, [attrName]: finalVal }
                            });
                          }}
                          placeholder={`Ingrese ${attrName}`}
                        />
                        {unit && <span style={{ color: 'var(--text-muted)', fontWeight: 600, paddingRight: '8px' }}>{unit}</span>}
                      </div>
                    )}
                  </div>
                );
              })}

              <button type="submit" className="btn-primary submit-btn" disabled={isPending}>
                {isPending ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Crear Activo')}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

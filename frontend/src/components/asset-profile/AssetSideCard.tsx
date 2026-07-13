import { Monitor, Tag, Calendar, CheckCircle, Building2, UserCheck } from 'lucide-react';

interface Asset {
    id: string;
    categoryId: number;
    serial?: string;
    status: string;
    dynamicAttributes?: Record<string, any>;
    purchaseDate?: string;
    warrantyMonths?: number;
    purchasePrice?: number;
    vendorName?: string;
    internalBuyer?: string;
    disposal?: {
        reason: string;
        disposalDate: string;
        authorizedBy: string;
        blanccoReportId?: string;
        notes?: string;
    };
}

interface Category {
    id: number;
    name: string;
}

interface Props {
    asset: Asset;
    category: Category | undefined;
    specs: Record<string, any>;
    statusLabel: (s: string) => string;
    statusClass: (s: string) => string;
    formatDateSafe: (value: string) => string;
    maintenancesCount: number | undefined;
    upgradesCount: number | undefined;
    assignmentHistoryCount: number | undefined;
}

export default function AssetSideCard({ asset, category, specs, statusLabel, statusClass, formatDateSafe, maintenancesCount, upgradesCount, assignmentHistoryCount }: Props) {
    return (
        <div className="asset-side-card glass-panel">
            <div className="asset-icon-wrapper">
                <Monitor size={48} color="var(--ikusi-green)" />
            </div>

            <h2 className="asset-profile-id">{asset.id}</h2>

            {asset.serial && (
                <div className="asset-profile-serial">S/N: {asset.serial}</div>
            )}

            <span className={`badge ${statusClass(asset.status)}`} style={{ marginBottom: '4px' }}>
                {statusLabel(asset.status)}
            </span>

            <div className="asset-side-details">
                <div className="asset-detail-item">
                    <Tag size={16} color="var(--ikusi-green)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div className="asset-detail-block">
                        <span className="detail-label">Categoría</span>
                        <span className="detail-value">{category?.name || `Cat. ${asset.categoryId}`}</span>
                    </div>
                </div>

                {asset.purchaseDate && (
                    <div className="asset-detail-item">
                        <Calendar size={16} color="var(--ikusi-green)" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div className="asset-detail-block">
                            <span className="detail-label">Fecha de Compra</span>
                            <span className="detail-value">{(() => {
                                const [y, m, d] = asset.purchaseDate!.toString().split('T')[0].split('-');
                                return `${parseInt(d, 10)}/${parseInt(m, 10)}/${y}`;
                            })()}</span>
                        </div>
                    </div>
                )}

                {asset.warrantyMonths && (
                    <div className="asset-detail-item">
                        <CheckCircle size={16} color="var(--ikusi-green)" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div className="asset-detail-block">
                            <span className="detail-label">Garantía</span>
                            <span className="detail-value">{asset.warrantyMonths} meses</span>
                        </div>
                    </div>
                )}

                {(() => {
                    let precio = asset.purchasePrice || 0;
                    if (!precio) {
                        const pKey = Object.keys(specs).find(k => k.toUpperCase().includes('PRECIO'));
                        if (pKey && specs[pKey]) precio = parseFloat(String(specs[pKey]).replace(/[^0-9.-]+/g, ''));
                    }
                    return (
                        <div className="asset-detail-item">
                            <Tag size={16} color="var(--ikusi-green)" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div className="asset-detail-block">
                                <span className="detail-label">Valor de Compra</span>
                                <span className="detail-value" style={!precio ? { color: 'var(--text-muted)', fontStyle: 'italic' } : undefined}>
                                    {precio
                                        ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(precio)
                                        : 'No registrado'}
                                </span>
                            </div>
                        </div>
                    );
                })()}

                {asset.vendorName && (
                    <div className="asset-detail-item">
                        <Building2 size={16} color="var(--ikusi-green)" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div className="asset-detail-block">
                            <span className="detail-label">Proveedor</span>
                            <span className="detail-value">{asset.vendorName}</span>
                        </div>
                    </div>
                )}

                {asset.internalBuyer && (
                    <div className="asset-detail-item">
                        <UserCheck size={16} color="var(--ikusi-green)" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div className="asset-detail-block">
                            <span className="detail-label">Comprador Interno</span>
                            <span className="detail-value">{asset.internalBuyer}</span>
                        </div>
                    </div>
                )}

                {asset.status === 'RETIRED' && asset.disposal && (
                    <div style={{ marginTop: '10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 14px', textAlign: 'left' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
                            Información de la Baja
                        </div>
                        <div style={{ fontSize: '12px', color: '#7f1d1d', lineHeight: 1.7 }}>
                            <div><strong>Motivo:</strong> {asset.disposal.reason}</div>
                            <div><strong>Fecha:</strong> {formatDateSafe(asset.disposal.disposalDate)}</div>
                            <div><strong>Autorizada por:</strong> {asset.disposal.authorizedBy}</div>
                            {asset.disposal.blanccoReportId && (
                                <div><strong>Reporte Blancco:</strong> {asset.disposal.blanccoReportId}</div>
                            )}
                            {asset.disposal.notes && (
                                <div><strong>Notas:</strong> {asset.disposal.notes}</div>
                            )}
                        </div>
                    </div>
                )}

                <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center' }}>
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 4px' }}>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ikusi-green)' }}>
                            {maintenancesCount ?? '—'}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '2px' }}>
                            Mantenimientos
                        </div>
                    </div>
                    <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '10px 4px' }}>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#7c3aed' }}>
                            {upgradesCount ?? '—'}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '2px' }}>
                            Upgrades
                        </div>
                    </div>
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px 4px' }}>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#1d4ed8' }}>
                            {assignmentHistoryCount ?? '—'}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '2px' }}>
                            Asignados
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

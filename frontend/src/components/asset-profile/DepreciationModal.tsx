import { Activity, AlertCircle } from 'lucide-react';

interface Asset {
    purchasePrice?: number;
    depreciationYears?: number;
    purchaseDate?: string;
}

interface Props {
    asset: Asset | undefined;
    specs: Record<string, any>;
    onClose: () => void;
}

export default function DepreciationModal({ asset, specs, onClose }: Props) {
    let precio = asset?.purchasePrice || 0;
    if (precio === 0) {
        const pKey = Object.keys(specs).find(k => k.toUpperCase().includes('PRECIO'));
        if (pKey && specs[pKey]) {
            precio = parseFloat(String(specs[pKey]).replace(/[^0-9.-]+/g, ''));
        }
    }

    let anos = asset?.depreciationYears || 0;
    if (anos === 0) {
        const aKey = Object.keys(specs).find(k => k.toUpperCase().includes('DEPRECIACI'));
        if (aKey && specs[aKey]) {
            anos = parseFloat(String(specs[aKey]).replace(/[^0-9.-]+/g, ''));
        }
    }

    let fechaCompra = asset?.purchaseDate;
    if (!fechaCompra) {
        const fKey = Object.keys(specs).find(k => k.toUpperCase().includes('FECHA DE COMPRA'));
        if (fKey && specs[fKey]) {
            fechaCompra = specs[fKey];
        }
    }

    let content = null;
    if (!precio || !anos || !fechaCompra) {
        content = (
            <div style={{ textAlign: 'center', padding: '20px' }}>
                <AlertCircle size={40} color="var(--accent-red)" style={{ marginBottom: '10px' }} />
                <p style={{ color: 'var(--text-secondary)' }}>Faltan datos en el activo para calcular la depreciación.</p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Se requiere: Precio de Compra, Fecha de Compra y Años de Depreciación.</p>
            </div>
        );
    } else {
        const dateCompra = new Date(`${fechaCompra.toString().split('T')[0]}T12:00:00`);
        const diffTime = new Date().getTime() - dateCompra.getTime();
        const elapsedYears = diffTime > 0 ? diffTime / (1000 * 60 * 60 * 24 * 365.25) : 0;

        const depAnual = precio / anos;
        const depAcumulada = Math.min(precio, depAnual * elapsedYears);
        const valorActual = Math.max(0, precio - depAcumulada);

        const formatCurrency = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(val);

        content = (
            <div style={{ padding: '10px 0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Precio de Compra</div>
                        <div style={{ fontSize: '16px', fontWeight: 600 }}>{formatCurrency(precio)}</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tiempo Transcurrido</div>
                        <div style={{ fontSize: '16px', fontWeight: 600 }}>{elapsedYears.toFixed(1)} años</div>
                    </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #e2e8f0' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Años de vida útil:</span>
                        <span style={{ fontWeight: 600 }}>{anos} años</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #e2e8f0' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Depreciación anual (línea recta):</span>
                        <span style={{ fontWeight: 600, color: 'var(--accent-red)' }}>-{formatCurrency(depAnual)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #e2e8f0' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Depreciación acumulada:</span>
                        <span style={{ fontWeight: 600, color: 'var(--accent-red)' }}>-{formatCurrency(depAcumulada)}</span>
                    </div>
                </div>

                <div style={{ background: 'var(--ikusi-green)', color: 'white', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>Valor Actual Estimado</span>
                    <span style={{ fontSize: '20px', fontWeight: 700 }}>{formatCurrency(valorActual)}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="ap-modal-overlay">
            <div className="ap-modal glass-panel" style={{ maxWidth: '450px' }}>
                <div className="ap-modal-header">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Activity size={20} color="var(--ikusi-green)" />
                        Cálculo de Depreciación
                    </h3>
                    <button className="ap-modal-close" onClick={onClose}>×</button>
                </div>
                <div className="ap-modal-body">
                    {content}
                </div>
                <div className="ap-modal-footer">
                    <button className="btn-primary" onClick={onClose} style={{ width: '100%' }}>
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}

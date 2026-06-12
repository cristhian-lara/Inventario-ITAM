import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CheckCircle } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext';
import { API_URL } from '../config';

const MaintenanceSign: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [signed, setSigned] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const sigCanvas = useRef<any>(null);
  const { confirm } = useConfirm();

  const { data: record, isLoading, isError } = useQuery({
    queryKey: ['verifyMaintenanceToken', token],
    queryFn: async () => {
      const res = await fetch(`/api/maintenances/verify-token/${token}`);
      if (!res.ok) throw new Error('Token inválido o expirado');
      return res.json();
    },
    retry: false
  });

  const signMutation = useMutation({
    mutationFn: async (signatureBase64: string) => {
      const res = await fetch('/api/maintenances/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, signature: signatureBase64 })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al firmar');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setSigned(true);
      setPdfUrl(data.pdfUrl);
    },
    onError: (error: Error) => {
      alert(error.message);
    }
  });

  const clearSignature = () => {
    sigCanvas.current?.clear();
  };

  const handleSign = () => {
    if (sigCanvas.current?.isEmpty()) {
      alert('Por favor, dibuje su firma antes de confirmar.');
      return;
    }
    confirm({
      title: 'Confirmar Firma',
      message: 'Al confirmar, acepto que el equipo ha recibido mantenimiento a conformidad.',
      type: 'info',
      onConfirm: () => {
        const signatureBase64 = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
        signMutation.mutate(signatureBase64);
      }
    });
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f4f8' }}>
        <h2>Verificando enlace...</h2>
      </div>
    );
  }

  if (isError || !record) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f4f8' }}>
        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <h2 style={{ color: '#e3000f' }}>Enlace Inválido o Expirado</h2>
          <p>Este enlace ya no es válido o el mantenimiento ya ha sido firmado.</p>
        </div>
      </div>
    );
  }

  if (signed) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f0f4f8' }}>
        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '500px' }}>
          <CheckCircle size={64} color="#00a650" style={{ margin: '0 auto 20px' }} />
          <h2 style={{ color: '#004b87', marginBottom: '10px' }}>¡Mantenimiento Confirmado!</h2>
          <p style={{ color: '#666', marginBottom: '30px' }}>El acta de cierre de mantenimiento ha sido generada correctamente y guardada en el sistema.</p>
          
          {pdfUrl && (
            <a 
              href={`${API_URL}${pdfUrl}`} 
              target="_blank" 
              rel="noreferrer"
              style={{
                display: 'inline-block',
                backgroundColor: '#004b87',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '4px',
                textDecoration: 'none',
                fontWeight: 'bold'
              }}
            >
              Descargar Acta en PDF
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f4f8', padding: '40px 20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 8px 16px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        
        {/* Header Ikusi */}
        <div style={{ backgroundColor: '#004b87', padding: '30px', textAlign: 'center', color: 'white' }}>
          <img src="https://www.ikusi.com/mx/wp-content/uploads/sites/2/2020/09/ikusi-velatia-logo.png" alt="Ikusi Logo" style={{ width: '150px', marginBottom: '20px', filter: 'brightness(0) invert(1)' }} />
          <h1 style={{ margin: 0, fontSize: '24px' }}>Conformidad de Mantenimiento</h1>
        </div>

        <div style={{ padding: '40px' }}>
          <p style={{ fontSize: '16px', color: '#444', lineHeight: '1.6' }}>
            Hola <strong>{record.collaboratorInTurnName}</strong>,
            <br/><br/>
            Se ha completado el servicio de mantenimiento técnico para su equipo. A continuación se presentan los detalles del servicio realizado:
          </p>

          <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #e9ecef', margin: '30px 0' }}>
            <h3 style={{ color: '#004b87', marginTop: 0 }}>Detalles del Equipo</h3>
            <p><strong>Placa Ikusi:</strong> {record.assetId}</p>
            <p><strong>Tipo de Mantenimiento:</strong> {record.type === 'PREVENTIVE' ? 'Preventivo' : 'Correctivo'}</p>
            
            <h3 style={{ color: '#004b87', marginTop: '20px' }}>Notas Técnicas de Cierre</h3>
            <div style={{ backgroundColor: 'white', padding: '15px', borderLeft: '4px solid #004b87', color: '#555', fontStyle: 'italic' }}>
              {record.notes || 'No se registraron notas adicionales.'}
            </div>
          </div>

          <div style={{ marginTop: '40px' }}>
            <h3 style={{ color: '#004b87' }}>Firma Digital</h3>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
              Por favor, dibuje su firma en el recuadro inferior para certificar que recibe su equipo en conformidad tras el mantenimiento.
            </p>
            
            <div style={{ border: '2px dashed #ccc', borderRadius: '8px', backgroundColor: '#fafafa' }}>
              <SignatureCanvas 
                ref={sigCanvas} 
                penColor="black"
                canvasProps={{ width: 720, height: 200, className: 'sigCanvas' }} 
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px' }}>
              <button 
                onClick={clearSignature}
                style={{ padding: '10px 20px', backgroundColor: '#f1f3f5', border: '1px solid #dee2e6', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#495057' }}
              >
                Limpiar Firma
              </button>
              
              <button 
                onClick={handleSign}
                disabled={signMutation.isPending}
                style={{ 
                  padding: '10px 30px', 
                  backgroundColor: signMutation.isPending ? '#6c757d' : '#00a650', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: signMutation.isPending ? 'not-allowed' : 'pointer', 
                  fontWeight: 'bold',
                  fontSize: '16px'
                }}
              >
                {signMutation.isPending ? 'Procesando...' : 'Firmar y Confirmar'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default MaintenanceSign;

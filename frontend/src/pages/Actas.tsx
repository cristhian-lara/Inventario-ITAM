import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileDown, Calendar, FileText, CheckCircle, Search } from 'lucide-react';
import './Actas.css';
import { API_URL } from '../config';
import axios from 'axios';

interface DocumentInfo {
  filename: string;
  url: string;
  date: string;
}

interface DocumentsResponse {
  assignments: DocumentInfo[];
  returns: DocumentInfo[];
  maintenances: DocumentInfo[];
}

export default function Actas() {
  const [activeTab, setActiveTab] = useState<'assignments' | 'returns' | 'maintenances'>('assignments');
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading, error } = useQuery<DocumentsResponse>({
    queryKey: ['documents'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/documents`);
      return response.data;
    }
  });

  if (isLoading) {
    return (
      <div className="actas-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p className="title-glow">Cargando documentos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="actas-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'red' }}>Error al cargar los documentos.</p>
      </div>
    );
  }

  const formatFilename = (filename: string) => {
    // 0a. Formato actual: "Asignación Nombre - ID.pdf", "Devolución Nombre - ID.pdf",
    //     "Paz y Salvo Nombre - ID.pdf", "Mantenimiento Nombre - ID.pdf"
    if (/^(Asignación|Asignacion|Devolución|Devolucion|Paz y Salvo|Mantenimiento) /.test(filename)) {
      const parts = filename.replace('.pdf', '').split(' - ');
      if (parts.length >= 2) {
        parts.pop(); // Removemos el ID del final
        return parts.join(' - ');
      }
      return filename.replace('.pdf', '');
    }

    // 0b. Formatos anteriores (ej: "Paz y Salvo - Angie Lara - BATCH-123.pdf")
    if (filename.startsWith('Acta de Asignacion -') || filename.startsWith('Paz y Salvo -') || filename.startsWith('Acta de Mantenimiento -')) {
      const parts = filename.replace('.pdf', '').split(' - ');
      if (parts.length >= 3) {
        parts.pop(); // Removemos el ID del final
        return parts.join(' - ');
      }
      return filename.replace('.pdf', '');
    }

    // 1. Asignaciones (antiguas)
    if (filename.startsWith('acta-')) {
      const match = filename.match(/^acta-(.+?)-assig-.*\.pdf$/);
      if (match && match[1]) {
        return `Acta de Asignación - ${match[1].replace(/_/g, ' ')}`;
      }
      return 'Acta de Asignación';
    }
    
    // 2. Devoluciones (Paz y Salvo) (antiguas)
    if (filename.startsWith('pazysalvo-')) {
      const match = filename.match(/^pazysalvo-(.+?)-(?:BATCH|assig)-.*\.pdf$/);
      if (match && match[1]) {
        return `Paz y Salvo - ${match[1].replace(/_/g, ' ')}`;
      }
      return 'Paz y Salvo';
    }
    
    // 3. Mantenimientos (antiguas)
    if (filename.startsWith('acta_mantenimiento_')) {
      const match = filename.match(/^acta_mantenimiento_(.*?)_?(?:[a-zA-Z0-9\-]+)_(\d+)\.pdf$/);
      if (match && match[1]) {
        return `Acta de Mantenimiento - ${match[1].replace(/_/g, ' ')}`;
      }
      return 'Acta de Mantenimiento';
    }

    // Fallback original
    return filename
      .replace('.pdf', '')
      .replace(/_/g, ' ')
      .replace(/-/g, ' - ');
  };

  const getFilteredDocs = () => {
    if (!data) return [];
    let list: DocumentInfo[] = [];
    if (activeTab === 'assignments') list = data.assignments;
    if (activeTab === 'returns') list = data.returns;
    if (activeTab === 'maintenances') list = data.maintenances;

    if (searchTerm) {
      list = list.filter(d => formatFilename(d.filename).toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return list;
  };

  const filteredDocs = getFilteredDocs();

  return (
    <div className="actas-container animate-fade-in">
      <div className="actas-header">
        <div>
          <h1 className="title-glow">Gestor de Actas</h1>
          <p className="subtitle">Visualiza y descarga los documentos generados localmente</p>
        </div>
        
        <div className="search-bar">
          <Search className="search-icon" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nombre de archivo..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="glass-input"
          />
        </div>
      </div>

      <div className="tabs-container">
        <button 
          className={`tab-button ${activeTab === 'assignments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          <FileText size={18} /> Asignaciones ({data?.assignments.length || 0})
        </button>
        <button 
          className={`tab-button ${activeTab === 'returns' ? 'active' : ''}`}
          onClick={() => setActiveTab('returns')}
        >
          <CheckCircle size={18} /> Devoluciones ({data?.returns.length || 0})
        </button>
        <button 
          className={`tab-button ${activeTab === 'maintenances' ? 'active' : ''}`}
          onClick={() => setActiveTab('maintenances')}
        >
          <Calendar size={18} /> Mantenimientos ({data?.maintenances.length || 0})
        </button>
      </div>

      <div className="actas-list-container glass-card">
        {filteredDocs.length === 0 ? (
          <div className="empty-state">
            <p>No se encontraron actas en esta categoría.</p>
          </div>
        ) : (
          <table className="glass-table">
            <thead>
              <tr>
                <th>Nombre del Documento</th>
                <th>Fecha de Generación</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map((doc, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: '500', textTransform: 'capitalize' }}>{formatFilename(doc.filename)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                      {new Date(doc.date).toLocaleString()}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <a 
                      href={`${API_URL}${doc.url}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="download-btn"
                    >
                      <FileDown size={16} /> Ver / Descargar
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

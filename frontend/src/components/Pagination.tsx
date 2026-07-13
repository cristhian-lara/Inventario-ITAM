import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalItems, itemsPerPage, onPageChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  if (totalPages <= 1) return null;

  const from = (currentPage - 1) * itemsPerPage + 1;
  const to = Math.min(totalItems, currentPage * itemsPerPage);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 4px 4px', flexWrap: 'wrap', gap: '10px' }}>
      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
        Mostrando {from}–{to} de {totalItems}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          className="btn-glass"
          style={{ padding: '6px 10px', display: 'flex', alignItems: 'center' }}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontSize: '13px', color: 'var(--text-main)' }}>
          Página {currentPage} de {totalPages}
        </span>
        <button
          type="button"
          className="btn-glass"
          style={{ padding: '6px 10px', display: 'flex', alignItems: 'center' }}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

/**
 * Exporta un arreglo de filas ya formateadas (strings) a un archivo .csv descargable.
 * El BOM UTF-8 asegura que Excel abra los acentos correctamente.
 */
export function downloadCsv(filenamePrefix: string, headers: string[], rows: string[][]): void {
  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filenamePrefix}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/** Escapa un valor para uso seguro dentro de una celda CSV (comillas dobles). */
export function csvCell(value: string | number | null | undefined): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

/**
 * Exporta un arreglo de objetos a CSV, mapeando cada uno a una fila mediante `mapRow`.
 */
export function exportToCSV<T>(filenamePrefix: string, headers: string[], data: T[], mapRow: (item: T) => (string | number | null | undefined)[]): void {
  if (!data || data.length === 0) return;
  const rows = data.map(item => mapRow(item).map(v => csvCell(v)));
  downloadCsv(filenamePrefix, headers, rows);
}

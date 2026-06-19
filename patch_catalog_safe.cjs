const fs = require('fs');

const file = 'frontend/src/pages/Catalog.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Insert paginated calculation right before `return (` of the component
// The component returns `<div className="catalog-page">`
const returnStatement = `  return (\n    <div className="catalog-page">`;
const paginatedLogic = `  const paginatedfilteredAssets = filteredAssets?.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);\n  const totalPages = Math.ceil((filteredAssets?.length || 0) / itemsPerPage);\n\n  return (\n    <div className="catalog-page">`;

if (content.includes(returnStatement) && !content.includes('paginatedfilteredAssets')) {
    content = content.replace(returnStatement, paginatedLogic);
}

// 2. Replace the map array
content = content.replace(/\{filteredAssets\?\.map/g, '{paginatedfilteredAssets?.map');

// 3. Add pagination controls below table
// We look for </table>\n        </div>
const tableEnd = `</table>\n        </div>`;
const paginationControls = `</table>\n        </div>\n        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', gap: '15px' }}>
            <button className="btn-glass" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Anterior</button>
            <span style={{ color: 'var(--text-muted)' }}>Página {currentPage} de {totalPages}</span>
            <button className="btn-glass" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Siguiente</button>
          </div>
        )}`;

if (content.includes(tableEnd) && !content.includes('Anterior</button>')) {
    content = content.replace(tableEnd, paginationControls);
}

fs.writeFileSync(file, content);
console.log('Fixed Catalog.tsx successfully!');

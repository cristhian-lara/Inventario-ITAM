const fs = require('fs');

const file = 'frontend/src/pages/Catalog.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add useState for pagination
if (!content.includes('const [currentPage, setCurrentPage]')) {
    content = content.replace(
        /(const \[searchTerm,\s*setSearchTerm\]\s*=\s*useState[^;]+;)/,
        `$1\n  const [currentPage, setCurrentPage] = useState(1);\n  const itemsPerPage = 10;\n  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterCategory, filterStatus, filterRisk]);`
    );
}

// 2. Add paginated calculation just after filteredAssets is declared and computed
// Let's find exactly the end of filteredAssets block:
//    String(asset.categoryId).toLowerCase().includes(searchTerm.toLowerCase());
//  });
const endOfFilter = `String(asset.categoryId).toLowerCase().includes(searchTerm.toLowerCase());\n  });`;
const paginatedLogic = `\n  const paginatedfilteredAssets = filteredAssets?.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);\n  const totalPages = Math.ceil((filteredAssets?.length || 0) / itemsPerPage);\n`;

if (!content.includes('paginatedfilteredAssets')) {
    content = content.replace(endOfFilter, endOfFilter + paginatedLogic);

    // 3. Replace mapping to use paginatedfilteredAssets
    content = content.replace(/{filteredAssets\?\.map/g, `{paginatedfilteredAssets?.map`);

    // 4. Add pagination controls after the table
    const paginationControls = `
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', gap: '15px' }}>
            <button className="btn-glass" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Anterior</button>
            <span style={{ color: 'var(--text-muted)' }}>Página {currentPage} de {totalPages}</span>
            <button className="btn-glass" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Siguiente</button>
          </div>
        )}
        `;
    content = content.replace(/<\/table>\s*<\/div>/, `</table>\n        </div>\n${paginationControls}`);
}

// Ensure useEffect is imported
if (!content.includes('useEffect')) {
    content = content.replace(/import React,\s*{?\s*useState\s*}?\s*from\s*'react';/, "import React, { useState, useEffect } from 'react';");
}

fs.writeFileSync(file, content);
console.log('Patched Catalog.tsx successfully!');

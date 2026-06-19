const fs = require('fs');

function patchFile(file, filterVars, arrayName, mapName) {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');

    // 1. Add useState for pagination
    if (!content.includes('const [currentPage, setCurrentPage]')) {
        content = content.replace(
            /(const \[searchTerm,\s*setSearchTerm\]\s*=\s*useState[^;]+;)/,
            `$1\n  const [currentPage, setCurrentPage] = useState(1);\n  const itemsPerPage = 10;`
        );
        
        // Ensure useEffect is used to reset page when filters change
        let deps = filterVars.join(', ');
        content = content.replace(
            /const \[currentPage, setCurrentPage\] = useState\(1\);\n  const itemsPerPage = 10;/,
            `const [currentPage, setCurrentPage] = useState(1);\n  const itemsPerPage = 10;\n  useEffect(() => { setCurrentPage(1); }, [${deps}]);`
        );
    }

    // 2. Add sliced array calculation right before the return statement of the component
    // We'll insert it right after the filtered array is declared, but it's usually inside the component.
    // Let's find "return (" which is the main render block. 
    // Actually, it's safer to find the `.map` and replace it, but we need `totalPages` too.
    
    // Instead of parsing perfectly, let's just do it directly where map occurs!
    const paginatedName = `paginated${arrayName}`;
    const totalPagesStr = `Math.ceil((${arrayName}?.length || 0) / itemsPerPage)`;

    if (!content.includes(`const ${paginatedName} = `)) {
        // Find where the map is
        const mapRegex = new RegExp(`{(${arrayName}\\?\\.map\\(.*\\)[\\s\\S]*?)}`, 'g');
        
        // We'll insert the slice logic right in the JSX before the table tbody? No, JSX is tricky.
        // Let's insert before `return (`
        // Wait, multiple `return (` can exist. 
        // Let's just find the first `return (` that returns `<div className="${file.includes('Catalog')?'catalog-page':file.includes('Collaborators')?'catalog-page':'catalog-page'}"`
        // Actually, Catalog uses `<div className="catalog-page">`
        
        content = content.replace(
            /return \(\s*<div className="/,
            `const ${paginatedName} = ${arrayName}?.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);\n  const totalPages = Math.ceil((${arrayName}?.length || 0) / itemsPerPage);\n\n  return (\n    <div className="`
        );

        content = content.replace(
            new RegExp(`{${arrayName}\\?\\.map`, 'g'),
            `{${paginatedName}?.map`
        );

        // Append Pagination controls after the table
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
    
    // Fix imports if useEffect is not imported
    if (!content.includes('useEffect')) {
        content = content.replace(/import React,\s*{?\s*useState\s*}?\s*from\s*'react';/, "import React, { useState, useEffect } from 'react';");
    }

    fs.writeFileSync(file, content);
    console.log('Patched', file);
}

patchFile('frontend/src/pages/Catalog.tsx', ['searchTerm', 'filterCategory', 'filterStatus', 'filterRisk'], 'filteredAssets', 'filteredAssets');
patchFile('frontend/src/pages/Collaborators.tsx', ['searchTerm', 'filterRole', 'filterStatus'], 'filteredCollabs', 'filteredCollabs');
patchFile('frontend/src/pages/Maintenances.tsx', ['searchTerm', 'filterStatus', 'filterType'], 'filteredMaint', 'filteredMaint');

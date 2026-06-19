const fs = require('fs');

function paginate(filePath, componentName, arrayName, deps) {
    if (!fs.existsSync(filePath)) return;
    let lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

    // 1. Add state variables at the beginning of the component
    const componentStartIdx = lines.findIndex(l => l.includes(`export default function ${componentName}() {`));
    if (componentStartIdx !== -1 && !lines.some(l => l.includes('const [currentPage'))) {
        lines.splice(componentStartIdx + 1, 0, 
            `  const [currentPage, setCurrentPage] = useState(1);`,
            `  const itemsPerPage = 10;`,
            `  useEffect(() => { setCurrentPage(1); }, [${deps.join(', ')}]);`
        );
    }

    // Ensure useEffect is imported
    const importIdx = lines.findIndex(l => l.includes("from 'react'"));
    if (importIdx !== -1 && !lines[importIdx].includes('useEffect')) {
        lines[importIdx] = lines[importIdx].replace('useState', 'useState, useEffect');
    }

    // 2. Find where the array map starts inside tbody
    const mapStartIdx = lines.findIndex(l => l.includes(`{${arrayName}?.map((`));
    if (mapStartIdx !== -1) {
        lines[mapStartIdx] = lines[mapStartIdx].replace(
            `{${arrayName}?.map((`, 
            `{${arrayName}?.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((`
        );
    }

    // 3. Find where the table ends
    const tableEndIdx = lines.findIndex(l => l.includes('</table>'));
    if (tableEndIdx !== -1 && !lines.some(l => l.includes('Siguiente</button>'))) {
        const paginationBlock = `
        {Math.ceil((${arrayName}?.length || 0) / itemsPerPage) > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', gap: '15px' }}>
            <button className="btn-glass" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>Anterior</button>
            <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              Página {currentPage} de {Math.ceil((${arrayName}?.length || 0) / itemsPerPage)}
            </span>
            <button className="btn-glass" disabled={currentPage === Math.ceil((${arrayName}?.length || 0) / itemsPerPage)} onClick={() => setCurrentPage(p => p + 1)}>Siguiente</button>
          </div>
        )}`;
        lines.splice(tableEndIdx + 1, 0, paginationBlock);
    }

    fs.writeFileSync(filePath, lines.join('\n'));
    console.log(`Patched ${filePath}`);
}

paginate('frontend/src/pages/Catalog.tsx', 'Catalog', 'filteredAssets', ['searchTerm', 'filterCategory', 'filterStatus', 'filterRisk']);
paginate('frontend/src/pages/Collaborators.tsx', 'Collaborators', 'filteredCollabs', ['searchTerm', 'filterRole', 'filterStatus']);
paginate('frontend/src/pages/Maintenances.tsx', 'Maintenances', 'filteredMaint', ['searchTerm', 'filterStatus', 'filterType']);

const fs = require('fs');

function fixFile(file, validDeps, searchAnchor) {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');

    // Remove from top
    const badRegex = /  const \[currentPage, setCurrentPage\] = useState\(1\);\r?\n  const itemsPerPage = 10;\r?\n  useEffect\(\(\) => \{ setCurrentPage\(1\); \}, \[[^\]]+\]\);\r?\n/;
    content = content.replace(badRegex, '');

    // Insert correctly after searchAnchor
    if (searchAnchor) {
        // If we successfully removed it, we add it back after searchAnchor
        const safeInsert = `\n  const [currentPage, setCurrentPage] = useState(1);\n  const itemsPerPage = 10;\n  useEffect(() => { setCurrentPage(1); }, [${validDeps.join(', ')}]);`;
        content = content.replace(searchAnchor, searchAnchor + safeInsert);
    }
    
    fs.writeFileSync(file, content);
    console.log('Fixed TDZ in', file);
}

fixFile('frontend/src/pages/Catalog.tsx', ['searchTerm', 'filterCategory', 'filterStatus', 'filterRisk'], "const [searchTerm, setSearchTerm] = useState('');");
fixFile('frontend/src/pages/Collaborators.tsx', ['searchTerm'], "const [searchTerm, setSearchTerm] = useState('');");
fixFile('frontend/src/pages/Maintenances.tsx', ['searchTerm'], "const [searchTerm, setSearchTerm] = useState('');");

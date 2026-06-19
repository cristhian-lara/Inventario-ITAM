const fs = require('fs');

function injectActionMenu(file, findDiv, endDivTag) {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');

    // Add import
    if (!content.includes('ActionMenu')) {
        const importIdx = content.indexOf('import { Link } from');
        if (importIdx !== -1) {
            content = content.slice(0, importIdx) + "import ActionMenu from '../components/ActionMenu';\n" + content.slice(importIdx);
        } else {
            const firstImport = content.indexOf('import');
            content = content.slice(0, firstImport) + "import ActionMenu from '../components/ActionMenu';\n" + content.slice(firstImport);
        }
    }

    // Replace <div ...> wrapper with <ActionMenu>
    // Note: since the div content might span multiple lines and have internal divs, 
    // a regex replacement is risky if we replace the wrong closing </div>.
    // However, in these files the action div is exactly inside the last <td> of the row.
    
    // For Catalog:
    // <td>
    //   <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
    //     ... buttons ...
    //   </div>
    // </td>
    
    // A safer way is to replace `<div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>`
    // with `<ActionMenu>` and then find the corresponding `</div>` right before `</td>` and replace with `</ActionMenu>`.
    
    if (content.includes(findDiv)) {
        content = content.replace(findDiv, '<ActionMenu>');
        content = content.replace(/<\/div>\s*<\/td>/g, '</ActionMenu>\n                  </td>');
    }

    fs.writeFileSync(file, content);
    console.log('Injected ActionMenu in', file);
}

// In Catalog.tsx
injectActionMenu(
    'src/pages/Catalog.tsx',
    "<div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>",
    "</div>"
);

// In Collaborators.tsx
injectActionMenu(
    'src/pages/Collaborators.tsx',
    '<div className="actions-container">',
    "</div>"
);

// In Maintenances.tsx
injectActionMenu(
    'src/pages/Maintenances.tsx',
    "<div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>",
    "</div>"
);

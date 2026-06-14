const fs = require('fs');

let content = fs.readFileSync('frontend/src/pages/Catalog.tsx', 'utf8');

// 2. Change import
content = content.replace("import { Plus, Search, Tag, Cpu, HardDrive, Wifi, PlusCircle, MonitorSmartphone, RefreshCw, CheckCircle2, AlertCircle, AlertTriangle, UserCheck, Send, Upload } from 'lucide-react';",
"import { Plus, Search, Tag, Cpu, HardDrive, Wifi, PlusCircle, MonitorSmartphone, RefreshCw, CheckCircle2, AlertCircle, AlertTriangle, UserCheck, Send, Upload, Trash2 } from 'lucide-react';");

// 3. Headers
content = content.replace('<th>Serial</th>', '<th>Asignado a (Correo)</th>');

// 4. Row category + email
content = content.replace(
  `                  <td>
                    <span className="badge badge-category">
                      <Tag size={12} /> {asset.categoryId}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{asset.serial}</td>`,
  `                  <td>
                    <span className="badge badge-category">
                      <Tag size={12} /> {categories?.find((c: any) => c.id === Number(asset.categoryId))?.name || asset.categoryId}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {(() => {
                      const activeAssignment = getActiveAssignmentForAsset(asset.id);
                      if (activeAssignment && activeAssignment.collaboratorId) {
                        const coll = collaborators?.find(c => c.id === activeAssignment.collaboratorId);
                        return coll ? (
                          <Link to={\`/collaborators/\${activeAssignment.collaboratorId}\`} style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: '500' }}>
                            {coll.email}
                          </Link>
                        ) : 'Sin asignar';
                      }
                      return 'Sin asignar';
                    })()}
                  </td>`
);

// 5. Specs cell (Add Serial)
content = content.replace(
  `<td className="specs-cell">
                    {Object.entries(asset.dynamicAttributes || {}).map(([key, value]) => {`,
  `<td className="specs-cell">
                    <span className="spec-tag" title="Serial">
                      <HardDrive size={12} /> {asset.serial || 'N/A'}
                    </span>
                    {Object.entries(asset.dynamicAttributes || {}).map(([key, value]) => {`
);

// 6. Fix "En uso por: Ver perfil" 
content = content.replace(/\{asset\.status === 'IN_USE' && \([\s\S]*?En uso por:[\s\S]*?Ver perfil[\s\S]*?<\/Link>[\s\S]*?\) : \([\s\S]*?<span[^>]*>Asignado<\/span>[\s\S]*?\)\}[\s\S]*?<\/div>[\s\S]*?\)\}/g, '');

// 7. Fix buttons and `td` container
content = content.replace(
  `<td style={{ display: 'flex', gap: '8px' }}>`,
  `<td>\n                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>`
);

// Close the div before closing the td
// Find:
//                      </button>
//                    )}
//                  </td>
//                </tr>
//              ))}
// Use regex to be resilient to spaces/newlines
const closingRegex = /<\/button>\s*?}\)\s*?}\s*?\{asset\.status !== 'RETIRED' && \([\s\S]*?<\/button>\s*\)\}\s*<\/td>/;
if (closingRegex.test(content)) {
    content = content.replace(closingRegex, (match) => {
        return match.replace('</td>', '</div>\n                  </td>');
    });
} else {
    console.error("COULD NOT FIND CLOSING TD");
}

// 8. Remove text from buttons
content = content.replace(/<AlertTriangle size=\{16\} \/> Forzar Firma/g, '<AlertTriangle size={16} />');
content = content.replace(/<RefreshCw size=\{16\} \/> Reenviar/g, '<RefreshCw size={16} />');
content = content.replace(/<PlusCircle size=\{16\} \/> Asignar/g, '<PlusCircle size={16} />');
content = content.replace(/<RefreshCw size=\{16\} \/> Devolver/g, '<RefreshCw size={16} />');
content = content.replace(/<AlertTriangle size=\{16\} \/> Forzar/g, '<AlertTriangle size={16} />');

// 9. Change Baja icon to Trash2
content = content.replace(/<AlertTriangle size=\{16\} \/> Baja/g, '<Trash2 size={16} />');

fs.writeFileSync('frontend/src/pages/Catalog.tsx', content);
console.log('Done script execution');

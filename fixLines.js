const fs = require('fs');
const file = 'frontend/src/pages/Catalog.tsx';
let c = fs.readFileSync(file, 'utf8');

// 1. Add Trash2 to imports if not there
if (!c.includes('Trash2')) {
  c = c.replace(/import \{([^}]+)\} from 'lucide-react';/, (match, p1) => {
    return `import {${p1}, Trash2} from 'lucide-react';`;
  });
}

// 2. Wrap the buttons in a div
c = c.replace(/<td style=\{\{ display: 'flex', gap: '8px' \}\}>/g, `<td>\n                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>`);

// 3. Close the div at the end of that td
c = c.replace(/<\/button>\s*\)\}\s*<\/td>\s*<\/tr>\s*\)\)\}/, `</button>
                    )}
                    </div>
                  </td>
                </tr>
              ))}`);

// 4. Remove labels from buttons
c = c.replace(/<AlertTriangle size=\{16\} \/> Forzar Firma/g, '<AlertTriangle size={16} />');
c = c.replace(/<RefreshCw size=\{16\} \/> Reenviar/g, '<RefreshCw size={16} />');
c = c.replace(/<PlusCircle size=\{16\} \/> Asignar/g, '<PlusCircle size={16} />');
c = c.replace(/<RefreshCw size=\{16\} \/> Devolver/g, '<RefreshCw size={16} />');
c = c.replace(/<AlertTriangle size=\{16\} \/> Forzar/g, '<AlertTriangle size={16} />');

// 5. Change Baja to Trash2
c = c.replace(/<AlertTriangle size=\{16\} \/> Baja/g, '<Trash2 size={16} />');

fs.writeFileSync(file, c);
console.log('Fixed');

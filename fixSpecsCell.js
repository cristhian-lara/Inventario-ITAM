const fs = require('fs');
const file = 'frontend/src/pages/Catalog.tsx';
let c = fs.readFileSync(file, 'utf8');

// Fix 1: Wrap specs-cell content in a div.specs-cell-inner
// Change: <td className="specs-cell"> ... to use inner wrapper
c = c.replace(
  '<td className="specs-cell">\n                    <span className="spec-tag" title="Serial">',
  '<td className="specs-cell"><div className="specs-cell-inner">\n                    <span className="spec-tag" title="Serial">'
);

// Close the inner wrapper before </td> for specs-cell
// Find the closing pattern after the specs section
c = c.replace(
  '                  </td>\r\n                  <td>\n                    <div style={{ display: \'flex\', gap: \'8px\', alignItems: \'center\' }}>',
  '                  </div></td>\r\n                  <td>\n                    <div style={{ display: \'flex\', gap: \'8px\', alignItems: \'center\' }}>'
);

fs.writeFileSync(file, c);
console.log('Fixed specs-cell inner wrapper');

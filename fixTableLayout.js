const fs = require('fs');
const file = 'frontend/src/pages/Catalog.tsx';
let c = fs.readFileSync(file, 'utf8');

// =====================================================
// FIX 1: Wrap specs-cell td content in a div.specs-cell-inner
// The specs-cell td goes from:
//   <td className="specs-cell">
//     <span ...serial...
//     ...dynamic attrs...
//     ...purchase date...
//     ...depreciation...
//   </td>
// To:
//   <td className="specs-cell">
//     <div className="specs-cell-inner">
//       ... (same content)
//     </div>
//   </td>
// =====================================================

// Open wrapper after <td className="specs-cell">
c = c.replace(
  '<td className="specs-cell">\n                    <span className="spec-tag" title="Serial">',
  '<td className="specs-cell">\n                    <div className="specs-cell-inner">\n                    <span className="spec-tag" title="Serial">'
);

// Close wrapper before the </td> that comes after depreciation
// The section ends with:  })() : null}\n                  </td>\n                  <td>\n                    {(() => {\n                      const activeAssignment = getActiveAssignmentForAsset(asset.id);\n                      if (activeAssignment?.status === 'PENDING_ACCEPTANCE') {
const oldEnd = `                    })() : null}\r\n                  </td>\r\n                  <td>\r\n                    {(() => {`;
const newEnd = `                    })() : null}\r\n                    </div>\r\n                  </td>\r\n                  <td>\r\n                    {(() => {`;

if (c.includes(oldEnd)) {
  c = c.replace(oldEnd, newEnd);
  console.log('Closed specs-cell-inner div (CRLF version)');
} else {
  // Try LF version
  const oldEndLF = `                    })() : null}\n                  </td>\n                  <td>\n                    {(() => {`;
  const newEndLF = `                    })() : null}\n                    </div>\n                  </td>\n                  <td>\n                    {(() => {`;
  if (c.includes(oldEndLF)) {
    c = c.replace(oldEndLF, newEndLF);
    console.log('Closed specs-cell-inner div (LF version)');
  } else {
    console.log('WARNING: Could not find closing pattern. Trying mixed...');
    // Try finding it with a regex
    c = c.replace(
      /([ \t]+\}\)\(\) : null\}[\r\n]+)([ \t]+<\/td>[\r\n]+[ \t]+<td>[\r\n]+[ \t]+\{\(\(\) => \{)/,
      '$1                    </div>\r\n$2'
    );
    console.log('Applied regex fallback');
  }
}

// =====================================================
// FIX 2: Remove "Asignado a (Correo)" header column text
// and fix the action td to NOT have display:flex inline on td
// The action cell already has a div wrapper, so no fix needed there.
// =====================================================

// =====================================================
// FIX 3: Fix the header - change "Serial" column header to "Asignado a (Correo)"
// since we moved Serial to specs and now show email in that column
// =====================================================
c = c.replace('<th>Serial</th>', '<th>Asignado a (Correo)</th>');

fs.writeFileSync(file, c);
console.log('Done!');

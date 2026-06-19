const fs = require('fs');
const file = 'frontend/src/index.css';
let content = fs.readFileSync(file, 'utf8');

// Remove the mobile-only table rules to avoid confusion
content = content.replace(/\/\* Tables: allow horizontal scroll on small screens \*\/[\s\S]*?\.glass-table\s*{\s*min-width:\s*600px;\s*}/, '');

// Append global table responsive styles
content += `
/* ══════════════════════════════════════════════
   GLOBAL TABLE RESPONSIVENESS
   ══════════════════════════════════════════════ */
.table-responsive {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.glass-table {
  min-width: 900px;
}
`;

fs.writeFileSync(file, content);
console.log('Successfully patched index.css with global table responsiveness!');

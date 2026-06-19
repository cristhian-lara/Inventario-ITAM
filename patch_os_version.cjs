const fs = require('fs');
const file = 'src/api/routes/assignment.routes.ts';
let content = fs.readFileSync(file, 'utf8');

// Inject the exact key "Versión OS" with accent
content = content.replace(/asset\.dynamicAttributes\['Sistema Operativo'\]/g, "asset.dynamicAttributes['Versión OS'] || asset.dynamicAttributes['Sistema Operativo']");

fs.writeFileSync(file, content);
console.log('Successfully patched Versión OS with accent!');

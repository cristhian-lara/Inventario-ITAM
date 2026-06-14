const fs = require('fs');
const file = 'frontend/src/pages/Catalog.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  "return assignments?.find((a: any) => a.assetId === assetId && a.status === 'ACCEPTED');",
  "return assignments?.find((a: any) => a.assetId === assetId && ['ACCEPTED', 'PENDING_ACCEPTANCE', 'PENDING_RETURN'].includes(a.status));"
);

fs.writeFileSync(file, c);
console.log('Fixed assignment filter');

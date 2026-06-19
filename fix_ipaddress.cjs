const fs = require('fs');
const file = 'src/api/routes/assignment.routes.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/ipAddress,,/g, 'ipAddress,');
fs.writeFileSync(file, content);
console.log('Fixed double comma!');

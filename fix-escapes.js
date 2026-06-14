const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'frontend', 'src', 'pages');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  if (content.includes('\\${API_URL}')) {
    content = content.replace(/\\\$\{API_URL\}/g, '${API_URL}');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed ${file}`);
  }
}

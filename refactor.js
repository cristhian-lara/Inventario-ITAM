const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'frontend', 'src', 'pages');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  if (content.includes('http://localhost:3000')) {
    const importStr = "import { API_URL } from '../config';\n";
    
    if (!content.includes("from '../config'")) {
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const nextLineIndex = content.indexOf('\n', lastImportIndex);
        content = content.slice(0, nextLineIndex + 1) + importStr + content.slice(nextLineIndex + 1);
      } else {
        content = importStr + content;
      }
    }

    // Replace string literals: 'http://localhost:3000/api...'
    content = content.replace(/'http:\/\/localhost:3000([^']*)'/g, "`\\${API_URL}$1`");
    // Replace template literals: `http://localhost:3000/api...`
    content = content.replace(/`http:\/\/localhost:3000([^`]*)`/g, "`\\${API_URL}$1`");

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}

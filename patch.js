const fs = require('fs');
const file = 'frontend/src/pages/Catalog.tsx';
let c = fs.readFileSync(file, 'utf8');
// Find the exact spot to insert </div>
// It's the </td> right before </tr> \n ))}
// We can use a regex:
c = c.replace(/<\/button>\s*\)\}\s*<\/td>\s*<\/tr>\s*\)\)\}/, 
`</button>
                    )}
                    </div>
                  </td>
                </tr>
              ))}`);
fs.writeFileSync(file, c);

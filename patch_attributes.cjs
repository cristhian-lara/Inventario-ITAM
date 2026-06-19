const fs = require('fs');

const routeFile = 'src/api/routes/assignment.routes.ts';
let routeContent = fs.readFileSync(routeFile, 'utf8');

// Replace .modelo with fallbacks
routeContent = routeContent.replace(/asset\.dynamicAttributes\.modelo/g, "(asset.dynamicAttributes.modelo || asset.dynamicAttributes.Modelo)");

// Replace .macAddress with fallbacks
routeContent = routeContent.replace(/asset\.dynamicAttributes\.macAddress/g, "(asset.dynamicAttributes.macAddress || asset.dynamicAttributes.MacAddress || asset.dynamicAttributes.MAC || asset.dynamicAttributes['MAC Address'])");

// Replace .ram with fallbacks
routeContent = routeContent.replace(/asset\.dynamicAttributes\.ram/g, "(asset.dynamicAttributes.ram || asset.dynamicAttributes.RAM || asset.dynamicAttributes.Ram || asset.dynamicAttributes['Memoria RAM'])");

// Replace .processor with fallbacks
routeContent = routeContent.replace(/asset\.dynamicAttributes\.processor/g, "(asset.dynamicAttributes.processor || asset.dynamicAttributes.Processor || asset.dynamicAttributes.Procesador || asset.dynamicAttributes.procesador)");

// Replace .storage with fallbacks
routeContent = routeContent.replace(/asset\.dynamicAttributes\.storage/g, "(asset.dynamicAttributes.storage || asset.dynamicAttributes.Storage || asset.dynamicAttributes.Almacenamiento || asset.dynamicAttributes.Disco)");

fs.writeFileSync(routeFile, routeContent, 'utf8');

const pdfFile = 'src/shared/infrastructure/services/PdfKitService.ts';
let pdfContent = fs.readFileSync(pdfFile, 'utf8');

pdfContent = pdfContent.replace(/asset\?\.dynamicAttributes\?\.modelo \|\| asset\?\.dynamicAttributes\?\.model/g, "asset?.dynamicAttributes?.modelo || asset?.dynamicAttributes?.model || asset?.dynamicAttributes?.Modelo || asset?.dynamicAttributes?.Model");
pdfContent = pdfContent.replace(/asset\?\.dynamicAttributes\?\.marca \|\| asset\?\.dynamicAttributes\?\.brand/g, "asset?.dynamicAttributes?.marca || asset?.dynamicAttributes?.brand || asset?.dynamicAttributes?.Marca || asset?.dynamicAttributes?.Brand");

fs.writeFileSync(pdfFile, pdfContent, 'utf8');
console.log('Patched assignment routes and PDF kit to handle capitalized dynamic attributes!');

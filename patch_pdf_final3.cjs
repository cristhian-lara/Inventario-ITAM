const fs = require('fs');
const file = 'src/shared/infrastructure/services/PdfKitService.ts';
let content = fs.readFileSync(file, 'utf8');

// Fix AssignmentAct
content = content.replace(
    /async generateAssignmentAct\s*\(\s*data:\s*AssignmentDocumentData\s*\)\s*:\s*Promise<string>\s*\{\s*return new Promise\(\(resolve,\s*reject\)\s*=>\s*\{\s*try/g,
    "async generateAssignmentAct(data: AssignmentDocumentData): Promise<string> {\n        return new Promise(async (resolve, reject) => {\n            try"
);

// Fix MaintenanceAct
content = content.replace(
    /async generateMaintenanceAct.*?Promise<string>\s*\{\s*return new Promise\(\(resolve,\s*reject\)\s*=>\s*\{\s*try/g,
    "async generateMaintenanceAct(record: any, asset: any, signatureBase64: string, categoryName?: string): Promise<string> {\n        return new Promise(async (resolve, reject) => {\n            try"
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed async promise executors in PdfKitService.ts!');

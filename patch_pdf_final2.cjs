const fs = require('fs');
const file = 'src/shared/infrastructure/services/PdfKitService.ts';
let content = fs.readFileSync(file, 'utf8');

// 1. Add imports
if (!content.includes('AppDataSource')) {
    content = content.replace(
        "import * as fs from 'fs';",
        "import * as fs from 'fs';\nimport { AppDataSource } from '../database/postgres';\nimport { SettingEntity } from '../../../modules/settings/infrastructure/orm/Setting.entity';"
    );
}

// 2. Make generateAssignmentAct promise executor async
content = content.replace(
    /public async generateAssignmentAct.*?Promise.*?\{\s*return new Promise\(\(resolve,\s*reject\)\s*=>\s*\{\s*try\s*\{/s,
    "public async generateAssignmentAct(data: AssignmentDocumentData): Promise<string> {\n        return new Promise(async (resolve, reject) => {\n            try {"
);

// 3. Inject custom logic into generateAssignmentAct
content = content.replace(
    /const legalText = data\.actType === 'RETURN' \? legalTextReturn : legalTextAssignment;\s*doc\.text\(legalText, { align: 'justify', lineGap: 5 }\);/s,
    `let customText = null;
                try {
                    const settingRepo = AppDataSource.getRepository(SettingEntity);
                    const key = data.actType === 'RETURN' ? 'ACTA_DEVOLUCION_TEXT' : 'ACTA_ASIGNACION_TEXT';
                    const setting = await settingRepo.findOneBy({ key });
                    if (setting && setting.value) customText = setting.value;
                } catch(e) { console.error('Error fetching custom text:', e); }

                const legalText = customText || (data.actType === 'RETURN' ? legalTextReturn : legalTextAssignment);
                doc.text(legalText, { align: 'justify', lineGap: 5 });`
);

// 4. Make generateMaintenanceAct promise executor async
content = content.replace(
    /public async generateMaintenanceAct.*?Promise.*?\{\s*return new Promise\(\(resolve,\s*reject\)\s*=>\s*\{\s*try\s*\{/s,
    "public async generateMaintenanceAct(record: any, asset: any, signatureBase64: string, categoryName?: string): Promise<string> {\n        return new Promise(async (resolve, reject) => {\n            try {"
);

// 5. Inject custom logic into generateMaintenanceAct
content = content.replace(
    /const legalText = `Por medio de la presente, confirmo que he recibido.*?servicio programado.`;\s*doc\.text\(legalText, { align: 'justify', lineGap: 5 }\);/s,
    `const defaultLegalText = \`Por medio de la presente, confirmo que he recibido de vuelta mi equipo y certifico que el servicio de mantenimiento detallado en la página anterior se ha realizado satisfactoriamente. Entiendo que debo notificar inmediatamente al área de Tecnología de la Información en caso de presentarse anomalías recurrentes relacionadas con este servicio.\\n\\nEl usuario certifica que al momento de la devolución, el equipo es operativo de acuerdo a lo expresado en los detalles técnicos de este acta, dándose por concluido el servicio programado.\`;

                let customText = null;
                try {
                    const settingRepo = AppDataSource.getRepository(SettingEntity);
                    const setting = await settingRepo.findOneBy({ key: 'ACTA_MANTENIMIENTO_TEXT' });
                    if (setting && setting.value) customText = setting.value;
                } catch(e) { console.error('Error fetching custom text:', e); }

                const legalText = customText || defaultLegalText;
                doc.text(legalText, { align: 'justify', lineGap: 5 });`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Patched PdfKitService.ts correctly this time!');

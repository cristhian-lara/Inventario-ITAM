const fs = require('fs');
const file = 'src/api/routes/assignment.routes.ts';
let content = fs.readFileSync(file, 'utf8');

// Inject the import and instantiation of departmentRepo
if (!content.includes('PostgresDepartmentRepository')) {
    content = content.replace(
        "import { PostgresCollaboratorRepository } from '../../modules/collaborator/infrastructure/PostgresCollaboratorRepository';",
        "import { PostgresCollaboratorRepository } from '../../modules/collaborator/infrastructure/PostgresCollaboratorRepository';\nimport { PostgresDepartmentRepository } from '../../modules/collaborator/infrastructure/PostgresDepartmentRepository';"
    );
    content = content.replace(
        "const collaboratorRepo = new PostgresCollaboratorRepository();",
        "const collaboratorRepo = new PostgresCollaboratorRepository();\nconst departmentRepo = new PostgresDepartmentRepository();"
    );
}

// Fix ceco
content = content.replace(/collaborator\.dynamicAttributes\['CECO'\]/g, "collaborator.dynamicAttributes['CECOS'] || collaborator.dynamicAttributes['cecos'] || collaborator.dynamicAttributes['CECO']");

// Fix OS Version
content = content.replace(/asset\.dynamicAttributes\['Sistema Operativo'\]/g, "asset.dynamicAttributes['Sistema Operativo'] || asset.dynamicAttributes['Sistema operativo'] || asset.dynamicAttributes['SistemaOperativo'] || asset.dynamicAttributes['OS'] || asset.dynamicAttributes['os']");

// Fix Department fetching
// We replace `const realDept = collaborator \? collaborator\.department\.toString\(\) : 'Sistemas';`
// with a database fetch.
content = content.replace(
    /const realDept = collaborator \? collaborator\.department\.toString\(\) : 'Sistemas';/g,
    `let realDept = 'Sistemas';
        if (collaborator && collaborator.department) {
            try {
                const dept = await departmentRepo.findById(Number(collaborator.department));
                if (dept) realDept = dept.name;
                else realDept = collaborator.department.toString();
            } catch(e) {
                realDept = collaborator.department.toString();
            }
        }`
);

fs.writeFileSync(file, content);
console.log('Successfully patched Department, CECO, and OS Version logic!');

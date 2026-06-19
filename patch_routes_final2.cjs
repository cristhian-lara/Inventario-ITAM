const fs = require('fs');

const routeFile = 'src/api/routes/assignment.routes.ts';
let content = fs.readFileSync(routeFile, 'utf8');

let count = 0;
content = content.replace(
    /const documentPath = await documentService\.generateAssignmentAct\(\{[\s\S]*?\}\);/g,
    (match) => {
        count++;
        
        let assignmentVar = 'acceptedAssignment';
        if (match.includes('returnedAssignment.id')) assignmentVar = 'returnedAssignment';
        else if (match.includes('assignment.id')) assignmentVar = 'assignment';

        let actType = "'ASSIGNMENT'";
        if (match.includes("'RETURN'")) actType = "'RETURN'";

        // Attempt to extract ipAddress line to preserve it if it exists
        let ipAddressLine = "ipAddress: typeof ipAddress !== 'undefined' ? ipAddress : 'unknown'";
        if (match.includes('ipAddress,')) {
            ipAddressLine = 'ipAddress,';
        } else if (match.includes('ipAddress:')) {
            const ipMatch = match.match(/ipAddress:\s*([^,]+),/);
            if (ipMatch) ipAddressLine = `ipAddress: ${ipMatch[1]}`;
        }

        return `const collaborator = await collaboratorRepo.findById(${assignmentVar}.collaboratorId);
        const ceco = collaborator && collaborator.dynamicAttributes ? collaborator.dynamicAttributes['CECO'] || 'N/A' : 'N/A';
        const sede = collaborator ? collaborator.location : 'N/A';
        const realColName = collaborator ? collaborator.name : ${assignmentVar}.collaboratorId;
        const realColEmail = collaborator ? collaborator.email : 'test@ikusi.com';
        const realDept = collaborator ? collaborator.department.toString() : 'Sistemas';

        const documentPath = await documentService.generateAssignmentAct({
            actType: ${actType},
            assignmentId: ${assignmentVar}.id,
            collaboratorName: realColName,
            collaboratorEmail: realColEmail,
            department: realDept,
            ceco: ceco,
            sede: sede,
            assetId: ${assignmentVar}.assetId,
            assetSerial: asset ? (asset.serial || 'N/A') : 'N/A',
            assetType: category ? category.name : 'Laptop',
            assetBrand: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.marca || asset.dynamicAttributes.Marca || asset.dynamicAttributes.brand || asset.dynamicAttributes.Brand) || 'Generico' : 'Generico',
            assetHostname: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.hostname || asset.dynamicAttributes.Hostname) || 'N/A' : 'N/A',
            assetVersionOs: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.versionOs || asset.dynamicAttributes.VersionOS || asset.dynamicAttributes['Version OS'] || asset.dynamicAttributes['Sistema Operativo']) || 'N/A' : 'N/A',
            assetModel: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.modelo || asset.dynamicAttributes.Modelo) || 'Generico' : 'Generico',
            assetMac: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.macAddress || asset.dynamicAttributes.MacAddress || asset.dynamicAttributes.MAC || asset.dynamicAttributes['MAC Address']) || 'N/A' : 'N/A',
            assetRam: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.ram || asset.dynamicAttributes.RAM || asset.dynamicAttributes.Ram || asset.dynamicAttributes['Memoria RAM']) || 'N/A' : 'N/A',
            assetProcessor: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.processor || asset.dynamicAttributes.Processor || asset.dynamicAttributes.Procesador || asset.dynamicAttributes.procesador) || 'N/A' : 'N/A',
            assetStorage: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.storage || asset.dynamicAttributes.Storage || asset.dynamicAttributes.Almacenamiento || asset.dynamicAttributes.Disco) || 'N/A' : 'N/A',
            requiresPlacaIkusi: typeof requiresPlaca !== 'undefined' ? requiresPlaca : true,
            ${ipAddressLine},
            timestamp: new Date(),
            isForcedSignature: req.path.includes('force') ? true : false,
            signatureEmail: req.body && req.body.email ? req.body.email : realColEmail
        });`;
    }
);

fs.writeFileSync(routeFile, content, 'utf8');
console.log('Successfully replaced ' + count + ' instances!');

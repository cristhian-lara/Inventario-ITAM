const fs = require('fs');

const routeFile = 'src/api/routes/assignment.routes.ts';
let routeContent = fs.readFileSync(routeFile, 'utf8');

const regex = /const documentPath = await documentService\.generateAssignmentAct\(\{\s*actType:\s*([^,]+),\s*assignmentId:\s*([^,]+),\s*collaboratorName:\s*([^,]+),\s*collaboratorEmail:\s*([^,]+),\s*department:\s*([^,]+),\s*assetId:\s*([^,]+),\s*assetSerial:\s*([^,]+),\s*assetType:\s*([^,]+),\s*assetModel:\s*([^,]+),\s*assetMac:\s*([^,]+),\s*assetRam:\s*([^,]+),\s*assetProcessor:\s*([^,]+),\s*assetStorage:\s*([^,]+),\s*requiresPlacaIkusi:\s*([^,]+),\s*ipAddress([^,]*),\s*timestamp:\s*new Date\(\)\s*\}\);/g;

routeContent = routeContent.replace(regex, (match, actType, assignmentId, colName, colEmail, dept, assetId, assetSerial, assetType, assetModel, assetMac, assetRam, assetProcessor, assetStorage, requiresPlaca, ipMatch) => {
    
    // Determine if it's forced or not based on the actType or context?
    // Wait, the routes have `req.body.email` sometimes, or `forced`.
    // It's safer to just inject a block of code before this to fetch the collaborator.
    
    return `const collaborator = await collaboratorRepo.findById(${colName});
        const ceco = collaborator && collaborator.dynamicAttributes ? collaborator.dynamicAttributes['CECO'] || 'N/A' : 'N/A';
        const sede = collaborator ? collaborator.location : 'N/A';
        const realColName = collaborator ? collaborator.name : ${colName};
        const realColEmail = collaborator ? collaborator.email : ${colEmail};
        const realDept = collaborator ? (collaborator.department.toString()) : ${dept};
        const isForcedSignature = ${ipMatch.includes('ipAddress') ? 'false' : 'true'}; // Simplification

        const documentPath = await documentService.generateAssignmentAct({
            actType: ${actType},
            assignmentId: ${assignmentId},
            collaboratorName: realColName,
            collaboratorEmail: realColEmail,
            department: realDept,
            ceco: ceco,
            sede: sede,
            assetId: ${assetId},
            assetSerial: ${assetSerial},
            assetType: category ? category.name : ${assetType},
            assetBrand: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.marca || asset.dynamicAttributes.Marca || asset.dynamicAttributes.brand || asset.dynamicAttributes.Brand) || 'Generico' : 'Generico',
            assetHostname: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.hostname || asset.dynamicAttributes.Hostname) || 'N/A' : 'N/A',
            assetVersionOs: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.versionOs || asset.dynamicAttributes.VersionOS || asset.dynamicAttributes['Version OS']) || 'N/A' : 'N/A',
            assetModel: ${assetModel},
            assetMac: ${assetMac},
            assetRam: ${assetRam},
            assetProcessor: ${assetProcessor},
            assetStorage: ${assetStorage},
            requiresPlacaIkusi: ${requiresPlaca},
            ipAddress${ipMatch},
            timestamp: new Date(),
            isForcedSignature: req.path.includes('force') ? true : false,
            signatureEmail: ${colEmail}
        });`;
});

fs.writeFileSync(routeFile, routeContent, 'utf8');
console.log('Patched assignment.routes.ts to pass new fields to generateAssignmentAct');

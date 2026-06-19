const fs = require('fs');

const file = 'src/shared/infrastructure/services/PdfKitService.ts';
let content = fs.readFileSync(file, 'utf8');

const regex = /async generateAssignmentAct.*?public async generateMaintenanceAct/s;

const newCode = `async generateAssignmentAct(data: AssignmentDocumentData): Promise<string> {
        return new Promise(async (resolve, reject) => {
            try {
                const doc = new PDFDocument({ margins: { top: 50, bottom: 180, left: 70, right: 50 }, size: 'A4', bufferPages: true });
                const prefix = data.actType === 'RETURN' ? 'pazysalvo' : 'acta';
                const fileName = \`\${prefix}-\${data.assignmentId}.pdf\`;
                const filePath = path.join(this.storageDir, fileName);
                
                const stream = fs.createWriteStream(filePath);
                doc.pipe(stream);

                const drawHeader = () => {
                    doc.fontSize(24).fillColor('#00a650').text('IKUSI', 70, 50, { continued: true });
                    doc.fontSize(14).fillColor('#999999').text(' velatia');
                    doc.moveDown(2);
                };

                drawHeader();

                const tableGeneral = {
                    title: 'Datos Generales',
                    headers: [{ label: 'Campo', property: 'c', width: 150 }, { label: 'Valor', property: 'v', width: 330 }],
                    datas: [
                        { c: 'Nombre de usuario', v: data.collaboratorName || 'N/A' },
                        { c: 'Correo electrónico', v: data.collaboratorEmail || 'N/A' },
                        { c: 'CECO', v: data.ceco || 'N/A' },
                        { c: 'Departamento', v: data.department || 'N/A' }
                    ]
                };

                await doc.table(tableGeneral, {
                    width: 480, x: 70, hideHeader: true,
                    prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10).fillColor('black'),
                    prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
                        doc.font('Helvetica').fontSize(9).fillColor('black');
                        if (indexColumn === 0) doc.font('Helvetica-Bold');
                    }
                });

                doc.moveDown(1);

                const tableAsignados = {
                    title: 'Activos Asignados',
                    headers: [
                        { label: 'Placa Ikusi', property: 'placa', width: 60 },
                        { label: 'Hostname', property: 'host', width: 70 },
                        { label: 'Categoria', property: 'cat', width: 70 },
                        { label: 'Marca', property: 'marca', width: 60 },
                        { label: 'Serial', property: 'serial', width: 80 },
                        { label: 'Modelo', property: 'modelo', width: 80 },
                        { label: 'Asignación', property: 'fecha', width: 60 }
                    ],
                    datas: [
                        {
                            placa: data.requiresPlacaIkusi ? data.assetId : 'N/A',
                            host: data.assetHostname || 'N/A',
                            cat: data.assetType || 'N/A',
                            marca: data.assetBrand || 'Generico',
                            serial: data.assetSerial || 'N/A',
                            modelo: data.assetModel || 'Generico',
                            fecha: data.timestamp.toLocaleDateString()
                        }
                    ]
                };

                await doc.table(tableAsignados, {
                    width: 480, x: 70,
                    prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8).fillColor('black'),
                    prepareRow: () => doc.font('Helvetica').fontSize(8).fillColor('black')
                });

                const isLaptopOrComputer = data.assetType && (data.assetType.toLowerCase().includes('laptop') || data.assetType.toLowerCase().includes('computador') || data.assetType.toLowerCase().includes('desktop'));
                
                if (data.requiresPlacaIkusi && isLaptopOrComputer) {
                    doc.moveDown(1);
                    const tableEspecificaciones = {
                        title: 'Especificaciones actuales',
                        headers: [
                            { label: 'Hostname', property: 'host', width: 120 },
                            { label: 'Versión OS', property: 'os', width: 120 },
                            { label: 'Procesador', property: 'proc', width: 120 },
                            { label: 'Memoria Ram', property: 'ram', width: 120 }
                        ],
                        datas: [
                            {
                                host: data.assetHostname || 'N/A',
                                os: data.assetVersionOs || 'N/A',
                                proc: data.assetProcessor || 'N/A',
                                ram: data.assetRam || 'N/A'
                            }
                        ]
                    };

                    await doc.table(tableEspecificaciones, {
                        width: 480, x: 70,
                        prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8).fillColor('black'),
                        prepareRow: () => doc.font('Helvetica').fontSize(8).fillColor('black')
                    });
                }

                doc.addPage();
                drawHeader();
                
                doc.fontSize(10).fillColor('#000000').text(data.timestamp.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }), { align: 'right' });
                doc.moveDown(2);

                doc.fontSize(11).font('Helvetica');
                const legalTextAssignment = \`Mediante la presente hago constar que recibí del área de Tecnología de información el equipo de cómputo en la siguiente página. Me han asignado para facilitar el desempeño de mis funciones, comprometiéndome a destinarlo solo para fines de trabajo y cuidados para su buen funcionamiento y conservación. Cabe señalar que, de existir algún daño físico del equipo imputable a negligencia, acepto la responsabilidad en la reparación de estos.

De la misma forma que estoy enterado del compromiso de no instalar software adicional al que tiene el equipo sin previa NOTIFICACION Y AUTORIZACION DEL DEPARTAMENTO DE TI. Haciéndome responsable de las sanciones que pudiera dar lugar por dicha instalación.

Los gastos derivados de la reparación y/o remplazo de los equipos de cómputo por daños sufridos como consecuencias de negligencia o descuido por mi parte será de mi entera responsabilidad y son susceptibles de serme repercutidos.

En caso de robo del equipo, es obligatoria del empleado entregar al departamento de TI copia del acta levantada para poder proceder al trámite de seguro.

Cabe señalar que al dar terminada mi relación laboral dentro de IKUSI Redes Colombia, S.A.S. de C. V. me obligo a entregar el equipo en buenas condiciones, (incluyendo toda la información generada por mis actividades) al departamento de TI para que sea dada de baja esta RESPONSIVA.

La empresa se reserva el derecho de solicitar al empleado en cualquier momento el equipo para su auditoria y/o revisión.\`;
                
                const legalTextReturn = \`Mediante la presente, el colaborador hace entrega formal al área de Tecnología de la Información del equipo de cómputo listado en este documento, el cual le fue asignado previamente para el desempeño de sus funciones.

Se deja constancia de que el equipo ha sido revisado por el departamento de TI, validando su estado físico y de funcionamiento actual. Al firmar este documento de Paz y Salvo, el colaborador queda exento de cualquier responsabilidad futura relacionada con el cuidado, conservación o daños del hardware aquí mencionado.

Asimismo, el colaborador certifica que ha entregado los accesorios asociados (cargador, maletín, etc.) y que no retiene información confidencial de IKUSI Redes Colombia, S.A.S. de C. V. en medios de almacenamiento personales derivada del uso de este equipo.

Este documento cancela la responsiva firmada en el momento de la asignación original, dando de baja la responsabilidad del empleado sobre los activos relacionados.\`;

                let customText = null;
                try {
                    const settingRepo = AppDataSource.getRepository(SettingEntity);
                    const key = data.actType === 'RETURN' ? 'ACTA_DEVOLUCION_TEXT' : 'ACTA_ASIGNACION_TEXT';
                    const setting = await settingRepo.findOneBy({ key });
                    if (setting && setting.value) customText = setting.value;
                } catch(e) { console.error('Error fetching custom text:', e); }

                const legalText = customText || (data.actType === 'RETURN' ? legalTextReturn : legalTextAssignment);
                doc.text(legalText, { align: 'justify', lineGap: 5 });

                const range = doc.bufferedPageRange();
                const cryptoType = data.actType === 'RETURN' ? 'Acta-Dev-Ikusi' : 'Acta-Asig-Ikusi';
                const userNameNormalized = (data.collaboratorName || 'Usuario Asignado').replace(/ /g, '+');
                const cryptoId = \`\${cryptoType}-\${userNameNormalized}\`;
                const signedBy = data.isForcedSignature ? 'Firmada por IT (firma forzada)' : (data.signatureEmail || data.collaboratorEmail || 'N/A');

                for (let i = range.start; i < range.start + range.count; i++) {
                    doc.switchToPage(i);
                    const bottom = doc.page.margins.bottom;
                    doc.page.margins.bottom = 0;
                    
                    const footerY = doc.page.height - 130;
                    doc.fontSize(10).font('Helvetica-Bold').fillColor('#00a650');
                    doc.text('DOCUMENTO FIRMADO DIGITALMENTE', 70, footerY, { lineBreak: false });
                    
                    doc.fontSize(9).fillColor('#000000').font('Helvetica');
                    doc.moveDown(1);
                    doc.text(\`ID Asignación criptográfica: \${cryptoId}\`, 70, doc.y);
                    doc.text(\`Firma IP registrada: \${data.ipAddress || 'N/A'}\`, 70, doc.y);
                    doc.text(\`Sede: \${data.sede || 'N/A'}\`, 70, doc.y);
                    doc.text(\`Firmada por: \${signedBy}\`, 70, doc.y);

                    doc.save();
                    doc.rotate(-90, { origin: [30, doc.page.height - 50] });
                    doc.fontSize(8)
                       .fillColor('#999999')
                       .text('Calle 116 N° 7 - 15 Torre Cusezar Oficina 404, Bogotá Colombia Tel. (57) 6580300', 30, doc.page.height - 50, { width: 600, align: 'left', lineBreak: false });
                    doc.restore();

                    doc.page.margins.bottom = bottom;
                }

                doc.flushPages();
                doc.end();

                stream.on('finish', () => {
                    resolve(\`/pdfs/\${fileName}\`);
                });

                stream.on('error', (err) => {
                    reject(err);
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    public async generateMaintenanceAct`;

content = content.replace(regex, newCode);

fs.writeFileSync(file, content, 'utf8');
console.log('Patched PdfKitService.ts redesign');
